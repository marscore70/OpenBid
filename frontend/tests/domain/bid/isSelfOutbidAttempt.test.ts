import { describe, expect, it } from "vitest";
import { isSelfOutbidAttempt } from "../../../src/domain/bid/isSelfOutbidAttempt";

describe("isSelfOutbidAttempt", () => {
  it("blocks the current bidder after normalizing whitespace and case", () => {
    expect(isSelfOutbidAttempt("Alice", "  alice  ")).toBe(true);
  });

  it("allows a different bidder", () => {
    expect(isSelfOutbidAttempt("Alice", "Bob")).toBe(false);
  });

  it("allows bidding when the auction has no current bidder", () => {
    expect(isSelfOutbidAttempt(null, "Alice")).toBe(false);
  });

  it("does not treat an empty bidder as the current leader", () => {
    expect(isSelfOutbidAttempt("Alice", "   ")).toBe(false);
  });
});
