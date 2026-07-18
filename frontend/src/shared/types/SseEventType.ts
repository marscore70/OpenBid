export const SseEventType = {
  Connected: "connected",
  NewBid: "new_bid",
  AuctionEnded: "auction_ended",
  Heartbeat: "heartbeat",
  Ignored: "ignored",
} as const;

export type SseEventType = (typeof SseEventType)[keyof typeof SseEventType];
