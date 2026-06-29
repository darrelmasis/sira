import argon2 from "argon2";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Farm from "../../models/Farm.js";
import FieldRecord from "../../models/FieldRecord.js";
import Transfer from "../../models/Transfer.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasPermission, ensurePermissionsLoaded } from "../../utils/permissions.js";
import { hasGlobalFarmAccess, normalizeFarmIds } from "../../utils/farmAccess.js";
import { isValidAvatarId, isValidAvatarColorIndex } from "../../constants/avatars.js";
import { serializeUser } from "../../utils/serializeUser.js";
import { success, failure } from "../../utils/response.js";

const ROLES = ["admin", "supervisor", "operador", "desarrollador"];

async function validateFarmAssignments(role, granjasAsignadas) {
  if (hasGlobalFarmAccess({ role })) {
    return [];
  }

  const farmIds = normalizeFarmIds(granjasAsignadas);
  if (farmIds.length === 0) {
    return [];
  }

  const count = await Farm.countDocuments({ _id: { $in: farmIds }, active: true });
  if (count !== farmIds.length) {
    throw new Error("Una o más granjas asignadas no son válidas");
  }

  return farmIds;
}

export default async function usersHandler(req, res) {
  await ensurePermissionsLoaded();

  const user = await requireAuth(req, res);
  if (!user) return null;

  if (!hasPermission(user.role, "users.manage")) {
    return failure(res, "Permiso denegado", 403);
  }

  try {
    if (req.method === "GET") {
      const rows = await User.find()
        .select("-passwordHash")
        .sort({ nombre: 1 })
        .lean();

      return success(res, rows.map((row) => serializeUser(row)));
    }

    if (req.method === "POST") {
      const { username, password, nombre, email, role, granjasAsignadas, active = true, avatarId, avatarColorIndex } = req.body || {};

      if (!username?.trim() || !password || !nombre?.trim() || !email?.trim()) {
        return failure(res, "Usuario, contraseña, nombre y email son obligatorios", 400);
      }

      if (!ROLES.includes(role)) {
        return failure(res, "Rol inválido", 400);
      }

      if (avatarId != null && avatarId !== "" && !isValidAvatarId(avatarId)) {
        return failure(res, "Avatar inválido", 400);
      }

      if (!isValidAvatarColorIndex(avatarColorIndex)) {
        return failure(res, "Índice de color inválido", 400);
      }

      const assignedFarms = await validateFarmAssignments(role, granjasAsignadas);
      const passwordHash = await argon2.hash(password);

      const created = await User.create({
        username: username.trim(),
        passwordHash,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        role,
        granjasAsignadas: assignedFarms,
        avatarId: avatarId || null,
        avatarColorIndex: avatarColorIndex ?? null,
        active: Boolean(active),
      });

      return success(res, serializeUser(created), 201);
    }

    if (req.method === "DELETE") {
      const { id } = req.query || {};

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return failure(res, "ID de usuario inválido", 400);
      }

      if (String(user._id) === id) {
        return failure(res, "No puedes eliminarte a ti mismo", 400);
      }

      const [recordCount, transferCount] = await Promise.all([
        FieldRecord.countDocuments({
          $or: [{ createdBy: id }, { updatedBy: id }],
        }),
        Transfer.countDocuments({ createdBy: id }),
      ]);

      if (recordCount > 0 || transferCount > 0) {
        return failure(
          res,
          `El usuario tiene ${recordCount + transferCount} registro(s) asociado(s). Desactívalo en lugar de eliminarlo.`,
          409,
        );
      }

      await User.findByIdAndDelete(id);
      return success(res, { message: "Usuario eliminado" });
    }

    if (req.method === "PUT") {
      const { id, username, password, nombre, email, role, granjasAsignadas, active, avatarId } = req.body || {};

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return failure(res, "ID de usuario inválido", 400);
      }

      const target = await User.findById(id);
      if (!target) {
        return failure(res, "Usuario no encontrado", 404);
      }

      const update = {};

      if (username?.trim()) update.username = username.trim();
      if (nombre?.trim()) update.nombre = nombre.trim();
      if (email?.trim()) update.email = email.trim().toLowerCase();
      if (typeof active === "boolean") update.active = active;

      if (avatarId !== undefined) {
        if (avatarId != null && avatarId !== "" && !isValidAvatarId(avatarId)) {
          return failure(res, "Avatar inválido", 400);
        }
        update.avatarId = avatarId || null;
      }

      if (avatarColorIndex !== undefined) {
        if (!isValidAvatarColorIndex(avatarColorIndex)) {
          return failure(res, "Índice de color inválido", 400);
        }
        update.avatarColorIndex = avatarColorIndex;
      }

      if (role) {
        if (!ROLES.includes(role)) {
          return failure(res, "Rol inválido", 400);
        }
        update.role = role;
      }

      if (password) {
        update.passwordHash = await argon2.hash(password);
      }

      if (granjasAsignadas !== undefined) {
        const nextRole = update.role || target.role;
        update.granjasAsignadas = await validateFarmAssignments(nextRole, granjasAsignadas);
      } else if (update.role && hasGlobalFarmAccess({ role: update.role })) {
        update.granjasAsignadas = [];
      }

      const saved = await User.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).select("-passwordHash");
      return success(res, serializeUser(saved));
    }

    return failure(res, "Método no soportado", 405);
  } catch (error) {
    if (error.code === 11000) {
      return failure(res, "Usuario o email ya existe", 409);
    }
    console.error("[users]", error);
    return failure(res, error.message || "Error interno del servidor", 500);
  }
}
