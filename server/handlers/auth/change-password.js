import argon2 from "argon2";
import User from "../../models/User.js";
import { requireAuth } from "../../middleware/auth.js";
import { failure, success } from "../../utils/response.js";

export default async function changePasswordHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return failure(res, "La contraseña actual y la nueva son obligatorias", 400);
    }

    if (String(newPassword).length < 8) {
      return failure(res, "La nueva contraseña debe tener al menos 8 caracteres", 400);
    }

    if (currentPassword === newPassword) {
      return failure(res, "La nueva contraseña debe ser diferente a la actual", 400);
    }

    const account = await User.findById(user._id);
    if (!account) {
      return failure(res, "Usuario no encontrado", 404);
    }

    const valid = await argon2.verify(account.passwordHash, currentPassword);
    if (!valid) {
      return failure(res, "Contraseña actual incorrecta", 401);
    }

    account.passwordHash = await argon2.hash(newPassword);
    await account.save();

    return success(res, { changed: true });
  } catch (error) {
    console.error("[auth/change-password]", error);
    return failure(res, "No se pudo cambiar la contraseña", 500);
  }
}
