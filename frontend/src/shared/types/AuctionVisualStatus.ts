export const AuctionVisualStatus = {
  Active: 'active',
  Urgent: 'urgent',
  Ended: 'ended',
} as const;

export type AuctionVisualStatus =
  (typeof AuctionVisualStatus)[keyof typeof AuctionVisualStatus];
