import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import type { DisplayTimingRegistry } from "./DisplayTiming";
import type { MergeNewBidResult } from "./MergeNewBidResult";
import { applySnipeDisplayTimingOnBid } from "./applySnipeDisplayTimingOnBid";

export function mergeNewBidIntoSummary(
  auction: AuctionSummary,
  event: NewBidEvent,
  timingRegistry: DisplayTimingRegistry,
): MergeNewBidResult<AuctionSummary> {
  if (event.auctionId !== auction.id) {
    return { auction, applied: false };
  }
  if (event.amount <= auction.currentBid) {
    return { auction, applied: false };
  }

  // The backend is authoritative for endsAt (including stacked snipe
  // extensions). Math.max guards against a reordered/duplicate applied
  // event ever rolling the deadline backward.
  const nextEndsAt = Math.max(auction.endsAt, event.endsAt);

  applySnipeDisplayTimingOnBid({
    auctionId: auction.id,
    previousEndsAt: auction.endsAt,
    nextEndsAt,
    auctionStatus: auction.status,
    timingRegistry,
  });

  return {
    auction: {
      ...auction,
      currentBid: event.amount,
      currentBidder: event.bidder,
      bidCount: auction.bidCount + 1,
      endsAt: nextEndsAt,
    },
    applied: true,
  };
}

export function mergeNewBidIntoDetail(
  auction: AuctionDetail,
  event: NewBidEvent,
  timingRegistry: DisplayTimingRegistry,
): MergeNewBidResult<AuctionDetail> {
  if (event.auctionId !== auction.id) {
    return { auction, applied: false };
  }
  if (event.amount <= auction.currentBid) {
    return { auction, applied: false };
  }

  const nextEndsAt = Math.max(auction.endsAt, event.endsAt);

  applySnipeDisplayTimingOnBid({
    auctionId: auction.id,
    previousEndsAt: auction.endsAt,
    nextEndsAt,
    auctionStatus: auction.status,
    timingRegistry,
  });

  const entry = {
    bidder: event.bidder,
    amount: event.amount,
    timestamp: event.timestamp,
  };

  const bidHistory = [...auction.bidHistory, entry].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  return {
    auction: {
      ...auction,
      currentBid: event.amount,
      currentBidder: event.bidder,
      bidHistory,
      endsAt: nextEndsAt,
    },
    applied: true,
  };
}
