import { describe, expect, it } from "vitest";
import { unionBidHistory } from "../../../src/domain/auction/unionBidHistory";

describe("unionBidHistory", () => {
  it("unions two lists by (bidder, amount, timestamp) instead of replacing", () => {
    const cached = [{ bidder: "Ron", amount: 100, timestamp: 10 }];
    const fetched = [
      { bidder: "Ron", amount: 100, timestamp: 10 },
      { bidder: "Noa", amount: 120, timestamp: 20 },
    ];

    const result = unionBidHistory(cached, fetched);

    expect(result).toEqual([
      { bidder: "Ron", amount: 100, timestamp: 10 },
      { bidder: "Noa", amount: 120, timestamp: 20 },
    ]);
  });

  it("keeps entries only present on one side (SSE-applied entry missing from a stale REST snapshot)", () => {
    const cached = [
      { bidder: "Ron", amount: 100, timestamp: 10 },
      { bidder: "Noa", amount: 120, timestamp: 20 },
    ];
    const fetched = [{ bidder: "Ron", amount: 100, timestamp: 10 }];

    const result = unionBidHistory(cached, fetched);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([{ bidder: "Noa", amount: 120, timestamp: 20 }]),
    );
  });

  it("sorts the unioned result by timestamp ascending", () => {
    const cached = [{ bidder: "Noa", amount: 120, timestamp: 20 }];
    const fetched = [{ bidder: "Ron", amount: 100, timestamp: 10 }];

    const result = unionBidHistory(cached, fetched);

    expect(result.map((entry) => entry.timestamp)).toEqual([10, 20]);
  });

  it("de-duplicates identical entries appearing on both sides", () => {
    const entry = { bidder: "Ron", amount: 100, timestamp: 10 };
    const result = unionBidHistory([entry], [entry]);
    expect(result).toEqual([entry]);
  });
});
