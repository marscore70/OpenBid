import { describe, expect, it } from "vitest";
import { createSeenBidIdRegistry } from "../../../src/domain/auction/dedupeBidEvent";

describe("dedupeBidEvent", () => {
  it("dedupes same bid_id", () => {
    const seen = createSeenBidIdRegistry();
    expect(seen.consume("bid_1")).toBe(false);
    expect(seen.consume("bid_1")).toBe(true);
  });
});
