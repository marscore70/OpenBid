import { sanitizeNetworkText } from "./sanitizeBidderName";

function normalizeBidderIdentity(name: string): string {
  return sanitizeNetworkText(name).toLocaleLowerCase();
}

/** Blocks the current leader from raising their own bid in this authless UI. */
export function isSelfOutbidAttempt(
  currentBidder: string | null,
  bidder: string,
): boolean {
  if (!currentBidder) {
    return false;
  }
  const normalizedBidder = normalizeBidderIdentity(bidder);
  return (
    normalizedBidder.length > 0 &&
    normalizeBidderIdentity(currentBidder) === normalizedBidder
  );
}
