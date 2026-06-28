import User from "../../models/User.js"
import {
  signAccessToken,
  verifyRefreshToken,
} from "../../utils/jwt.js"
import { parseCookies } from "../../utils/parseCookies.js"
import { serializeUser } from "../../utils/serializeUser.js"
import { ensurePermissionsLoaded, getPermissionsMap } from "../../utils/permissions.js"
import { failure, success } from "../../utils/response.js"

export default async function refreshHandler(req, res) {
  try {
    const cookies = parseCookies(req)
    const refreshToken = cookies.refreshToken

    if (!refreshToken) {
      return failure(res, "No refresh token", 401)
    }

    const decoded = verifyRefreshToken(refreshToken)

    const user = await User.findById(decoded.id)

    if (!user || !user.active) {
      return failure(res, "Invalid user", 401)
    }

    const accessToken = signAccessToken({
      id: user._id,
      username: user.username,
      role: user.role,
    })

    await ensurePermissionsLoaded()

    return success(res, {
      user: serializeUser(user),
      accessToken,
      permissions: getPermissionsMap(),
    })
  } catch {
    return failure(res, "Session expired", 401)
  }
}
