export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseQueryString(url) {
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (params[key] !== undefined) {
      params[key] = [].concat(params[key], value);
    } else {
      params[key] = value;
    }
  }
  return params;
}

export function resolveRoutePath(req) {
  let path = req.query?.path;

  if (Array.isArray(path)) {
    path = path.join("/");
  }

  if (path) {
    return String(path).replace(/^\/+|\/+$/g, "");
  }

  const rawUrl = req.url || "";
  const pathname = rawUrl.split("?")[0] || "";

  return pathname.replace(/^\/api\/?/, "").replace(/^\/+|\/+$/g, "");
}

export function buildApiRequest(req) {
  const url = new URL(req.url || "", "http://localhost");
  const query = parseQueryString(url);
  const path = resolveRoutePath({ ...req, query });

  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: { ...query, path },
    body: undefined,
  };
}

export function createApiResponse(res) {
  let statusCode = 200;
  const headers = {};

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(key, value) {
      headers[key] = value;
    },
    json(data) {
      if (!res.headersSent) {
        res.writeHead(statusCode, { ...headers, "Content-Type": "application/json" });
      }
      res.end(JSON.stringify(data));
    },
  };
}

export async function handleApiRequest(incomingReq, serverRes, handler) {
  try {
    const apiReq = buildApiRequest(incomingReq);
    apiReq.body = await readJsonBody(incomingReq);
    const apiRes = createApiResponse(serverRes);
    await handler(apiReq, apiRes);
  } catch (error) {
    console.error("[api] handleApiRequest error:", error);
    if (!serverRes.headersSent) {
      serverRes.writeHead(500, { "Content-Type": "application/json" });
      serverRes.end(JSON.stringify({ success: false, message: "Error interno del servidor" }));
    }
  }
}
