export const MyBidStatus = {
  Winning: 'winning',
  Outbid: 'outbid',
  Won: 'won',
  Lost: 'lost',
  Active: 'active',
} as const;

export type MyBidStatus = (typeof MyBidStatus)[keyof typeof MyBidStatus];
