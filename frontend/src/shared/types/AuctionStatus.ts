export const AuctionStatus = {
  Active: "active",
  Ended: "ended",
} as const;

export type AuctionStatus = (typeof AuctionStatus)[keyof typeof AuctionStatus];
