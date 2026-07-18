import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { AuctionEndedEvent } from "../../shared/types/AuctionEndedEvent";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import type { DisplayTimingRegistry } from "./DisplayTiming";

/**
 * Applies an ended event without ever rolling `currentBid` backward.
 * A stale/malformed `finalPrice` below the cached high bid still marks Ended
 * but keeps the higher cached bid/bidder (sticky-Ended safety).
 */
function resolveEndedBidFields(
  currentBid: number,
  currentBidder: string | null,
  finalPrice: number,
  winner: string | null,
): { currentBid: number; currentBidder: string | null } {
  if (finalPrice < currentBid) {
    return { currentBid, currentBidder };
  }
  return { currentBid: finalPrice, currentBidder: winner };
}

export function mergeAuctionEndedIntoSummary(
  auction: AuctionSummary,
  event: AuctionEndedEvent,
  timingRegistry: DisplayTimingRegistry,
): AuctionSummary {
  if (event.auctionId !== auction.id) {
    return auction;
  }
  timingRegistry.clear(auction.id);
  const ended = resolveEndedBidFields(
    auction.currentBid,
    auction.currentBidder,
    event.finalPrice,
    event.winner,
  );
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBid: ended.currentBid,
    currentBidder: ended.currentBidder,
  };
}

export function mergeAuctionEndedIntoDetail(
  auction: AuctionDetail,
  event: AuctionEndedEvent,
  timingRegistry: DisplayTimingRegistry,
): AuctionDetail {
  if (event.auctionId !== auction.id) {
    return auction;
  }
  timingRegistry.clear(auction.id);
  const ended = resolveEndedBidFields(
    auction.currentBid,
    auction.currentBidder,
    event.finalPrice,
    event.winner,
  );
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBid: ended.currentBid,
    currentBidder: ended.currentBidder,
  };
}

/** Marks a summary auction as ended from an HTTP 409 conflict body. */
export function applyEndedFromHttpConflict(
  auction: AuctionSummary,
  winner: string | null,
  finalPrice: number,
): AuctionSummary {
  const ended = resolveEndedBidFields(
    auction.currentBid,
    auction.currentBidder,
    finalPrice,
    winner,
  );
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBidder: ended.currentBidder,
    currentBid: ended.currentBid,
  };
}
