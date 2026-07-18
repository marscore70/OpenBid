export type AuctionEndedEvent = {
  auctionId: string;
  title: string;
  winner: string | null;
  finalPrice: number;
  timestamp: number;
};
