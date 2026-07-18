export type NewBidEvent = {
  auctionId: string;
  bidder: string;
  amount: number;
  previousBid: number;
  timestamp: number;
  bid_id: string;
  /** Authoritative deadline from the backend, including any stacked snipe extension. */
  endsAt: number;
};
