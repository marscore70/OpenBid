const USERNAME_KEY = 'bidblitz.bidder';
const MY_BIDS_KEY = 'bidblitz.myBids';

export type StoredMyBid = {
  auctionId: string;
  amount: number;
  timestamp: number;
};

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
    const parsed = JSON.parse(raw) as StoredMyBid[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
