import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { StoredMyBid } from "../../shared/storage/bidderStorage";

/**
 * Server-reset signal for My Bids: every tracked bid still maps to an auction
 * in the freshly fetched list, yet every stored amount is strictly above that
 * auction's server `currentBid` (impossible after a normal session — typical
 * after an in-memory mock restart that reused the same auction ids).
 *
 * Callers must pass the raw validated GET /api/auctions payload, not the
 * monotonic-merged cache, so retained higher client bids cannot suppress clear.
 */
export function shouldClearMyBidsAfterListReconcile(
  stored: readonly StoredMyBid[],
  auctions: readonly AuctionSummary[],
): boolean {
  if (stored.length === 0) {
    return false;
  }

  const currentBidById = new Map(
    auctions.map((auction) => [auction.id, auction.currentBid] as const),
  );

  for (const bid of stored) {
    const serverCurrentBid = currentBidById.get(bid.auctionId);
    if (serverCurrentBid === undefined) {
      return false;
    }
    if (bid.amount <= serverCurrentBid) {
      return false;
    }
  }

  return true;
}
