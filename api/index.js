import apiHandler from "../server/core/router.js";

export default async function handler(req, res) {
  const { loadEnv } = await import("../server/env.js");
  loadEnv();
  return apiHandler(req, res);
}