import { describe, expect, it } from "vitest";
import { shouldClearMyBidsAfterListReconcile } from "../../../src/features/my-bids/shouldClearMyBidsAfterListReconcile";
import type { StoredMyBid } from "../../../src/shared/storage/bidderStorage";
import type { AuctionSummary } from "../../../src/shared/types/AuctionSummary";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";

const endsAt = Date.now() + 60_000;

function summary(
  id: string,
  currentBid: number,
): AuctionSummary {
  return {
    id,
    title: id,
    image: "🎮",
    startPrice: 100,
    currentBid,
    currentBidder: null,
    endsAt,
    status: AuctionStatus.Active,
    bidCount: 0,
  };
}

function stored(auctionId: string, amount: number): StoredMyBid {
  return { auctionId, amount, timestamp: 1 };
}

describe("shouldClearMyBidsAfterListReconcile", () => {
  it("returns true when every stored bid matches an auction and is strictly ahead", () => {
    const result = shouldClearMyBidsAfterListReconcile(
      [stored("a1", 200), stored("a2", 150)],
      [summary("a1", 100), summary("a2", 100)],
    );

    expect(result).toBe(true);
  });

  it("returns false when storage is empty (no clear/write)", () => {
    expect(
      shouldClearMyBidsAfterListReconcile([], [summary("a1", 100)]),
    ).toBe(false);
  });

  it("returns false when any stored auctionId is missing from the fetched list", () => {
    const result = shouldClearMyBidsAfterListReconcile(
      [stored("a1", 200), stored("gone", 200)],
      [summary("a1", 100)],
    );

    expect(result).toBe(false);
  });

  it("returns false when any stored amount is not strictly greater than server currentBid", () => {
    const equal = shouldClearMyBidsAfterListReconcile(
      [stored("a1", 100), stored("a2", 200)],
      [summary("a1", 100), summary("a2", 100)],
    );
    const behind = shouldClearMyBidsAfterListReconcile(
      [stored("a1", 90)],
      [summary("a1", 100)],
    );

    expect(equal).toBe(false);
    expect(behind).toBe(false);
  });
});
