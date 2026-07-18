import { isSameBidderIdentity } from "./sanitizeBidderName";

/** Blocks the current leader from raising their own bid in this authless UI. */
export function isSelfOutbidAttempt(
  currentBidder: string | null,
  bidder: string,
): boolean {
  return isSameBidderIdentity(currentBidder, bidder);
}
