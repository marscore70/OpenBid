const DEFAULT_API_BASE = "http://localhost:3005";

export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return DEFAULT_API_BASE;
}
