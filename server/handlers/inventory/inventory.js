import mongoose from "mongoose";
import Placement from "../../models/Placement.js";
import Shed from "../../models/Shed.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { success, failure } from "../../utils/response.js";
import { getFarmScopeFilter, validateFarmAccess } from "../../utils/farmAccess.js";
import { getAgeWeeks, dateOnlyToLocalDate } from "../../utils/dates.js";
import { getPlacementLiveCount, getLotAgeStartDates } from "../../utils/inventory.js";

export default async function inventoryHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    if (req.method !== "GET") {
      return failure(res, "Método no permitido", 405);
    }

    if (!hasPermission(user.role, "inventory.view")) {
      return failure(res, "Permiso denegado", 403);
    }

    const { granjaId, atDate } = req.query;
    const scope = getFarmScopeFilter(user);
    const referenceDate = atDate ? dateOnlyToLocalDate(atDate) || new Date(atDate) : new Date();
    if (Number.isNaN(referenceDate.getTime())) {
      return failure(res, "Fecha de referencia inválida", 400);
    }

    const activePlacementsQuery = { estado: { $ne: "cerrado" } };

    if (granjaId) {
      if (!mongoose.Types.ObjectId.isValid(granjaId)) {
        return failure(res, "Granja ID inválido", 400);
      }
      const parsedGranjaId = new mongoose.Types.ObjectId(String(granjaId));
      const farmError = validateFarmAccess(user, parsedGranjaId);
      if (farmError) return failure(res, farmError, 403);

      const farmSheds = await Shed.find({ granjaId: parsedGranjaId }).select("_id").lean();
      const shedIds = farmSheds.map((s) => s._id);
      activePlacementsQuery.galponId = { $in: shedIds };
    } else if (scope !== null) {
      if (scope._empty) {
        return success(res, []);
      }
      const farmSheds = await Shed.find({ granjaId: scope }).select("_id").lean();
      const shedIds = farmSheds.map((s) => s._id);
      activePlacementsQuery.galponId = { $in: shedIds };
    }

    const activePlacements = await Placement.find(activePlacementsQuery)
      .populate({
        path: "loteId",
        select: "codigo raza sexo etapa granjaId",
        populate: { path: "granjaId", select: "nombre" },
      })
      .populate("galponId", "nombre granjaId")
      .lean();

    const lotIds = [...new Set(activePlacements.map((p) => String(p.loteId?._id || p.loteId)))];
    const lotStartDates = await getLotAgeStartDates(lotIds);

    const results = [];

    for (const p of activePlacements) {
      if (!p.loteId || !p.galponId) continue;

      const lotSexo = p.loteId.sexo;
      const live = await getPlacementLiveCount(p, referenceDate, lotSexo);

      if (live.hembras <= 0 && live.machos <= 0) {
        continue;
      }

      const lotStartDate =
        lotStartDates.get(String(p.loteId._id)) || p.fechaAlojamiento;
      const edadSemanas = getAgeWeeks(lotStartDate, referenceDate);

      results.push({
        alojamientoId: String(p._id),
        fechaAlojamiento: p.fechaAlojamiento,
        lote: {
          id: String(p.loteId._id),
          codigo: p.loteId.codigo,
          raza: p.loteId.raza,
          sexo: p.loteId.sexo,
          etapa: p.loteId.etapa,
        },
        galpon: {
          id: String(p.galponId._id),
          nombre: p.galponId.nombre,
        },
        granja: {
          id: String(p.loteId.granjaId?._id),
          nombre: p.loteId.granjaId?.nombre || "—",
        },
        tipo: p.tipo || "levante",
        edadSemanas,
        ...live,
      });
    }

    return success(res, results);
  } catch (error) {
    return failure(res, error.message || "Error en el servidor", 500);
  }
}
