import User from "../../models/User.js";
import { requireAuth } from "../../middleware/auth.js";
import { isValidAvatarId } from "../../constants/avatars.js";
import { serializeUser } from "../../utils/serializeUser.js";
import { failure, success } from "../../utils/response.js";

export default async function updateProfileHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (req.method !== "PUT") {
    return failure(res, "Método no soportado", 405);
  }

  try {
    const { avatarId } = req.body || {};

    if (avatarId != null && avatarId !== "" && !isValidAvatarId(avatarId)) {
      return failure(res, "Avatar inválido", 400);
    }

    const nextAvatarId = avatarId || null;

    const account = await User.findByIdAndUpdate(
      user._id,
      { $set: { avatarId: nextAvatarId } },
      { new: true },
    ).select("-passwordHash");

    if (!account) {
      return failure(res, "Usuario no encontrado", 404);
    }

    return success(res, serializeUser(account));
  } catch (error) {
    console.error("[auth/profile]", error);
    return failure(res, "No se pudo actualizar el perfil", 500);
  }
}
