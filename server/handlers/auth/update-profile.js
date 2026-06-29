import User from "../../models/User.js";
import { requireAuth } from "../../middleware/auth.js";
import { isValidAvatarId, isValidAvatarColorIndex } from "../../constants/avatars.js";
import { serializeUser } from "../../utils/serializeUser.js";
import { failure, success } from "../../utils/response.js";

export default async function updateProfileHandler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (req.method !== "PUT") {
    return failure(res, "Método no soportado", 405);
  }

  try {
    const { avatarId, avatarColorIndex } = req.body || {};
    console.log("[auth/profile] body recibido:", { avatarId, avatarColorIndex });

    if (avatarId != null && avatarId !== "" && !isValidAvatarId(avatarId)) {
      return failure(res, "Avatar inválido", 400);
    }

    if (!isValidAvatarColorIndex(avatarColorIndex)) {
      console.log("[auth/profile] avatarColorIndex inválido:", avatarColorIndex);
      return failure(res, "Índice de color inválido", 400);
    }

    const update = { avatarId: avatarId || null };
    if (avatarColorIndex !== undefined) {
      update.avatarColorIndex = avatarColorIndex;
    }

    console.log("[auth/profile] update a aplicar:", update);

    const result = await User.updateOne({ _id: user._id }, { $set: update });
    console.log("[auth/profile] updateOne result:", result);

    const account = await User.findById(user._id).select("-passwordHash");

    if (!account) {
      return failure(res, "Usuario no encontrado", 404);
    }

    console.log("[auth/profile] account.avatarColorIndex tras update:", account.avatarColorIndex);
    const serialized = serializeUser(account);
    console.log("[auth/profile] serialized:", serialized);
    return success(res, serialized);
  } catch (error) {
    console.error("[auth/profile]", error);
    return failure(res, "No se pudo actualizar el perfil", 500);
  }
}
