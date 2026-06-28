import mongoose from "mongoose";
import Transfer from "../../models/Transfer.js";
import Placement from "../../models/Placement.js";
import Lot from "../../models/Lot.js";
import Shed from "../../models/Shed.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { success, failure } from "../../utils/response.js";
import { getFarmScopeFilter, validateFarmAccess } from "../../utils/farmAccess.js";
import { dateOnlyToLocalDate, getAgeWeeks } from "../../utils/dates.js";
import {
  CAPITALIZATION_MIN_WEEKS,
  countActiveLevantePlacements,
  findActivePlacement,
  getLotAgeStartDate,
  getPlacementLiveCount,
} from "../../utils/inventory.js";

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

async function maybeUpdateLotEtapa(lot, session = null) {
  const remainingLevante = await countActiveLevantePlacements(lot._id, session);
  if (remainingLevante === 0) {
    lot.etapa = "postura";
    await lot.save({ session });
  }
}

export default async function transfersHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    if (req.method === "GET") {
      if (!hasPermission(user.role, "inventory.view")) {
        return failure(res, "Permiso denegado", 403);
      }

      const scope = getFarmScopeFilter(user);
      const filter = {};
      if (scope !== null) {
        if (scope._empty) {
          return success(res, []);
        }
        const allowedLots = await Lot.find({ granjaId: scope }).select("_id").lean();
        const lotIds = allowedLots.map((l) => l._id);
        filter.loteId = { $in: lotIds };
      }

      const rows = await Transfer.find(filter)
        .populate("loteId", "codigo")
        .populate("origenGalponId", "nombre")
        .populate("destinoGalponId", "nombre")
        .sort({ fecha: -1, createdAt: -1 })
        .lean();

      return success(res, rows);
    }

    if (req.method === "POST") {
      if (!hasPermission(user.role, "transfers.create")) {
        return failure(res, "Permiso denegado", 403);
      }

      const {
        loteId,
        origenGalponId,
        destinoGalponId,
        hembrasTrasladadas,
        machosTrasladadas,
        mortalidadHembras = 0,
        mortalidadMachos = 0,
        fecha,
        tipo,
        notas,
      } = req.body;

      if (!loteId || !origenGalponId || !destinoGalponId || !fecha || !tipo) {
        return failure(res, "Faltan campos obligatorios", 400);
      }

      if (
        !mongoose.Types.ObjectId.isValid(loteId) ||
        !mongoose.Types.ObjectId.isValid(origenGalponId) ||
        !mongoose.Types.ObjectId.isValid(destinoGalponId)
      ) {
        return failure(res, "Identificadores inválidos", 400);
      }

      if (String(origenGalponId) === String(destinoGalponId)) {
        return failure(res, "El galpón de origen y destino deben ser diferentes", 400);
      }

      if (!["traslado", "capitalizacion"].includes(tipo)) {
        return failure(res, "Tipo de movimiento inválido", 400);
      }

      const parsedFecha = dateOnlyToLocalDate(fecha) || new Date(fecha);
      if (Number.isNaN(parsedFecha.getTime())) {
        return failure(res, "Fecha inválida", 400);
      }

      const lot = await Lot.findById(loteId);
      if (!lot) {
        return failure(res, "Lote no encontrado", 404);
      }

      const farmError = validateFarmAccess(user, lot.granjaId);
      if (farmError) return failure(res, farmError, 403);

      const [origenShed, destinoShed] = await Promise.all([
        Shed.findById(origenGalponId).lean(),
        Shed.findById(destinoGalponId).lean(),
      ]);

      if (!origenShed) {
        return failure(res, "Galpón de origen no encontrado", 404);
      }
      if (!destinoShed) {
        return failure(res, "Galpón de destino no encontrado", 404);
      }
      if (String(origenShed.granjaId) !== String(lot.granjaId)) {
        return failure(res, "El galpón de origen debe pertenecer a la misma granja que el lote", 400);
      }
      if (String(destinoShed.granjaId) !== String(lot.granjaId)) {
        return failure(res, "El galpón de destino debe pertenecer a la misma granja que el lote", 400);
      }

      const placement = await findActivePlacement(loteId, origenGalponId);
      if (!placement) {
        return failure(res, "No hay un alojamiento activo para este lote en el galpón de origen", 404);
      }

      if (tipo === "capitalizacion") {
        if (placement.tipo !== "levante") {
          return failure(res, "Solo se puede capitalizar un alojamiento en fase de levante", 400);
        }

        const lotStartDate = await getLotAgeStartDate(lot._id);
        const edadSemanas = lotStartDate
          ? getAgeWeeks(lotStartDate, parsedFecha)
          : getAgeWeeks(placement.fechaAlojamiento, parsedFecha);

        if (edadSemanas < CAPITALIZATION_MIN_WEEKS) {
          return failure(
            res,
            `La capitalización requiere al menos ${CAPITALIZATION_MIN_WEEKS} semanas de edad (actual: ${edadSemanas})`,
            400,
          );
        }
      }

      const live = await getPlacementLiveCount(placement, parsedFecha, lot.sexo);

      const qtyHembras = Number(hembrasTrasladadas);
      const qtyMachos = Number(machosTrasladadas);
      const mortH = Number(mortalidadHembras);
      const mortM = Number(mortalidadMachos);

      if (!Number.isFinite(qtyHembras) || qtyHembras < 0 || !Number.isFinite(qtyMachos) || qtyMachos < 0) {
        return failure(res, "Las cantidades trasladadas deben ser números válidos", 400);
      }
      if (qtyHembras <= 0 && qtyMachos <= 0) {
        return failure(res, "Debes trasladar al menos una hembra o un macho", 400);
      }
      if (qtyHembras > live.hembras) {
        return failure(res, `No puedes trasladar más hembras de las disponibles (${live.hembras} vivas)`, 400);
      }
      if (qtyMachos > live.machos) {
        return failure(res, `No puedes trasladar más machos de los disponibles (${live.machos} vivos)`, 400);
      }
      if (mortH > qtyHembras) {
        return failure(res, "La mortalidad de tránsito de hembras no puede ser mayor que las trasladadas", 400);
      }
      if (mortM > qtyMachos) {
        return failure(res, "La mortalidad de tránsito de machos no puede ser mayor que las trasladadas", 400);
      }

      const netHembras = qtyHembras - mortH;
      const netMachos = qtyMachos - mortM;
      if (netHembras <= 0 && netMachos <= 0) {
        return failure(res, "El traslado debe dejar aves vivas en el destino", 400);
      }

      const session = await mongoose.startSession();
      let transfer;

      try {
        await session.withTransaction(async () => {
          transfer = await Transfer.create(
            [
              {
                loteId: toObjectId(loteId),
                origenGalponId: toObjectId(origenGalponId),
                destinoGalponId: toObjectId(destinoGalponId),
                hembrasTrasladadas: qtyHembras,
                machosTrasladadas: qtyMachos,
                mortalidadHembras: mortH,
                mortalidadMachos: mortM,
                fecha: parsedFecha,
                tipo,
                notas,
                createdBy: user._id,
              },
            ],
            { session },
          ).then((rows) => rows[0]);

          placement.hembras -= qtyHembras;
          placement.machos -= qtyMachos;

          const remainingLive = await getPlacementLiveCount(placement, parsedFecha, lot.sexo);
          if (
            (placement.hembras <= 0 && placement.machos <= 0) ||
            (remainingLive.hembras <= 0 && remainingLive.machos <= 0)
          ) {
            placement.estado = "cerrado";
          }
          await placement.save({ session });

          const destPlacement = await findActivePlacement(loteId, destinoGalponId, session);

          if (destPlacement) {
            destPlacement.hembras += netHembras;
            destPlacement.machos += netMachos;
            if (tipo === "capitalizacion") {
              destPlacement.tipo = "postura";
            }
            await destPlacement.save({ session });
          } else {
            const destPlacementType = tipo === "capitalizacion" ? "postura" : placement.tipo;
            await Placement.create(
              [
                {
                  loteId: toObjectId(loteId),
                  galponId: toObjectId(destinoGalponId),
                  hembras: netHembras,
                  machos: netMachos,
                  fechaAlojamiento: parsedFecha,
                  tipo: destPlacementType,
                  estado: "activo",
                },
              ],
              { session },
            );
          }

          if (tipo === "capitalizacion") {
            await maybeUpdateLotEtapa(lot, session);
          }
        });
      } catch (txError) {
        if (txError.message?.includes("Transaction numbers are only allowed")) {
          transfer = await createTransferWithoutSession({
            user,
            lot,
            placement,
            loteId,
            origenGalponId,
            destinoGalponId,
            qtyHembras,
            qtyMachos,
            mortH,
            mortM,
            netHembras,
            netMachos,
            parsedFecha,
            tipo,
            notas,
          });
        } else {
          throw txError;
        }
      } finally {
        session.endSession();
      }

      return success(res, transfer);
    }

    return failure(res, "Método no permitido", 405);
  } catch (error) {
    return failure(res, error.message || "Error en el servidor", 500);
  }
}

