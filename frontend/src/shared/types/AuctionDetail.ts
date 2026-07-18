import type { AuctionStatus } from "./AuctionStatus";
import type { BidHistoryEntry } from "./BidHistoryEntry";

export type AuctionDetail = {
  id: string;
  title: string;
  image: string;
  startPrice: number;
  currentBid: number;
  currentBidder: string | null;
  endsAt: number;
  status: AuctionStatus;
  bidHistory: BidHistoryEntry[];
};
