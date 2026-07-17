import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import type { MyBidStatus } from '../../shared/types/MyBidStatus';

export type MyBidEntry = {
  auctionId: string;
  title: string;
  image: string;
  status: MyBidStatus;
  currentBid: number;
  myLastBid?: number;
};

export function deriveMyBidStatus(
  auction: AuctionSummary,
  username: string,
  myLastBid: number | undefined,
): MyBidStatus | null {
  if (!myLastBid) {
    return null;
  }
  if (auction.status === 'ended') {
    if (auction.currentBidder === username) {
      return 'won';
    }
    return 'lost';
  }
  if (auction.currentBidder === username) {
    return 'winning';
  }
  if (myLastBid >= auction.currentBid) {
    return 'winning';
  }
  return 'outbid';
}
