import { z } from 'zod';
import { logger } from '../logging/logger';

const USERNAME_KEY = 'bidblitz.bidder';
const MY_BIDS_KEY = 'bidblitz.myBids';

const storedMyBidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.number().finite().positive(),
  timestamp: z.number().finite(),
});

export type StoredMyBid = z.infer<typeof storedMyBidSchema>;

export function loadBidderName(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveBidderName(name: string): void {
  try {
    localStorage.setItem(USERNAME_KEY, name);
  } catch {
    /* ignore quota errors */
  }
}

export function loadMyBids(): StoredMyBid[] {
  try {
    const raw = localStorage.getItem(MY_BIDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parseStoredMyBids(parsed);
  } catch {
    return [];
  }
}

/** Zod-validates each entry so a corrupted/tampered localStorage value can never reach domain logic. */
function parseStoredMyBids(entries: readonly unknown[]): StoredMyBid[] {
  const valid: StoredMyBid[] = [];
  for (const entry of entries) {
    const result = storedMyBidSchema.safeParse(entry);
    if (result.success) {
      valid.push(result.data);
    }
  }
  if (valid.length !== entries.length) {
    logger.warn('Dropped invalid stored bid entries', {
      total: entries.length,
      valid: valid.length,
    });
  }
  return valid;
}

export function recordMyBid(entry: StoredMyBid): void {
  const existing = loadMyBids().filter((b) => b.auctionId !== entry.auctionId);
  existing.push(entry);
  try {
    localStorage.setItem(MY_BIDS_KEY, JSON.stringify(existing));
  } catch {
    /* ignore */
  }
}

export function getMyLastBid(auctionId: string): number | undefined {
  const found = loadMyBids().find((b) => b.auctionId === auctionId);
  return found?.amount;
}

/** Removes the My Bids key entirely so empty storage stays a no-write path. */
export function clearMyBids(): void {
  try {
    localStorage.removeItem(MY_BIDS_KEY);
  } catch {
    /* ignore quota / private-mode errors */
  }
}
