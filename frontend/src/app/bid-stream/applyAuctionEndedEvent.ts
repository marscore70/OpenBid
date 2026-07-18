import type { AuctionEndedEvent } from "../../shared/types/AuctionEndedEvent";
import {
  mergeAuctionEndedIntoDetail,
  mergeAuctionEndedIntoSummary,
} from "../../domain/auction/mergeAuctionEnded";
import { updateAuctionSummaryInList } from "../../state/auctionsListAtom";
import { updateLoadedAuctionDetail } from "../../state/auctionDetailAtom";
import { clearDisplayTiming } from "./bidStreamAtoms";
import { displayTimingRegistry } from "./bidStreamRegistries";

/** Patches matching list/detail atoms when an auction ends. */
export function applyAuctionEndedEvent(payload: AuctionEndedEvent): void {
  // Always clear + bump timing even if the auction is not in list/detail caches.
  clearDisplayTiming(payload.auctionId);

  updateAuctionSummaryInList(payload.auctionId, (auction) =>
    mergeAuctionEndedIntoSummary(auction, payload, displayTimingRegistry),
  );

  updateLoadedAuctionDetail(payload.auctionId, (detail) =>
    mergeAuctionEndedIntoDetail(detail, payload, displayTimingRegistry),
  );
}
