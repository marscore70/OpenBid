import type { ParsedStreamEvent } from "../../infrastructure/sse/parseSseMessage";
import { SseEventType } from "../../shared/types/SseEventType";
import { applyAuctionEndedEvent } from "./applyAuctionEndedEvent";
import { applyNewBidEvent } from "./applyNewBidEvent";

/**
 * Thin facade: routes SSE events to focused atom apply handlers.
 * Dedupes bid_id once per new_bid so summary and detail share one consume.
 */
export function applySseEventToAuctionAtoms(event: ParsedStreamEvent): void {
  if (event.type === SseEventType.NewBid) {
    applyNewBidEvent(event.payload);
    return;
  }

  if (event.type === SseEventType.AuctionEnded) {
    applyAuctionEndedEvent(event.payload);
  }
}
