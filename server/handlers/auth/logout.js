import { clearRefreshCookie } from "../../utils/cookies.js"
import { success } from "../../utils/response.js"

export default async function logoutHandler(req, res) {
  clearRefreshCookie(res)
  return success(res, {})
}