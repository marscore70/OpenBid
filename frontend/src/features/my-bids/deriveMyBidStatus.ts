import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import { AuctionStatus } from '../../shared/types/AuctionStatus';
import { MyBidStatus } from '../../shared/types/MyBidStatus';

export type MyBidEntry = {
  auctionId: string;
  title: string;
  image: string;
  status: MyBidStatus;
  currentBid: number;
  myLastBid: number;
};

export function deriveMyBidStatus(
  auction: AuctionSummary,
  username: string,
  myLastBid: number,
): MyBidStatus {
  if (auction.status === AuctionStatus.Ended) {
    if (auction.currentBidder === username) {
      return MyBidStatus.Won;
    }
    return MyBidStatus.Lost;
  }
  if (auction.currentBidder === username) {
    return MyBidStatus.Winning;
  }
  if (myLastBid >= auction.currentBid) {
    return MyBidStatus.Winning;
  }
  return MyBidStatus.Outbid;
}
