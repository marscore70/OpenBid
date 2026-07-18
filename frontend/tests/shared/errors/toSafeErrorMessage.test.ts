import { describe, expect, it } from "vitest";
import {
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  toSafeErrorMessage,
} from "../../../src/shared/errors/toSafeErrorMessage";
import { HttpError } from "../../../src/infrastructure/api/httpClient";

describe("toSafeErrorMessage", () => {
  it("never leaks the request method/path for a server HttpError", () => {
    const error = new HttpError(500, null, "GET /api/auctions failed (500)");
    const message = toSafeErrorMessage(error);
    expect(message).toBe(SERVER_ERROR_MESSAGE);
    expect(message).not.toContain("/api/auctions");
    expect(message).not.toContain("GET");
  });

  it("maps a network HttpError (status 0) to the connectivity constant", () => {
    const error = new HttpError(0, null, "GET /api/auctions failed (network)");
    expect(toSafeErrorMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("does not expose an arbitrary Error.message to the UI", () => {
    const error = new Error("Invalid auctions response /api/secret");
    const message = toSafeErrorMessage(error);
    expect(message).toBe(SERVER_ERROR_MESSAGE);
    expect(message).not.toContain("/api/secret");
    expect(message).not.toBe(error.message);
  });

  it("falls back to the generic safe constant for a non-Error thrown value", () => {
    expect(toSafeErrorMessage("boom")).toBe(SERVER_ERROR_MESSAGE);
  });
});
