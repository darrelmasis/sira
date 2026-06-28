import crypto from "node:crypto";
import User from "../../models/User.js";
import { failure, success } from "../../utils/response.js";
import { isMailConfigured, sendPasswordResetEmail } from "../../services/mail.service.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

export default async function forgotPasswordHandler(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return failure(res, "El correo electrónico es obligatorio", 400);
    }

    const genericMessage = "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.";

    const user = await User.findOne({ email });
    if (!user) {
      return success(res, { message: genericMessage });
    }

    if (!user.active) {
      return success(res, { message: genericMessage });
    }

    if (user.passwordResetRequestedAt) {
      const elapsed = Date.now() - user.passwordResetRequestedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        return failure(res, "Ya solicitaste un restablecimiento recientemente. Espera un minuto antes de intentar de nuevo.", 429);
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    user.passwordResetRequestedAt = new Date();
    await user.save();

    if (isMailConfigured()) {
      await sendPasswordResetEmail({ to: email, token: rawToken });
    } else {
      console.log("---");
      console.log("Enlace de recuperación (modo dev):");
      console.log(`${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`);
      console.log("---");
    }

    return success(res, { message: genericMessage });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return failure(res, "Error al procesar la solicitud", 500);
  }
}
