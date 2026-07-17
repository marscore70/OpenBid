import { describe, expect, it } from 'vitest';
import { isDuplicateBidId } from '../../../src/domain/auction/dedupeBidEvent';

describe('dedupeBidEvent', () => {
  it('dedupes same bid_id', () => {
    const seen = new Set<string>();
    expect(isDuplicateBidId(seen, 'bid_1')).toBe(false);
    expect(isDuplicateBidId(seen, 'bid_1')).toBe(true);
  });
});
