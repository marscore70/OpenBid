/**
 * Monotonic high-bid update after a 400 "outbid during delay" rejection.
 * Never rolls the cached currentBid backward below an SSE-advanced value.
 */
export function nextCurrentBidAfterOutbidRejection(
  cachedCurrentBid: number,
  rejectedBodyCurrentBid: number,
): number {
  return Math.max(cachedCurrentBid, rejectedBodyCurrentBid);
}
