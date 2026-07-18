import type { AuctionEndedEvent } from "../../shared/types/AuctionEndedEvent";
import {
  mergeAuctionEndedIntoDetail,
  mergeAuctionEndedIntoSummary,
} from "../../domain/auction/mergeAuctionEnded";
import { updateAuctionSummaryInList } from "../../state/auctionsListAtom";
import { updateLoadedAuctionDetail } from "../../state/auctionDetailAtom";
import { displayTimingRegistry } from "./bidStreamRegistries";

/** Patches matching list/detail atoms when an auction ends. */
export function applyAuctionEndedEvent(payload: AuctionEndedEvent): void {
  // Always clear timing even if the auction is not in list/detail caches (#29).
  displayTimingRegistry.clear(payload.auctionId);

  updateAuctionSummaryInList(payload.auctionId, (auction) =>
    mergeAuctionEndedIntoSummary(auction, payload, displayTimingRegistry),
  );

  updateLoadedAuctionDetail(payload.auctionId, (detail) =>
    mergeAuctionEndedIntoDetail(detail, payload, displayTimingRegistry),
  );
}
