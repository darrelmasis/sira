import { serialize } from "cookie"

export function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production"

  const cookie = serialize("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  res.setHeader("Set-Cookie", cookie)
}

export function clearRefreshCookie(res) {
  const cookie = serialize("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  })

  res.setHeader("Set-Cookie", cookie)
}