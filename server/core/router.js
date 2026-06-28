import { loadEnv } from "../env.js"
import { ROUTES } from "./routes.js"
import { connectMongo } from "../db/mongo.js"
import { ensurePermissionsLoaded } from "../utils/permissions.js"
import { resolveRoutePath } from "../adapt-request.js"
import { failure } from "../utils/response.js"

export default async function handler(req, res) {
  try {
    loadEnv()
    await connectMongo()
    await ensurePermissionsLoaded()
  } catch (error) {
    console.error("[router] Init error:", error)
    return failure(res, "Error de conexión con la base de datos", 503)
  }

  try {
    const method = req.method.toUpperCase()
    const path = resolveRoutePath(req)

    const route = ROUTES[path]

    if (!route) {
      return failure(res, "Route not found", 404)
    }

    if (!route.methods.includes(method)) {
      return failure(res, "Method not allowed", 405)
    }

    return await route.handler(req, res)
  } catch (error) {
    console.error("[router] Handler error:", error)
    return failure(res, "Error interno del servidor", 500)
  }
}