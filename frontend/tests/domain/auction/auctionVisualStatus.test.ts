import { describe, expect, it } from 'vitest';
import { auctionVisualStatus } from '../../../src/domain/auction/auctionVisualStatus';

describe('auctionVisualStatus', () => {
  it('returns urgent when less than 30 seconds remain', () => {
    const now = 1_000_000;
    expect(auctionVisualStatus('active', now + 20_000, now)).toBe('urgent');
  });

  it('returns active when plenty of time remains', () => {
    const now = 1_000_000;
    expect(auctionVisualStatus('active', now + 120_000, now)).toBe('active');
  });

  it('returns ended when status is ended', () => {
    expect(auctionVisualStatus('ended', Date.now() + 99999, Date.now())).toBe('ended');
  });
});
