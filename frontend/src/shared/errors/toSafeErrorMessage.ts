import { HttpError } from "../../infrastructure/api/httpClient";

const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";
const SERVER_ERROR_MESSAGE =
  "Something went wrong loading this data. Please try again.";

/**
 * Maps a caught error to a short, user-safe message. `HttpError.message`
 * embeds the internal request method/path/status (e.g. "GET /api/auctions
 * failed (500)") — useful for logs, but never safe to show verbatim in the
 * UI. Callers must still log the raw error separately for full detail.
 */
export function toSafeErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    return error.status === 0 ? NETWORK_ERROR_MESSAGE : SERVER_ERROR_MESSAGE;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return SERVER_ERROR_MESSAGE;
}
