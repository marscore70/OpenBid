import { describe, expect, it } from "vitest";
import { createDisplayTimingRegistry } from "../../../src/domain/auction/DisplayTiming";
import { mergeAuctionEndedIntoSummary } from "../../../src/domain/auction/mergeAuctionEnded";
import {
  mergeNewBidIntoDetail,
  mergeNewBidIntoSummary,
} from "../../../src/domain/auction/mergeNewBid";
import type { AuctionDetail } from "../../../src/shared/types/AuctionDetail";
import type { AuctionSummary } from "../../../src/shared/types/AuctionSummary";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";

const baseAuction: AuctionSummary = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidCount: 0,
};

const baseDetail: AuctionDetail = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidHistory: [],
};

describe("merge auction state", () => {
  it("merges new_bid when amount increases and reports applied", () => {
    const timing = createDisplayTimingRegistry();
    const result = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "a1",
        bidder: "Ron",
        amount: 110,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_x",
      },
      timing,
    );
    expect(result.applied).toBe(true);
    expect(result.auction.currentBid).toBe(110);
    expect(result.auction.bidCount).toBe(1);
  });

  it("does not apply new_bid when amount is not greater than currentBid", () => {
    const timing = createDisplayTimingRegistry();
    const result = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "a1",
        bidder: "Ron",
        amount: 100,
        previousBid: 90,
        timestamp: Date.now(),
        bid_id: "bid_stale",
      },
      timing,
    );
    expect(result.applied).toBe(false);
    expect(result.auction).toBe(baseAuction);
  });

  it("does not apply new_bid when auctionId mismatches", () => {
    const timing = createDisplayTimingRegistry();
    const result = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "other",
        bidder: "Ron",
        amount: 200,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_other",
      },
      timing,
    );
    expect(result.applied).toBe(false);
    expect(result.auction).toBe(baseAuction);
  });

  it("merges detail new_bid and reports applied only when amount advances", () => {
    const timing = createDisplayTimingRegistry();
    const advanced = mergeNewBidIntoDetail(
      baseDetail,
      {
        auctionId: "a1",
        bidder: "Noa",
        amount: 120,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_d1",
      },
      timing,
    );
    expect(advanced.applied).toBe(true);
    expect(advanced.auction.currentBid).toBe(120);
    expect(advanced.auction.bidHistory).toHaveLength(1);

    const stale = mergeNewBidIntoDetail(
      advanced.auction,
      {
        auctionId: "a1",
        bidder: "Bot",
        amount: 110,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_d2",
      },
      timing,
    );
    expect(stale.applied).toBe(false);
    expect(stale.auction.currentBid).toBe(120);
    expect(stale.auction.bidHistory).toHaveLength(1);
  });

  it("merges auction_ended into ended summary with winner", () => {
    const timing = createDisplayTimingRegistry();
    const merged = mergeAuctionEndedIntoSummary(
      { ...baseAuction, currentBid: 150, currentBidder: "Noa" },
      {
        auctionId: "a1",
        title: "Test",
        winner: "Noa",
        finalPrice: 150,
        timestamp: Date.now(),
      },
      timing,
    );
    expect(merged.status).toBe(AuctionStatus.Ended);
    expect(merged.currentBidder).toBe("Noa");
  });
});
