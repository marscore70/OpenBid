import { describe, expect, it } from "vitest";
import { syncBidAmountTextToMinimum } from "../../../src/domain/bid/syncBidAmountTextToMinimum";

describe("syncBidAmountTextToMinimum", () => {
  it("raises a stale amount below the new minimum", () => {
    expect(syncBidAmountTextToMinimum("101", 150)).toBe("150");
  });

  it("preserves a user amount that is still at or above the new minimum", () => {
    expect(syncBidAmountTextToMinimum("200", 150)).toBe("200");
  });

  it("preserves an amount equal to the new minimum", () => {
    expect(syncBidAmountTextToMinimum("150", 150)).toBe("150");
  });

  it("replaces non-finite input with the new minimum", () => {
    expect(syncBidAmountTextToMinimum("", 120)).toBe("120");
    expect(syncBidAmountTextToMinimum("abc", 120)).toBe("120");
  });
});
