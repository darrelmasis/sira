const API_BASE = "/api";
const DEFAULT_TIMEOUT_MS = 30_000;

export async function api(path, options = {}) {
  const { accessToken, headers, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(headers || {}),
      },
      ...fetchOptions,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : {};

    if (!contentType.includes("application/json")) {
      return {
        success: false,
        message: "La API no respondió correctamente. ¿Estás usando npm run dev?",
      };
    }

    if (!response.ok || data.success !== true) {
      return {
        success: false,
        message: data.message || `Error ${response.status}`,
        data: data.data,
      };
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
