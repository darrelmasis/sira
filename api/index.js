export default async function handler(req, res) {
  try {
    const { loadEnv } = await import("../server/env.js");
    loadEnv();

    const [{ default: router }, { handleApiRequest }] = await Promise.all([
      import("../server/core/router.js"),
      import("../server/adapt-request.js"),
    ]);

    return handleApiRequest(req, res, router);
  } catch (error) {
    console.error("[api] Fatal error:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Error interno del servidor" }));
    }
  }
}