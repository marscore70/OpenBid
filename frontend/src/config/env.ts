const LOCAL_DEV_API_BASE = "http://localhost:3005";

export type ApiEnv = {
  prod: boolean;
  /** Raw `VITE_API_BASE_URL` from Vite (may be undefined if unset at build). */
  viteApiBaseUrl: string | undefined;
};

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
 * - Prod: `VITE_API_BASE_URL` must be present at build time.
 *   Empty string means same-origin (nginx reverse-proxies `/api`).
 *   Non-local HTTP is rejected (HTTPS required).
 */
export function resolveApiBaseUrl(env: ApiEnv): string {
  const raw = env.viteApiBaseUrl;
  const fromEnv = raw === undefined ? undefined : raw.trim();

  if (env.prod) {
    if (raw === undefined) {
      throw new Error("VITE_API_BASE_URL is required in production builds");
    }
    if (fromEnv === undefined || fromEnv === "") {
      return "";
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

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl({
    prod: import.meta.env.PROD,
    viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  });
}
