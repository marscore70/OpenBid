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

const baseEndsAt = Date.now() + 60_000;

const baseAuction: AuctionSummary = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: baseEndsAt,
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
  endsAt: baseEndsAt,
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
        endsAt: baseEndsAt,
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
        endsAt: baseEndsAt,
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
        endsAt: baseEndsAt,
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
        endsAt: baseEndsAt,
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
        endsAt: baseEndsAt,
      },
      timing,
    );
    expect(stale.applied).toBe(false);
    expect(stale.auction.currentBid).toBe(120);
    expect(stale.auction.bidHistory).toHaveLength(1);
  });

  it("adopts the authoritative endsAt and flags snipeExtended when an applied bid extends the deadline", () => {
    const timing = createDisplayTimingRegistry();
    const extendedEndsAt = baseEndsAt + 15_000;
    const result = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "a1",
        bidder: "Ron",
        amount: 110,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_snipe_1",
        endsAt: extendedEndsAt,
      },
      timing,
    );

    expect(result.auction.endsAt).toBe(extendedEndsAt);
    expect(timing.get("a1", baseEndsAt).snipeExtended).toBe(true);
    expect(timing.get("a1", baseEndsAt).displayEndsAt).toBe(extendedEndsAt);
  });

  it("stacks a second authoritative extension from a later accepted bid", () => {
    const timing = createDisplayTimingRegistry();
    const firstExtension = baseEndsAt + 15_000;
    const secondExtension = firstExtension + 15_000;

    const first = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "a1",
        bidder: "Ron",
        amount: 110,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_snipe_1",
        endsAt: firstExtension,
      },
      timing,
    );

    const second = mergeNewBidIntoSummary(
      first.auction,
      {
        auctionId: "a1",
        bidder: "Noa",
        amount: 120,
        previousBid: 110,
        timestamp: Date.now(),
        bid_id: "bid_snipe_2",
        endsAt: secondExtension,
      },
      timing,
    );

    expect(second.auction.endsAt).toBe(secondExtension);
  });

  it("cannot roll the deadline backward from a stale/out-of-order event (amount not ahead is a no-op)", () => {
    const timing = createDisplayTimingRegistry();
    const extendedEndsAt = baseEndsAt + 15_000;
    const extended = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: "a1",
        bidder: "Ron",
        amount: 150,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_ahead",
        endsAt: extendedEndsAt,
      },
      timing,
    );

    // Out-of-order event: lower amount than current, but claims an even
    // later endsAt. Must be rejected wholesale (applied: false) and must not
    // move endsAt at all, let alone "double extend" it.
    const stale = mergeNewBidIntoSummary(
      extended.auction,
      {
        auctionId: "a1",
        bidder: "Bot",
        amount: 120,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: "bid_stale_out_of_order",
        endsAt: extendedEndsAt + 999_999,
      },
      timing,
    );

    expect(stale.applied).toBe(false);
    expect(stale.auction.endsAt).toBe(extendedEndsAt);
    expect(stale.auction.currentBid).toBe(150);
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

  it("does not apply new_bid after the auction has already ended", () => {
    const timing = createDisplayTimingRegistry();
    const ended: AuctionSummary = {
      ...baseAuction,
      status: AuctionStatus.Ended,
      currentBid: 150,
      currentBidder: "Noa",
      bidCount: 2,
    };
    const result = mergeNewBidIntoSummary(
      ended,
      {
        auctionId: "a1",
        bidder: "Late",
        amount: 200,
        previousBid: 150,
        timestamp: Date.now(),
        bid_id: "bid_after_end",
        endsAt: baseEndsAt + 15_000,
      },
      timing,
    );
    expect(result.applied).toBe(false);
    expect(result.auction).toBe(ended);
    expect(result.auction.currentBidder).toBe("Noa");
    expect(result.auction.currentBid).toBe(150);
  });

  it("keeps a higher cached bid when auction_ended finalPrice is lower", () => {
    const timing = createDisplayTimingRegistry();
    const merged = mergeAuctionEndedIntoSummary(
      {
        ...baseAuction,
        currentBid: 200,
        currentBidder: "Alice",
      },
      {
        auctionId: "a1",
        title: "Test",
        winner: "Stale",
        finalPrice: 100,
        timestamp: Date.now(),
      },
      timing,
    );
    expect(merged.status).toBe(AuctionStatus.Ended);
    expect(merged.currentBid).toBe(200);
    expect(merged.currentBidder).toBe("Alice");
  });
});
