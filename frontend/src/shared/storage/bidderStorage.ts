import { atom } from "jotai";
import { z } from "zod";
import { logger } from "../logging/logger";
import {
  networkBidderSchema,
  MAX_BIDDER_LENGTH,
} from "../../domain/bid/sanitizeBidderName";
import { auctionStore } from "../../state/auctionStore";

const USERNAME_KEY = "bidblitz.bidder";
const MY_BIDS_KEY = "bidblitz.myBids";

const storedMyBidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.number().finite().positive(),
  timestamp: z.number().finite(),
});

export type StoredMyBid = z.infer<typeof storedMyBidSchema>;

/** Bumped on bidder/my-bids writes so React subscribers can re-read storage. */
export const bidderStorageVersionAtom = atom(0);

function bumpBidderStorageVersion(): void {
  const current = auctionStore.get(bidderStorageVersionAtom);
  auctionStore.set(bidderStorageVersionAtom, current + 1);
}

export function loadBidderName(): string {
  try {
    const raw = localStorage.getItem(USERNAME_KEY);
    if (raw === null) {
      return "";
    }
    const parsed = networkBidderSchema.safeParse(raw);
    if (!parsed.success) {
      return "";
    }
    return parsed.data.slice(0, MAX_BIDDER_LENGTH);
  } catch {
    return "";
  }
}

export function saveBidderName(name: string): void {
  try {
    localStorage.setItem(USERNAME_KEY, name);
    bumpBidderStorageVersion();
  } catch (error) {
    logger.warn("localStorage write failed", {
      key: USERNAME_KEY,
      error: String(error),
    });
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
    logger.warn("Dropped invalid stored bid entries", {
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
    bumpBidderStorageVersion();
  } catch (error) {
    logger.warn("localStorage write failed", {
      key: MY_BIDS_KEY,
      error: String(error),
    });
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
    bumpBidderStorageVersion();
  } catch (error) {
    logger.warn("localStorage remove failed", {
      key: MY_BIDS_KEY,
      error: String(error),
    });
  }
}
