import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { AuctionEndedEvent } from "../../shared/types/AuctionEndedEvent";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import type { DisplayTimingRegistry } from "./DisplayTiming";

export function mergeAuctionEndedIntoSummary(
  auction: AuctionSummary,
  event: AuctionEndedEvent,
  timingRegistry: DisplayTimingRegistry,
): AuctionSummary {
  if (event.auctionId !== auction.id) {
    return auction;
  }
  timingRegistry.clear(auction.id);
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBid: event.finalPrice,
    currentBidder: event.winner,
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
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBid: event.finalPrice,
    currentBidder: event.winner,
  };
}

/** Marks a summary auction as ended from an HTTP 409 conflict body. */
export function applyEndedFromHttpConflict(
  auction: AuctionSummary,
  winner: string | null,
  finalPrice: number,
): AuctionSummary {
  return {
    ...auction,
    status: AuctionStatus.Ended,
    currentBidder: winner,
    currentBid: finalPrice,
  };
}
