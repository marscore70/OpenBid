/**
 * Pure gate: outbid toast only when a merge actually advanced currentBid
 * and the caller already decided the event is an outbid candidate.
 */
export function shouldNotifyOutbidWhenApplied(
  amountApplied: boolean,
  eligibleForOutbidToast: boolean,
): boolean {
  return amountApplied && eligibleForOutbidToast;
}
