import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { LoadStatus } from "../../state/LoadStatus";
import { loadMyBids } from "../../shared/storage/bidderStorage";
import { deriveMyBidStatus } from "./deriveMyBidStatus";
import type { MyBidEntry } from "./MyBidEntry";

const FALLBACK_TITLE = "Auction";
const FALLBACK_IMAGE = "❓";

/**
 * An auction missing from a list that has not yet loaded successfully just
 * means "not fetched yet", not "removed" — only a `Success` list can prove
 * absence, so judgment is skipped (not marked Stale) until then.
 */
function shouldSkipJudgment(listStatus: LoadStatus, auctionFound: boolean): boolean {
  return listStatus !== LoadStatus.Success && !auctionFound;
}

/** Iterates stored bids once against a single auction-id lookup (was O(n·m)). */
export function collectMyBidEntries(
  listStatus: LoadStatus,
  auctions: readonly AuctionSummary[],
  username: string,
): MyBidEntry[] {
  const auctionById = new Map(
    auctions.map((auction) => [auction.id, auction] as const),
  );

  const entries: MyBidEntry[] = [];
  for (const stored of loadMyBids()) {
    const auction = auctionById.get(stored.auctionId);
    if (shouldSkipJudgment(listStatus, Boolean(auction))) {
      continue;
    }
    entries.push({
      auctionId: stored.auctionId,
      title: auction?.title ?? FALLBACK_TITLE,
      image: auction?.image ?? FALLBACK_IMAGE,
      status: deriveMyBidStatus({
        auction,
        username,
        myLastBid: stored.amount,
      }),
      currentBid: auction?.currentBid ?? stored.amount,
      myLastBid: stored.amount,
    });
  }
  return entries;
}
