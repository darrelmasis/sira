import jwt from "jsonwebtoken";
import { requireEnv } from "../env.js";

function accessSecret() {
  return requireEnv("JWT_ACCESS_SECRET");
}

function refreshSecret() {
  return requireEnv("JWT_REFRESH_SECRET");
}

export function signAccessToken(payload) {
  return jwt.sign(payload, accessSecret(), {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, refreshSecret(), {
    expiresIn: "30d",
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret());
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret());
}
