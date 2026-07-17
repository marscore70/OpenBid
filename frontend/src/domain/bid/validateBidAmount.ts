export type BidValidationResult =
  | { valid: true; amount: number }
  | { valid: false; message: string };

export function validateBidAmount(
  amount: unknown,
  currentBid: number,
): BidValidationResult {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { valid: false, message: 'Enter a valid bid amount.' };
  }
  const normalized = Math.floor(amount);
  if (normalized <= 0) {
    return { valid: false, message: 'Bid must be a positive amount.' };
  }
  if (normalized <= currentBid) {
    return {
      valid: false,
      message: `Bid must be higher than $${currentBid}.`,
    };
  }
  return { valid: true, amount: normalized };
}
