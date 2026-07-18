import { describe, expect, it } from "vitest";
import { buildBidHistoryChartModel } from "../../../src/features/auction-detail/buildBidHistoryChartModel";
import type { BidHistoryEntry } from "../../../src/shared/types/BidHistoryEntry";

const SAMPLE_ENTRY: BidHistoryEntry = {
  bidder: "Alice",
  amount: 120,
  timestamp: Date.UTC(2026, 6, 18, 10, 30, 0),
};

describe("buildBidHistoryChartModel", () => {
  it("returns empty placeholder labels when history is empty", () => {
    const model = buildBidHistoryChartModel([]);
    expect(model.isEmpty).toBe(true);
    expect(model.labels).toEqual(["No bids yet"]);
    expect(model.amounts).toEqual([]);
  });

  it("maps bid amounts and formatted timestamps", () => {
    const model = buildBidHistoryChartModel([SAMPLE_ENTRY]);
    expect(model.isEmpty).toBe(false);
    expect(model.amounts).toEqual([120]);
    expect(model.labels).toHaveLength(1);
    expect(model.labels[0]).not.toBe("No bids yet");
  });
});
