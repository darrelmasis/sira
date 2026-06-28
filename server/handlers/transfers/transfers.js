import mongoose from "mongoose";
import Transfer from "../../models/Transfer.js";
import Placement from "../../models/Placement.js";
import Lot from "../../models/Lot.js";
import FieldRecord from "../../models/FieldRecord.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { success, failure } from "../../utils/response.js";
import { getFarmScopeFilter, validateFarmAccess } from "../../utils/farmAccess.js";
import { dateOnlyToLocalDate } from "../../utils/dates.js";

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

// Helper to compute net live birds for a specific active placement
async function getPlacementLiveCount(placement, atDate = new Date()) {
  const lotId = placement.loteId._id || placement.loteId;
  const shedId = placement.galponId._id || placement.galponId;
  const sinceDate = placement.fechaAlojamiento;

  const lotObjId = toObjectId(lotId);
  const shedObjId = toObjectId(shedId);

  // Diagnostic: log the query details
  console.log("[getPlacementLiveCount] placement._id:", String(placement._id));
  console.log("[getPlacementLiveCount] loteId:", lotObjId, "galponId:", shedObjId);
  console.log("[getPlacementLiveCount] sinceDate:", sinceDate, "atDate:", atDate);
  console.log("[getPlacementLiveCount] placement.hembras:", placement.hembras, "placement.machos:", placement.machos);

  // 1. Total mortality in this shed for this lot since placement
  const mortalities = await FieldRecord.find({
    module: "mortalidad",
    loteId: lotObjId,
    galponId: shedObjId,
    fecha: { $gte: sinceDate, $lte: atDate }
  }).lean();

  console.log("[getPlacementLiveCount] mortalities found:", mortalities.length);
  if (mortalities.length > 0) {
    mortalities.forEach((m, i) => {
      console.log(`[getPlacementLiveCount]   mortality[${i}]:`, {
        _id: m._id,
        fecha: m.fecha,
        loteId: m.loteId,
        galponId: m.galponId,
        data: m.data,
      });
    });
  } else {
    // Also check if there are ANY mortality records for this lot+galpon (ignoring date)
    const anyMortalities = await FieldRecord.find({
      module: "mortalidad",
      loteId: lotObjId,
      galponId: shedObjId,
    }).lean();
    console.log("[getPlacementLiveCount] mortalities (no date filter):", anyMortalities.length);
    if (anyMortalities.length > 0) {
      anyMortalities.forEach((m, i) => {
        console.log(`[getPlacementLiveCount]   any[${i}]:`, {
          _id: m._id,
          fecha: m.fecha,
          loteId: m.loteId,
          galponId: m.galponId,
          data: m.data,
        });
      });
    } else {
      // Check total mortality records in DB for this module
      const totalMortalidad = await FieldRecord.countDocuments({ module: "mortalidad" });
      console.log("[getPlacementLiveCount] total mortalidad records in DB:", totalMortalidad);
      if (totalMortalidad > 0) {
        const allMort = await FieldRecord.find({ module: "mortalidad" }).lean();
        allMort.forEach((m, i) => {
          console.log(`[getPlacementLiveCount]   all_mortality[${i}]:`, {
            _id: m._id,
            clientId: m.clientId,
            fecha: m.fecha,
            loteId: m.loteId,
            galponId: m.galponId,
            granjaId: m.granjaId,
            data: m.data,
          });
        });
      }
    }
  }

  let mortHembras = 0;
  let mortMachos = 0;
  for (const m of mortalities) {
    const qty = Number(m.data?.mortalidad || m.mortalidad || 0);
    if (m.data?.sexo === "hembra" || m.sexo === "hembra") {
      mortHembras += qty;
    } else {
      mortMachos += qty;
    }
  }

  const liveHembras = Math.max(0, placement.hembras - mortHembras);
  const liveMachos = Math.max(0, placement.machos - mortMachos);

  return {
    hembras: liveHembras,
    machos: liveMachos,
    detalles: {
      inicialHembras: placement.hembras,
      inicialMachos: placement.machos,
      mortalidadHembras: mortHembras,
      mortalidadMachos: mortMachos,
    }
  };
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
        // Find lots that belong to allowed farms
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
        notas
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

      const parsedFecha = dateOnlyToLocalDate(fecha) || new Date(fecha);
      if (Number.isNaN(parsedFecha.getTime())) {
        return failure(res, "Fecha inválida", 400);
      }

      // Check Lot exists and get farm
      const lot = await Lot.findById(loteId);
      if (!lot) {
        return failure(res, "Lote no encontrado", 404);
      }

      // Validate user has access to this lot's farm
      const farmError = validateFarmAccess(user, lot.granjaId);
      if (farmError) return failure(res, farmError, 403);

      // Verify origin placement is active
      const placement = await Placement.findOne({
        loteId: toObjectId(loteId),
        galponId: toObjectId(origenGalponId),
        estado: { $ne: "cerrado" }
      });

      if (!placement) {
        return failure(res, "No hay un alojamiento activo para este lote en el galpón de origen", 404);
      }

      // Compute current live count at transfer date
      const live = await getPlacementLiveCount(placement, parsedFecha);

      const qtyHembras = Number(hembrasTrasladadas);
      const qtyMachos = Number(machosTrasladadas);
      const mortH = Number(mortalidadHembras);
      const mortM = Number(mortalidadMachos);

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

      // Save Transfer
      const transfer = new Transfer({
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
        createdBy: user._id
      });
      await transfer.save();

      // Update the origin placement
      placement.hembras -= qtyHembras;
      placement.machos -= qtyMachos;
      if (placement.hembras <= 0 && placement.machos <= 0) {
        placement.estado = "cerrado";
      }
      await placement.save();

      // Find or create destination placement
      const netHembras = qtyHembras - mortH;
      const netMachos = qtyMachos - mortM;

      let destPlacement = await Placement.findOne({
        loteId: toObjectId(loteId),
        galponId: toObjectId(destinoGalponId),
        estado: { $ne: "cerrado" }
      });

      if (destPlacement) {
        destPlacement.hembras += netHembras;
        destPlacement.machos += netMachos;
        if (tipo === "capitalizacion") {
          destPlacement.tipo = "postura";
        }
        await destPlacement.save();
      } else {
        const destPlacementType = tipo === "capitalizacion" ? "postura" : placement.tipo;
        destPlacement = new Placement({
          loteId: toObjectId(loteId),
          galponId: toObjectId(destinoGalponId),
          hembras: netHembras,
          machos: netMachos,
          fechaAlojamiento: parsedFecha,
          tipo: destPlacementType,
          estado: "activo"
        });
        await destPlacement.save();
      }

      // If it is capitalization, mark the lot stage as posture
      if (tipo === "capitalizacion") {
        lot.etapa = "postura";
        await lot.save();
      }

      return success(res, transfer);
    }

    return failure(res, "Método no permitido", 405);
  } catch (error) {
    return failure(res, error.message || "Error en el servidor", 500);
  }
}

export { getPlacementLiveCount };
