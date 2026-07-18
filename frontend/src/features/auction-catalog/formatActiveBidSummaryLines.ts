import { ActiveBidPresentationKind } from "../../domain/auction/resolveActiveBidPresentation";
import type { ActiveBidPresentation } from "../../domain/auction/resolveActiveBidPresentation";

/** User-facing copy for catalog/detail bid summary lines. */
export function formatActiveBidSummaryLines(
  presentation: ActiveBidPresentation,
): readonly string[] {
  switch (presentation.kind) {
    case ActiveBidPresentationKind.Opening:
      return [`Bidding starts at $${presentation.startPrice}`];
    case ActiveBidPresentationKind.Led:
      return [
        `Current bid: $${presentation.currentBid}`,
        `Leader: ${presentation.leader}`,
      ];
    case ActiveBidPresentationKind.EndedWithoutBids:
      // Ended no-sale copy lives in resolveEndedAuctionPresentation (yellow banner).
      return [];
  }
}
