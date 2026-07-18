import type { MyBidStatus } from "../../shared/types/MyBidStatus";

export type MyBidEntry = {
  auctionId: string;
  title: string;
  image: string;
  status: MyBidStatus;
  currentBid: number;
  myLastBid: number;
};
