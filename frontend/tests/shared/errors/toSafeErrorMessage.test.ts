import { describe, expect, it } from "vitest";
import { toSafeErrorMessage } from "../../../src/shared/errors/toSafeErrorMessage";
import { HttpError } from "../../../src/infrastructure/api/httpClient";

describe("toSafeErrorMessage", () => {
  it("never leaks the request method/path for a server HttpError", () => {
    const error = new HttpError(500, null, "GET /api/auctions failed (500)");
    const message = toSafeErrorMessage(error);
    expect(message).not.toContain("/api/auctions");
    expect(message).not.toContain("GET");
  });

  it("maps a network HttpError (status 0) to a connectivity message", () => {
    const error = new HttpError(0, null, "GET /api/auctions failed (network)");
    expect(toSafeErrorMessage(error)).toBe(
      "Could not reach the server. Check your connection and try again.",
    );
  });

  it("passes through a plain Error message (already safe, no request detail)", () => {
    const error = new Error("Invalid auctions response");
    expect(toSafeErrorMessage(error)).toBe("Invalid auctions response");
  });

  it("falls back to a generic message for a non-Error thrown value", () => {
    expect(toSafeErrorMessage("boom")).toBe(
      "Something went wrong loading this data. Please try again.",
    );
  });
});
