import { describe, expect, it } from "vitest";
import {
  mergeFetchedAuctionDetail,
  mergeFetchedAuctionSummary,
} from "../../../src/domain/auction/mergeFetchedAuctionSnapshot";
import type { AuctionSummary } from "../../../src/shared/types/AuctionSummary";
import type { AuctionDetail } from "../../../src/shared/types/AuctionDetail";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";

const endsAt = 1_700_000_000_000;

const cachedSummary: AuctionSummary = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 150,
  currentBidder: "Noa",
  endsAt,
  status: AuctionStatus.Active,
  bidCount: 3,
};

describe("mergeFetchedAuctionSummary", () => {
  it("accepts the fetched snapshot wholesale when there is no cached entry", () => {
    const fetched: AuctionSummary = { ...cachedSummary, currentBid: 100 };
    expect(mergeFetchedAuctionSummary(undefined, fetched)).toEqual(fetched);
  });

  it("accepts the fetched snapshot wholesale when currentBid dropped (server reset)", () => {
    const fetched: AuctionSummary = {
      ...cachedSummary,
      endsAt: endsAt + 1,
      currentBid: 50,
      bidCount: 0,
    };
    expect(mergeFetchedAuctionSummary(cachedSummary, fetched)).toEqual(fetched);
  });

  it("adopts an authoritative snipe extension: a same-epoch fetch with a later endsAt is not a reset", () => {
    const fetched: AuctionSummary = {
      ...cachedSummary,
      endsAt: endsAt + 15_000,
    };
    const merged = mergeFetchedAuctionSummary(cachedSummary, fetched);
    expect(merged.endsAt).toBe(endsAt + 15_000);
    expect(merged.currentBid).toBe(cachedSummary.currentBid);
  });

  it("cannot roll the deadline backward: a stale GET with an older endsAt keeps the cached (newer, SSE-extended) value", () => {
    const cachedWithExtension: AuctionSummary = {
      ...cachedSummary,
      endsAt: endsAt + 15_000,
    };
    const staleFetched: AuctionSummary = { ...cachedSummary, endsAt };
    const merged = mergeFetchedAuctionSummary(
      cachedWithExtension,
      staleFetched,
    );
    expect(merged.endsAt).toBe(endsAt + 15_000);
  });

  it("accepts a backend reset even when it carries an older endsAt", () => {
    const cachedWithExtension: AuctionSummary = {
      ...cachedSummary,
      endsAt: endsAt + 15_000,
    };
    const resetFetched: AuctionSummary = {
      ...cachedSummary,
      endsAt,
      currentBid: 50,
      currentBidder: null,
      bidCount: 0,
    };
    expect(
      mergeFetchedAuctionSummary(cachedWithExtension, resetFetched),
    ).toEqual(resetFetched);
  });

  it("keeps the cached currentBid/currentBidder when a same-epoch fetch is stale (SSE already advanced ahead)", () => {
    const fetched: AuctionSummary = {
      ...cachedSummary,
      currentBid: 120,
      currentBidder: "Ron",
      bidCount: 2,
    };
    const merged = mergeFetchedAuctionSummary(cachedSummary, fetched);
    expect(merged.currentBid).toBe(150);
    expect(merged.currentBidder).toBe("Noa");
    expect(merged.bidCount).toBe(3);
  });

  it("keeps the cached bidCount even when a stale fetch's bidCount is numerically higher (tied to bidAdvanced, not an independent Math.max)", () => {
    const fetched: AuctionSummary = {
      ...cachedSummary,
      currentBid: 120,
      currentBidder: "Ron",
      bidCount: 9,
    };
    const merged = mergeFetchedAuctionSummary(cachedSummary, fetched);
    expect(merged.currentBid).toBe(150);
    expect(merged.bidCount).toBe(3);
  });

  it("advances currentBid/currentBidder/bidCount when the fetch is ahead of the cache", () => {
    const fetched: AuctionSummary = {
      ...cachedSummary,
      currentBid: 200,
      currentBidder: "Ron",
      bidCount: 5,
    };
    const merged = mergeFetchedAuctionSummary(cachedSummary, fetched);
    expect(merged.currentBid).toBe(200);
    expect(merged.currentBidder).toBe("Ron");
    expect(merged.bidCount).toBe(5);
  });

  it("never reverts an already-Ended cached status back to Active", () => {
    const endedCached: AuctionSummary = {
      ...cachedSummary,
      status: AuctionStatus.Ended,
    };
    const fetchedStillActive: AuctionSummary = {
      ...cachedSummary,
      status: AuctionStatus.Active,
    };
    const merged = mergeFetchedAuctionSummary(endedCached, fetchedStillActive);
    expect(merged.status).toBe(AuctionStatus.Ended);
  });
});

const cachedDetail: AuctionDetail = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 150,
  currentBidder: "Noa",
  endsAt,
  status: AuctionStatus.Active,
  bidHistory: [
    { bidder: "Noa", amount: 150, timestamp: 20 },
    { bidder: "Ron", amount: 130, timestamp: 10 },
  ],
};

describe("mergeFetchedAuctionDetail", () => {
  it("accepts the fetched snapshot wholesale when there is no cached detail", () => {
    expect(mergeFetchedAuctionDetail(null, cachedDetail)).toEqual(
      cachedDetail,
    );
  });

  it("unions bid history instead of replacing it on a same-epoch fetch", () => {
    const fetched: AuctionDetail = {
      ...cachedDetail,
      currentBid: 130,
      currentBidder: "Ron",
      bidHistory: [{ bidder: "Ron", amount: 130, timestamp: 10 }],
    };
    const merged = mergeFetchedAuctionDetail(cachedDetail, fetched);
    expect(merged.bidHistory).toHaveLength(2);
    expect(merged.currentBid).toBe(150);
    expect(merged.currentBidder).toBe("Noa");
  });

  it("accepts the fetched snapshot wholesale on a server reset (currentBid dropped)", () => {
    const fetched: AuctionDetail = {
      ...cachedDetail,
      endsAt: endsAt + 1,
      currentBid: 50,
      bidHistory: [],
    };
    expect(mergeFetchedAuctionDetail(cachedDetail, fetched)).toEqual(fetched);
  });

  it("merges endsAt monotonically on a same-epoch fetch instead of treating the extension as a new epoch", () => {
    const fetched: AuctionDetail = {
      ...cachedDetail,
      endsAt: endsAt + 15_000,
    };
    const merged = mergeFetchedAuctionDetail(cachedDetail, fetched);
    expect(merged.endsAt).toBe(endsAt + 15_000);
    expect(merged.currentBid).toBe(cachedDetail.currentBid);
  });
});
