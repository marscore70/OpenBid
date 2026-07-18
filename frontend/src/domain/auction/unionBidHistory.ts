import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";

function bidHistoryEntryKey(entry: BidHistoryEntry): string {
  return `${entry.bidder}|${entry.amount}|${entry.timestamp}`;
}

/**
 * Unions two bid history lists by (bidder, amount, timestamp) instead of
 * replacing one with the other, so a REST snapshot can never drop entries a
 * live SSE merge already applied (and vice versa). Result is sorted by time.
 */
export function unionBidHistory(
  a: readonly BidHistoryEntry[],
  b: readonly BidHistoryEntry[],
): BidHistoryEntry[] {
  const byKey = new Map<string, BidHistoryEntry>();
  for (const entry of [...a, ...b]) {
    byKey.set(bidHistoryEntryKey(entry), entry);
  }
  return Array.from(byKey.values()).sort((x, y) => x.timestamp - y.timestamp);
}
