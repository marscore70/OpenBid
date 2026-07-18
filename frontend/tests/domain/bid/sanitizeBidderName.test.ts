import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  constrainBidderNameInput,
  isSameBidderIdentity,
  normalizeBidderIdentity,
  parseBidderName,
  sanitizeNetworkText,
} from "../../../src/domain/bid/sanitizeBidderName";

describe("parseBidderName", () => {
  it("strips control characters and trims", () => {
    expect(parseBidderName("  Ron\u0000  ")).toBe("Ron");
  });

  it("rejects empty names", () => {
    expect(() => parseBidderName("   ")).toThrow(ZodError);
  });

  it("rejects non-string values", () => {
    expect(() => parseBidderName(null)).toThrow(ZodError);
    expect(() => parseBidderName(undefined)).toThrow(ZodError);
    expect(() => parseBidderName(12)).toThrow(ZodError);
  });

  it("rejects names longer than 64 characters", () => {
    expect(() => parseBidderName("a".repeat(65))).toThrow(ZodError);
  });

  it("returns sanitized name", () => {
    expect(parseBidderName("  Noa  ")).toBe("Noa");
  });
});

describe("constrainBidderNameInput", () => {
  it("strips controls and truncates for live typing", () => {
    expect(constrainBidderNameInput("  Ron\u0000  ")).toBe("  Ron  ");
    expect(constrainBidderNameInput("a".repeat(70)).length).toBe(64);
  });
});

describe("sanitizeNetworkText", () => {
  it("strips bidi overrides and zero-width characters after NFKC", () => {
    expect(sanitizeNetworkText("Al\u200Bice\u202E")).toBe("Alice");
  });
});

describe("bidder identity", () => {
  it("normalizes case and whitespace with a locale-invariant lowercasing", () => {
    expect(normalizeBidderIdentity("  Alice  ")).toBe("alice");
  });

  it("treats case variants as the same identity", () => {
    expect(isSameBidderIdentity("Alice", "  alice  ")).toBe(true);
  });

  it("rejects empty or null sides", () => {
    expect(isSameBidderIdentity("Alice", "   ")).toBe(false);
    expect(isSameBidderIdentity(null, "Alice")).toBe(false);
  });
});
