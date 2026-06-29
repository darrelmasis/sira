import mongoose from "mongoose";
import Complex from "../../models/Complex.js";
import Shed from "../../models/Shed.js";
import Placement from "../../models/Placement.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission } from "../../utils/permissions.js";
import { validateFarmAccess, getFarmScopeFilter } from "../../utils/farmAccess.js";
import { validateComplexPayload } from "../../validators/catalogs.js";
import { success, failure } from "../../utils/response.js";
import { buildShedName, serializeComplexRow } from "../../utils/complex.js";

async function loadComplexes(filter) {
  const complexes = await Complex.find(filter).sort({ nombre: 1 }).lean();
  if (!complexes.length) return [];

  const complexIds = complexes.map((c) => c._id);
  const sheds = await Shed.find({ complejoId: { $in: complexIds } }).lean();
  const shedsByComplex = new Map();

  for (const shed of sheds) {
    const key = String(shed.complejoId);
    if (!shedsByComplex.has(key)) shedsByComplex.set(key, []);
    shedsByComplex.get(key).push(shed);
  }

  return complexes.map((complex) =>
    serializeComplexRow(complex, shedsByComplex.get(String(complex._id)) || []),
  );
}

async function syncShedNames(complex, session = null) {
  const query = Shed.find({ complejoId: complex._id });
  if (session) query.session(session);
  const sheds = await query.lean();

  for (const shed of sheds) {
    if (!shed.numero) continue;
    await Shed.updateOne(
      { _id: shed._id },
      { $set: { nombre: buildShedName(complex.nombre, shed.numero) } },
      session ? { session } : {},
    );
  }
}

export default async function complexesHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    if (req.method === "GET") {
      const scope = getFarmScopeFilter(user);
      const filter = {};
      if (scope !== null) {
        if (scope._empty) return success(res, []);
        filter.granjaId = scope;
      }
      if (req.query?.granjaId) {
        const farmError = validateFarmAccess(user, req.query.granjaId);
        if (farmError) return failure(res, farmError, 403);
        filter.granjaId = req.query.granjaId;
      }

      return success(res, await loadComplexes(filter));
    }

    if (!hasPermission(user.role, "catalogs.manage")) {
      return failure(res, "Permiso denegado", 403);
    }

    if (req.method === "POST") {
      const farmError = validateFarmAccess(user, req.body?.granjaId);
      if (farmError) return failure(res, farmError, 403);

      const validationError = await validateComplexPayload(req.body);
      if (validationError) return failure(res, validationError, 400);

      const nombre = req.body.nombre.trim();
      const granjaId = new mongoose.Types.ObjectId(String(req.body.granjaId));
      const active = req.body.active !== false;

      const session = await mongoose.startSession();
      let created;

      try {
        await session.withTransaction(async () => {
          const complex = await Complex.create(
            [{ granjaId, nombre, active }],
            { session },
          ).then((rows) => rows[0]);

          const sheds = await Shed.insertMany(
            [1, 2].map((numero) => ({
              granjaId,
              complejoId: complex._id,
              numero,
              nombre: buildShedName(nombre, numero),
              active,
            })),
            { session },
          );

          created = serializeComplexRow(complex.toObject(), sheds);
        });
      } catch (txError) {
        if (txError.message?.includes("Transaction numbers are only allowed")) {
          const complex = await Complex.create({ granjaId, nombre, active });
          const sheds = await Shed.insertMany(
            [1, 2].map((numero) => ({
              granjaId,
              complejoId: complex._id,
              numero,
              nombre: buildShedName(nombre, numero),
              active,
            })),
          );
          created = serializeComplexRow(complex.toObject(), sheds);
        } else {
          throw txError;
        }
      } finally {
        session.endSession();
      }

      return success(res, created, 201);
    }

    if (req.method === "PUT") {
      const { id, _id, ...updateData } = req.body;
      const recordId = id || _id;
      if (!recordId) return failure(res, "ID es requerido para actualizar", 400);

      const existing = await Complex.findById(recordId);
      if (!existing) return failure(res, "Complejo no encontrado", 404);

      const farmError = validateFarmAccess(user, existing.granjaId);
      if (farmError) return failure(res, farmError, 403);

      const validationError = await validateComplexPayload(
        { ...existing.toObject(), ...updateData },
        recordId,
      );
      if (validationError) return failure(res, validationError, 400);

      existing.nombre = updateData.nombre?.trim() || existing.nombre;
      if (typeof updateData.active === "boolean") {
        existing.active = updateData.active;
      }
      await existing.save();
      await syncShedNames(existing);

      if (typeof updateData.active === "boolean") {
        await Shed.updateMany(
          { complejoId: existing._id },
          { $set: { active: updateData.active } },
        );
      }

      const sheds = await Shed.find({ complejoId: existing._id }).lean();
      return success(res, serializeComplexRow(existing.toObject(), sheds));
    }

    if (req.method === "DELETE") {
      const id = req.query.id || req.body?.id || req.body?._id;
      if (!id) return failure(res, "ID es requerido para eliminar", 400);

      const existing = await Complex.findById(id);
      if (!existing) return failure(res, "Complejo no encontrado", 404);

      const farmError = validateFarmAccess(user, existing.granjaId);
      if (farmError) return failure(res, farmError, 403);

      const shedIds = await Shed.find({ complejoId: existing._id }).distinct("_id");
      if (shedIds.length) {
        const inUse = await Placement.countDocuments({ galponId: { $in: shedIds } });
        if (inUse > 0) {
          return failure(res, "No se puede eliminar un complejo con alojamientos registrados", 400);
        }
      }

      await Shed.deleteMany({ complejoId: existing._id });
      await Complex.findByIdAndDelete(id);
      return success(res, { deleted: true, id: String(id) });
    }

    return failure(res, "Método no soportado", 405);
  } catch (error) {
    if (error?.code === 11000) {
      return failure(res, "Ya existe un complejo con ese nombre en la granja seleccionada", 400);
    }
    return failure(res, error.message || "Error interno del servidor", 500);
  }
}
