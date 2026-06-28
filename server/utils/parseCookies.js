import { parse } from "cookie"

export function parseCookies(req) {
  const cookieHeader = req.headers.cookie || ""
  return parse(cookieHeader)
}