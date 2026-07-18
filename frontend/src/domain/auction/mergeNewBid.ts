import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import type { DisplayTimingRegistry } from "./DisplayTiming";
import type { MergeNewBidResult } from "./MergeNewBidResult";
import { applySnipeDisplayTimingOnBid } from "./applySnipeDisplayTimingOnBid";
import { unionBidHistory } from "./unionBidHistory";

export function mergeNewBidIntoSummary(
  auction: AuctionSummary,
  event: NewBidEvent,
  timingRegistry: DisplayTimingRegistry,
): MergeNewBidResult<AuctionSummary> {
  if (event.auctionId !== auction.id) {
    return { auction, applied: false };
  }
  // QUIRK 4: a late new_bid after auction_ended must not rewrite the winner.
  if (auction.status === AuctionStatus.Ended) {
    return { auction, applied: false };
  }
  // Strictly lower amounts are out-of-order and must not roll state back.
  if (event.amount < auction.currentBid) {
    return { auction, applied: false };
  }

  const amountAdvanced = event.amount > auction.currentBid;
  // Equal amount: HTTP/400 may already have raised currentBid; still adopt
  // authoritative endsAt, bidder, and (for detail) history from SSE.
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
      bidCount: amountAdvanced ? auction.bidCount + 1 : auction.bidCount,
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
  if (auction.status === AuctionStatus.Ended) {
    return { auction, applied: false };
  }
  if (event.amount < auction.currentBid) {
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

  const bidHistory = unionBidHistory(auction.bidHistory, [entry]);

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
