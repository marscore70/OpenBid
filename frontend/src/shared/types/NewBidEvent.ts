export type NewBidEvent = {
  auctionId: string;
  bidder: string;
  amount: number;
  previousBid: number;
  timestamp: number;
  bid_id: string;
};
