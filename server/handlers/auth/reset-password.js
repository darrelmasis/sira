import crypto from "node:crypto";
import argon2 from "argon2";
import User from "../../models/User.js";
import { failure, success } from "../../utils/response.js";

export default async function resetPasswordHandler(req, res) {
  try {
    const { token, password } = req.body || {};

    if (!token) {
      return failure(res, "El token es obligatorio", 400);
    }

    if (!password || String(password).length < 8) {
      return failure(res, "La contraseña debe tener al menos 8 caracteres", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return failure(res, "El enlace de restablecimiento es inválido o ya expiró.", 400);
    }

    user.passwordHash = await argon2.hash(String(password));
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetRequestedAt = null;
    await user.save();

    return success(res, { message: "Tu contraseña fue actualizada correctamente." });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return failure(res, "Error al restablecer la contraseña", 500);
  }
}
