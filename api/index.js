export default async function handler(req, res) {
  const { loadEnv } = await import("../server/env.js");
  loadEnv();

  const [{ default: router }, { handleApiRequest }] = await Promise.all([
    import("../server/core/router.js"),
    import("../server/adapt-request.js"),
  ]);

  return handleApiRequest(req, res, router);
}