import User from "../models/User.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { failure } from "../utils/response.js";

export async function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    failure(res, "Unauthorized", 401);
    return null;
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("_id username nombre role active granjasAsignadas avatarId");

    if (!user || !user.active) {
      failure(res, "Unauthorized", 401);
      return null;
    }

    req.user = user;
    return user;
  } catch {
    failure(res, "Unauthorized", 401);
    return null;
  }
}