async function createTransferWithoutSession({
  user,
  lot,
  placement,
  loteId,
  origenGalponId,
  destinoGalponId,
  qtyHembras,
  qtyMachos,
  mortH,
  mortM,
  netHembras,
  netMachos,
  parsedFecha,
  tipo,
  notas,
}) {
  const transfer = await Transfer.create({
    loteId: toObjectId(loteId),
    origenGalponId: toObjectId(origenGalponId),
    destinoGalponId: toObjectId(destinoGalponId),
    hembrasTrasladadas: qtyHembras,
    machosTrasladadas: qtyMachos,
    mortalidadHembras: mortH,
    mortalidadMachos: mortM,
    fecha: parsedFecha,
    tipo,
    notas,
    createdBy: user._id,
  });

  placement.hembras -= qtyHembras;
  placement.machos -= qtyMachos;

  const remainingLive = await getPlacementLiveCount(placement, parsedFecha, lot.sexo);
  if (
    (placement.hembras <= 0 && placement.machos <= 0) ||
    (remainingLive.hembras <= 0 && remainingLive.machos <= 0)
  ) {
    placement.estado = "cerrado";
  }
  await placement.save();

  let destPlacement = await findActivePlacement(loteId, destinoGalponId);

  if (destPlacement) {
    destPlacement.hembras += netHembras;
    destPlacement.machos += netMachos;
    if (tipo === "capitalizacion") {
      destPlacement.tipo = "postura";
    }
    await destPlacement.save();
  } else {
    const destPlacementType = tipo === "capitalizacion" ? "postura" : placement.tipo;
    await Placement.create({
      loteId: toObjectId(loteId),
      galponId: toObjectId(destinoGalponId),
      hembras: netHembras,
      machos: netMachos,
      fechaAlojamiento: parsedFecha,
      tipo: destPlacementType,
      estado: "activo",
    });
  }

  if (tipo === "capitalizacion") {
    await maybeUpdateLotEtapa(lot);
  }

  return transfer;
}

export { getPlacementLiveCount } from "../../utils/inventory.js";
