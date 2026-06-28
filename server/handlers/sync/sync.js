import mongoose from "mongoose";
import FieldRecord from "../../models/FieldRecord.js";
import Placement from "../../models/Placement.js";
import { requireAuth } from "../../middleware/auth.js";
import { success } from "../../utils/response.js";
import { getAgeWeeks, getEtapa, dateOnlyToLocalDate } from "../../utils/dates.js";
import { validateMortalidadRecord } from "../../validators/mortalidad.js";

function toObjectId(value) {
  if (!value) return value;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

async function enrichRecord(record) {
  const placement = await Placement.findOne({
    loteId: toObjectId(record.loteId),
    galponId: toObjectId(record.galponId),
    fechaAlojamiento: { $lte: dateOnlyToLocalDate(record.fecha) || new Date(record.fecha) },
  })
    .sort({ fechaAlojamiento: -1 })
    .lean();

  const edad = placement ? getAgeWeeks(placement.fechaAlojamiento, record.fecha) : Number(record.edad || 0);
  const etapa = record.etapa || getEtapa(edad);

  return {
    clientId: record.clientId,
    module: record.module,
    fecha: dateOnlyToLocalDate(record.fecha) || new Date(record.fecha),
    granjaId: toObjectId(record.granjaId),
    galponId: toObjectId(record.galponId),
    loteId: toObjectId(record.loteId),
    etapa,
    edad,
    data: {
      mortalidad: Number(record.data.mortalidad),
      sexo: record.data.sexo,
      causaMuerte: record.data.causaMuerte || "",
    },
    meta: record.meta || {},
  };
}

export default async function syncHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  const records = Array.isArray(req.body?.records) ? req.body.records : [];

  if (records.length === 0) {
    return success(res, { synced: [], failed: [] });
  }

  const synced = [];
  const failed = [];

  for (const record of records) {
    const validationError = validateMortalidadRecord(record, user);

    if (validationError) {
      failed.push({ clientId: record?.clientId, message: validationError });
      continue;
    }

    try {
      const nextRecord = await enrichRecord(record);
      const existing = await FieldRecord.findOne({ clientId: nextRecord.clientId });
      const clientUpdatedAt = new Date(record.updatedAt || record.audit?.updatedAt || record.createdAt || 0);

      if (existing && existing.updatedAt > clientUpdatedAt) {
        synced.push({ clientId: nextRecord.clientId, serverId: existing._id, status: "kept-server" });
        continue;
      }

      const audit = record.audit || {};
      const actorName = audit.updatedBy?.nombre || audit.updatedBy?.username || user.nombre || user.username;

      const saved = await FieldRecord.findOneAndUpdate(
        { clientId: nextRecord.clientId },
        {
          $set: {
            ...nextRecord,
            updatedBy: user._id,
            createdBy: existing?.createdBy || user._id,
            audit: {
              createdByName: audit.createdBy?.nombre || audit.createdBy?.username || actorName,
              updatedByName: actorName,
              updatedByAvatarId: audit.updatedBy?.avatarId || user.avatarId || null,
              clientCreatedAt: new Date(audit.createdAt || record.createdAt || Date.now()),
              clientUpdatedAt: clientUpdatedAt,
            },
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      synced.push({ clientId: nextRecord.clientId, serverId: saved._id, status: "synced" });
    } catch (error) {
      console.error("[sync]", record?.clientId, error);
      failed.push({ clientId: record.clientId, message: error.message || "No se pudo sincronizar" });
    }
  }

  return success(res, { synced, failed });
}
