import crypto from "node:crypto";
import User from "../../models/User.js";
import { failure, success } from "../../utils/response.js";

export default async function validateResetTokenHandler(req, res) {
  try {
    const token = String(req.query?.token || "").trim();

    if (!token) {
      return failure(res, "Token inválido", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const exists = await User.exists({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!exists) {
      return failure(res, "El enlace de restablecimiento es inválido o ya expiró.", 400);
    }

    return success(res, { message: "Token válido." });
  } catch (error) {
    console.error("[auth/validate-reset-token]", error);
    return failure(res, "Error al validar el token", 500);
  }
}
