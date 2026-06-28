import mongoose from "mongoose";
import Lot from "../../models/Lot.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { success, failure } from "../../utils/response.js";
import { validateFarmAccess } from "../../utils/farmAccess.js";
import { getLotAllocation } from "../../utils/inventory.js";

export default async function lotDistributionHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    if (req.method !== "GET") {
      return failure(res, "Método no permitido", 405);
    }

    if (!hasPermission(user.role, "catalogs.manage") && !hasPermission(user.role, "inventory.view")) {
      return failure(res, "Permiso denegado", 403);
    }

    const { loteId, excludePlacementId } = req.query;
    if (!loteId || !mongoose.Types.ObjectId.isValid(loteId)) {
      return failure(res, "Lote ID inválido", 400);
    }

    const lot = await Lot.findById(loteId).lean();
    if (!lot) {
      return failure(res, "Lote no encontrado", 404);
    }

    const farmError = validateFarmAccess(user, lot.granjaId);
    if (farmError) return failure(res, farmError, 403);

    const summary = await getLotAllocation(loteId, excludePlacementId || null);
    return success(res, summary);
  } catch (error) {
    return failure(res, error.message || "Error en el servidor", 500);
  }
}
