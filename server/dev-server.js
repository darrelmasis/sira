import http from "node:http";
import { loadEnv } from "./env.js";
import handler from "./core/router.js";
import { handleApiRequest } from "./adapt-request.js";

loadEnv();

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/api")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Not found" }));
    return;
  }

  try {
    await handleApiRequest(req, res, handler);
  } catch (error) {
    console.error("[dev-server]", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: error.message || "Server error" }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`API dev escuchando en http://localhost:${PORT}`);
});
