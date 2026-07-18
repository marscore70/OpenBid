export const MyBidStatus = {
  Winning: 'winning',
  Outbid: 'outbid',
  Won: 'won',
  Lost: 'lost',
  /** Stored bid no longer matches reality (auction gone, or someone bid past it without SSE catching up). */
  Stale: 'stale',
} as const;

export type MyBidStatus = (typeof MyBidStatus)[keyof typeof MyBidStatus];
