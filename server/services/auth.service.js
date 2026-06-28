import argon2 from "argon2"
import User from "../models/User.js"
import { signAccessToken, signRefreshToken } from "../utils/jwt.js"

export async function loginUser(username, password) {
  const user = await User.findOne({ username })

  if (!user || !user.active) {
    throw new Error("INVALID_CREDENTIALS")
  }

  const valid = await argon2.verify(user.passwordHash, password)

  if (!valid) {
    throw new Error("INVALID_CREDENTIALS")
  }

  const payload = {
    id: user._id,
    role: user.role,
    username: user.username,
  }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  return {
    user,
    accessToken,
    refreshToken,
  }
}
