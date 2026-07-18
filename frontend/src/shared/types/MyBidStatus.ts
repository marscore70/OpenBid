export const MyBidStatus = {
  Winning: "winning",
  Outbid: "outbid",
  Won: "won",
  Lost: "lost",
  /** Auction missing from catalog after a list refresh (e.g. server reset). */
  Stale: "stale",
} as const;

export type MyBidStatus = (typeof MyBidStatus)[keyof typeof MyBidStatus];
