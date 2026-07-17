import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  constrainBidderNameInput,
  parseBidderName,
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
