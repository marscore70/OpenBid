const MAX_BIDDER_LENGTH = 64;

export function sanitizeBidderName(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_BIDDER_LENGTH);
  return trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
}

export function isBidderNameValid(name: string): boolean {
  return sanitizeBidderName(name).length >= 1;
}
