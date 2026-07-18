const LOCAL_DEV_API_BASE = "http://localhost:3005";

function isLocalDevHost(url: string): boolean {
  return (
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1") ||
    url.startsWith("https://localhost") ||
    url.startsWith("https://127.0.0.1")
  );
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "");
}

/**
 * Resolves the API/SSE origin.
 * - Dev: defaults to the local mock server over HTTP.
 * - Prod: requires `VITE_API_BASE_URL`; non-local HTTP is rejected (HTTPS required).
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();

  if (import.meta.env.PROD) {
    if (!fromEnv) {
      throw new Error("VITE_API_BASE_URL is required in production builds");
    }
    const url = normalizeBaseUrl(fromEnv);
    if (url.startsWith("http://") && !isLocalDevHost(url)) {
      throw new Error(
        "Production VITE_API_BASE_URL must use HTTPS (or a local host)",
      );
    }
    return url;
  }

  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }

  return LOCAL_DEV_API_BASE;
}
