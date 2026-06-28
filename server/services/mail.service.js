import nodemailer from "nodemailer";
import { getEnv } from "../env.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = getEnv("MAIL_HOST");
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(getEnv("MAIL_PORT", "587")),
    secure: getEnv("MAIL_SECURE", "false") === "true",
    auth: {
      user: getEnv("MAIL_USER", ""),
      pass: getEnv("MAIL_PASS", ""),
    },
  });

  return transporter;
}

export function isMailConfigured() {
  return !!getEnv("MAIL_HOST");
}

export async function sendPasswordResetEmail({ to, token }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[mail] SMTP no configurado. Token generado:", token);
    return;
  }

  const appUrl = getEnv("APP_URL", "http://localhost:5173");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await transport.sendMail({
    from: getEnv("MAIL_FROM", "noreply@sira.app"),
    to,
    subject: "Recuperación de contraseña - SIRA",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña de SIRA.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a2e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Este enlace expira en 60 minutos.</p>
        <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignora este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">SIRA — Sistema Integral para Registro Avícola</p>
      </div>
    `,
  });
}
