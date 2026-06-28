import { loginUser } from "../../services/auth.service.js"
import { failure, success } from "../../utils/response.js"
import { setRefreshCookie } from "../../utils/cookies.js"
import { serializeUser } from "../../utils/serializeUser.js"
import { ensurePermissionsLoaded, getPermissionsMap } from "../../utils/permissions.js"

export default async function loginHandler(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return failure(res, "Missing credentials", 400)
    }

    const result = await loginUser(username, password)
    await ensurePermissionsLoaded()

    setRefreshCookie(res, result.refreshToken)

    return success(res, {
      user: serializeUser(result.user),
      accessToken: result.accessToken,
      permissions: getPermissionsMap(),
    })
  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return failure(res, "Invalid credentials", 401)
    }

    return failure(res, "Server error", 500)
  }
}