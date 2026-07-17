import type { AuctionStatus } from './AuctionStatus';

export type AuctionSummary = {
  id: string;
  title: string;
  image: string;
  startPrice: number;
  currentBid: number;
  currentBidder: string | null;
  endsAt: number;
  status: AuctionStatus;
  bidCount: number;
};
