import { describe, expect, it } from 'vitest';
import { validateBidAmount } from '../../../src/domain/bid/validateBidAmount';

describe('validateBidAmount', () => {
  it('rejects bid less than or equal to current bid', () => {
    expect(validateBidAmount(100, 100).valid).toBe(false);
    expect(validateBidAmount(50, 100).valid).toBe(false);
  });

  it('accepts bid above current bid', () => {
    const result = validateBidAmount(101, 100);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.amount).toBe(101);
    }
  });
});
