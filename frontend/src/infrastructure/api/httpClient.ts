import axios, { AxiosError, type AxiosInstance } from "axios";
import { getApiBaseUrl } from "../../config/env";

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30_000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error)) {
        throw toHttpError(error);
      }
      throw error;
    },
  );

  return client;
}

function toHttpError(error: AxiosError): HttpError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data ?? null;
  const method = (error.config?.method ?? "request").toUpperCase();
  const path = error.config?.url ?? "";
  return new HttpError(
    status,
    body,
    `${method} ${path} failed (${status || "network"})`,
  );
}

/** Shared Axios instance - base for domain API services. */
export const apiClient = createApiClient();

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
