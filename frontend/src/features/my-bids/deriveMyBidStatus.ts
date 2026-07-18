import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { MyBidStatus } from "../../shared/types/MyBidStatus";

export type DeriveMyBidStatusInput = {
  /**
   * The matching auction from a successfully loaded list, or `undefined`
   * when it is genuinely absent from that list. Callers must only pass
   * `undefined` once the list has loaded successfully - otherwise "not
   * fetched yet" would be misread as "removed" (see `collectMyBidEntries`).
   */
  auction: AuctionSummary | undefined;
  username: string;
  myLastBid: number;
};

/** Pure rule for a single tracked bid; never returns a "no judgment" value. */
export function deriveMyBidStatus({
  auction,
  username,
  myLastBid,
}: DeriveMyBidStatusInput): MyBidStatus {
  if (!auction) {
    return MyBidStatus.Stale;
  }
  if (auction.status === AuctionStatus.Ended) {
    return auction.currentBidder === username
      ? MyBidStatus.Won
      : MyBidStatus.Lost;
  }
  if (myLastBid > auction.currentBid) {
    return MyBidStatus.Stale;
  }
  // Leadership is decided by currentBidder, never by amount alone: a tie
  // (myLastBid === currentBid) with someone else as currentBidder is still
  // Outbid, not Winning (unlikely with strict-greater-than server bids, but
  // never safe to assume).
  return auction.currentBidder === username
    ? MyBidStatus.Winning
    : MyBidStatus.Outbid;
}
