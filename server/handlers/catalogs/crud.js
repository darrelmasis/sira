import Farm from "../../models/Farm.js";
import Shed from "../../models/Shed.js";
import Lot from "../../models/Lot.js";
import Placement from "../../models/Placement.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { buildCatalogFilter, validateFarmAccess } from "../../utils/farmAccess.js";
import { validateCatalogPayload } from "../../validators/catalogs.js";
import { success, failure } from "../../utils/response.js";

const RESOURCES = {
  granjas: Farm,
  galpones: Shed,
  lotes: Lot,
  alojamientos: Placement,
};

function serializeCatalogRow(row) {
  if (!row) return row;
  return {
    ...row,
    id: String(row._id || row.id),
    _id: String(row._id || row.id),
    granjaId: row.granjaId ? String(row.granjaId) : row.granjaId,
    loteId: row.loteId ? String(row.loteId) : row.loteId,
    galponId: row.galponId ? String(row.galponId) : row.galponId,
  };
}

export function createCatalogCrudHandler(resource) {
  return async function catalogCrudHandler(req, res) {
    const user = await requireAuth(req, res);
    if (!user) return null;

    const Model = RESOURCES[resource];

    try {
      if (req.method === "GET") {
        const filter = await buildCatalogFilter(resource, user, Lot);

        if (req.query?.active === "true") {
          filter.active = true;
        }
        if (req.query?.granjaId) {
          const farmError = validateFarmAccess(user, req.query.granjaId);
          if (farmError) return failure(res, farmError, 403);
          filter.granjaId = req.query.granjaId;
        }
        if (req.query?.loteId) {
          filter.loteId = req.query.loteId;
        }

        const rows = await Model.find(filter)
          .sort(resource === "alojamientos" ? { fechaAlojamiento: -1 } : { nombre: 1, codigo: 1 })
          .lean();
        return success(res, rows.map(serializeCatalogRow));
      }

      if (["POST", "PUT", "DELETE"].includes(req.method)) {
        if (!hasPermission(user.role, "catalogs.manage")) {
          return failure(res, "Permiso denegado", 403);
        }
      }

      if (req.method === "POST") {
        const farmError = validateFarmAccess(user, req.body?.granjaId);
        if (farmError) return failure(res, farmError, 403);

        const validationError = await validateCatalogPayload(resource, req.body);
        if (validationError) return failure(res, validationError, 400);

        const doc = await Model.create(req.body);
        return success(res, serializeCatalogRow(doc.toObject()), 201);
      }

      if (req.method === "PUT") {
        const { id, _id, ...updateData } = req.body;
        if (!id && !_id) {
          return failure(res, "ID es requerido para actualizar", 400);
        }

        const recordId = id || _id;
        const existing = await Model.findById(recordId).lean();
        if (!existing) {
          return failure(res, "Registro no encontrado", 404);
        }

        const currentFarmId = existing.granjaId || updateData.granjaId;
        const farmError = validateFarmAccess(user, updateData.granjaId || currentFarmId);
        if (farmError) return failure(res, farmError, 403);

        const validationError = await validateCatalogPayload(
          resource,
          { ...existing, ...updateData },
          recordId,
        );
        if (validationError) return failure(res, validationError, 400);

        const doc = await Model.findByIdAndUpdate(recordId, updateData, { new: true });
        return success(res, serializeCatalogRow(doc.toObject()));
      }

      if (req.method === "DELETE") {
        const id = req.query.id || req.body?.id || req.body?._id;
        if (!id) {
          return failure(res, "ID es requerido para eliminar", 400);
        }

        const existing = await Model.findById(id).lean();
        if (!existing) {
          return failure(res, "Registro no encontrado", 404);
        }

        if (resource === "galpones" || resource === "lotes") {
          const farmError = validateFarmAccess(user, existing.granjaId);
          if (farmError) return failure(res, farmError, 403);
        }

        await Model.findByIdAndDelete(id);
        return success(res, { deleted: true, id });
      }

      return failure(res, "Método no soportado", 405);
    } catch (error) {
      console.error(`[CRUD ${resource}] Error:`, error);
      return failure(res, error.message || "Error interno del servidor", 500);
    }
  };
}
