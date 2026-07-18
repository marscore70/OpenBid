import { describe, expect, it } from "vitest";
import { createSeenBidIdRegistry } from "../../../src/domain/auction/dedupeBidEvent";

describe("dedupeBidEvent", () => {
  it("dedupes same bid_id", () => {
    const seen = createSeenBidIdRegistry();
    expect(seen.consume("bid_1")).toBe(false);
    expect(seen.consume("bid_1")).toBe(true);
    expect(seen.has("bid_1")).toBe(true);
  });

  it("evicts oldest ids when over max capacity", () => {
    const seen = createSeenBidIdRegistry(2);
    expect(seen.consume("a")).toBe(false);
    expect(seen.consume("b")).toBe(false);
    expect(seen.consume("c")).toBe(false);
    expect(seen.has("a")).toBe(false);
    expect(seen.has("b")).toBe(true);
    expect(seen.has("c")).toBe(true);
  });
});
