import { describe, expect, it } from "vitest";
import { formatBidTimestamp } from "../../../src/shared/format/formatBidTimestamp";

describe("formatBidTimestamp", () => {
  it("formats as dd.mm.yy with 24-hour time", () => {
    const timestamp = new Date(2026, 6, 17, 19, 5, 9).getTime();
    expect(formatBidTimestamp(timestamp)).toBe("17.07.26 19:05:09");
  });

  it("pads single-digit day, month, and time parts", () => {
    const timestamp = new Date(2026, 0, 3, 0, 0, 0).getTime();
    expect(formatBidTimestamp(timestamp)).toBe("03.01.26 00:00:00");
  });

  it("uses 24-hour clock past noon", () => {
    const timestamp = new Date(2026, 11, 31, 23, 59, 58).getTime();
    expect(formatBidTimestamp(timestamp)).toBe("31.12.26 23:59:58");
  });

  it("returns a placeholder for invalid timestamps", () => {
    expect(formatBidTimestamp(Number.NaN)).toBe("-");
    expect(formatBidTimestamp(Number.POSITIVE_INFINITY)).toBe("-");
  });
});
