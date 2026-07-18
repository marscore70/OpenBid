import { isSameBidderIdentity } from "../bid/sanitizeBidderName";

/**
 * On HTTP 400 outbid, clear the leader only when it is still the rejected
 * bidder. Never wipe a real leader already applied by SSE.
 */
export function nextCurrentBidderAfterOutbidRejection(
  currentBidder: string | null,
  rejectedBidder: string,
): string | null {
  if (isSameBidderIdentity(currentBidder, rejectedBidder)) {
    return null;
  }
  return currentBidder;
}
