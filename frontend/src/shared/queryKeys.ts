export const queryKeys = {
  auctions: ['auctions'] as const,
  auctionDetail: (id: string) => ['auction', id] as const,
};
