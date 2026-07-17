import { describe, expect, it } from 'vitest';
import {
  mergeAuctionEndedIntoSummary,
  mergeNewBidIntoSummary,
} from '../../../src/domain/auction/mergeAuctionState';
import type { AuctionSummary } from '../../../src/shared/types/AuctionSummary';

const baseAuction: AuctionSummary = {
  id: 'a1',
  title: 'Test',
  image: '🎮',
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: Date.now() + 60_000,
  status: 'active',
  bidCount: 0,
};

describe('mergeAuctionState', () => {
  it('merges new_bid when amount increases', () => {
    const seen = new Set<string>();
    const timing = new Map();
    const merged = mergeNewBidIntoSummary(
      baseAuction,
      {
        auctionId: 'a1',
        bidder: 'Ron',
        amount: 110,
        previousBid: 100,
        timestamp: Date.now(),
        bid_id: 'bid_x',
      },
      seen,
      timing,
    );
    expect(merged?.currentBid).toBe(110);
    expect(merged?.bidCount).toBe(1);
  });

  it('merges auction_ended into ended summary with winner', () => {
    const timing = new Map();
    const merged = mergeAuctionEndedIntoSummary(
      { ...baseAuction, currentBid: 150, currentBidder: 'Noa' },
      {
        auctionId: 'a1',
        title: 'Test',
        winner: 'Noa',
        finalPrice: 150,
        timestamp: Date.now(),
      },
      timing,
    );
    expect(merged?.status).toBe('ended');
    expect(merged?.currentBidder).toBe('Noa');
  });
});
