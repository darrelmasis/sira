import FieldRecord from "../../models/FieldRecord.js";
import Placement from "../../models/Placement.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { getFarmScopeFilter, validateFarmAccess } from "../../utils/farmAccess.js";
import { getAgeWeeks, getEtapa, dateOnlyToLocalDate } from "../../utils/dates.js";
import { success, failure } from "../../utils/response.js";
import mongoose from "mongoose";

function toObjectId(value) {
  if (!value) return value;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(String(value));
  return value;
}

function serializeRecord(row) {
  if (!row) return row;
  const obj = typeof row.toObject === "function" ? row.toObject() : row;
  return {
    ...obj,
    _id: String(obj._id),
    id: String(obj._id),
    clientId: obj.clientId || String(obj._id),
    granjaId: String(obj.granjaId),
    galponId: String(obj.galponId),
    loteId: String(obj.loteId),
    createdBy: obj.createdBy ? String(obj.createdBy) : undefined,
    updatedBy: obj.updatedBy ? String(obj.updatedBy) : undefined,
  };
}

async function enrichRecord(data) {
  const placement = await Placement.findOne({
    loteId: toObjectId(data.loteId),
    galponId: toObjectId(data.galponId),
    fechaAlojamiento: { $lte: dateOnlyToLocalDate(data.fecha) || new Date(data.fecha) },
  })
    .sort({ fechaAlojamiento: -1 })
    .lean();

  const edad = placement ? getAgeWeeks(placement.fechaAlojamiento, data.fecha) : Number(data.edad || 0);
  const etapa = data.etapa || getEtapa(edad);

  const base = {
    module: data.module,
    fecha: dateOnlyToLocalDate(data.fecha) || new Date(data.fecha),
    granjaId: toObjectId(data.granjaId),
    galponId: toObjectId(data.galponId),
    loteId: toObjectId(data.loteId),
    etapa,
    edad,
    meta: data.meta || {},
  };

  if (data.module === "produccion") {
    return {
      ...base,
      data: {
        registros: (data.data?.registros || []).map((r) => ({
          categoria: r.categoria,
          cantidad: Number(r.cantidad),
        })),
        raza: data.data?.raza || "",
      },
    };
  }

  return {
    ...base,
    data: {
      mortalidad: Number(data.data?.mortalidad ?? data.mortalidad ?? 0),
      sexo: data.data?.sexo || data.sexo || "macho",
      causaMuerte: data.data?.causaMuerte || data.causaMuerte || "",
    },
  };
}

export default async function recordsHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    if (req.method === "GET") {
      if (!hasPermission(user.role, "records.view")) {
        return failure(res, "Permiso denegado", 403);
      }

      const scope = getFarmScopeFilter(user);
      const filter = {};
      if (scope !== null) {
        filter.granjaId = scope;
      }

      const rows = await FieldRecord.find(filter)
        .sort({ fecha: -1, createdAt: -1 })
        .lean();

      return success(res, rows.map(serializeRecord));
    }

    if (req.method === "PUT") {
      if (!hasPermission(user.role, "records.edit")) {
        return failure(res, "Permiso denegado", 403);
      }

      const { id, clientId } = req.body || {};
      const recordId = id || clientId;
      if (!recordId) {
        return failure(res, "ID del registro es requerido", 400);
      }

      const idFilter = mongoose.Types.ObjectId.isValid(recordId)
        ? { _id: recordId }
        : { clientId: recordId };
      const existing = await FieldRecord.findOne(idFilter);

      if (!existing) {
        return failure(res, "Registro no encontrado", 404);
      }

      const farmError = validateFarmAccess(
        user,
        req.body.granjaId || existing.granjaId,
      );
      if (farmError) return failure(res, farmError, 403);

      const enriched = await enrichRecord({
        ...existing.toObject(),
        ...req.body,
      });

      const updated = await FieldRecord.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: {
            ...enriched,
            updatedBy: user._id,
            "audit.updatedByName": user.nombre || user.username,
            "audit.updatedByAvatarId": user.avatarId || null,
            "audit.clientUpdatedAt": new Date(),
          },
          $setOnInsert: {
            createdBy: existing.createdBy || user._id,
            "audit.createdByName": existing.audit?.createdByName || user.nombre || user.username,
            "audit.clientCreatedAt": existing.audit?.clientCreatedAt || new Date(),
          },
        },
        { new: true },
      );

      return success(res, serializeRecord(updated));
    }

    if (req.method === "DELETE") {
      if (!hasPermission(user.role, "records.delete")) {
        return failure(res, "Permiso denegado", 403);
      }

      const id = req.query.id || req.body?.id || req.body?.clientId;
      if (!id) {
        return failure(res, "ID del registro es requerido", 400);
      }

      const idFilter = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { clientId: id };
      const existing = await FieldRecord.findOne(idFilter);

      if (!existing) {
        return failure(res, "Registro no encontrado", 404);
      }

      const farmError = validateFarmAccess(user, existing.granjaId);
      if (farmError) return failure(res, farmError, 403);

      await FieldRecord.findByIdAndDelete(existing._id);
      return success(res, { deleted: true, id: String(existing._id) });
    }

    return failure(res, "Método no soportado", 405);
  } catch (error) {
    console.error("[records]", error);
    return failure(res, error.message || "Error interno del servidor", 500);
  }
}
