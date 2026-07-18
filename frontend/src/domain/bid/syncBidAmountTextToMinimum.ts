/**
 * Pure helper: when the live minimum rises, bump a stale amount field up to
 * the new minimum, but never overwrite a user-entered amount that is still
 * at or above that minimum.
 */
export function syncBidAmountTextToMinimum(
  amountText: string,
  minBid: number,
): string {
  const parsed = Number(amountText);
  if (!Number.isFinite(parsed) || parsed < minBid) {
    return String(minBid);
  }
  return amountText;
}
