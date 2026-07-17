import { atom } from "jotai";
import { auctionsService } from "../infrastructure/api/auctionsService";
import type { AuctionSummary } from "../shared/types/AuctionSummary";
import { logger } from "../shared/logging/logger";
import { auctionStore } from "./auctionStore";
import { LoadStatus } from "./LoadStatus";

export type AuctionsListState = {
  data: readonly AuctionSummary[];
  status: LoadStatus;
  errorMessage: string;
};

const initialListState: AuctionsListState = {
  data: [],
  status: LoadStatus.Idle,
  errorMessage: "",
};

export const auctionsListAtom = atom<AuctionsListState>(initialListState);

export function readAuctionsList(): AuctionsListState {
  return auctionStore.get(auctionsListAtom);
}

export function writeAuctionsList(next: AuctionsListState): void {
  auctionStore.set(auctionsListAtom, next);
}

export function patchAuctionsList(
  patch: (current: AuctionsListState) => AuctionsListState,
): void {
  writeAuctionsList(patch(readAuctionsList()));
}

export async function fetchAuctionsList(): Promise<void> {
  const current = readAuctionsList();
  writeAuctionsList({
    ...current,
    status: LoadStatus.Loading,
    errorMessage: "",
  });

  try {
    const data = await auctionsService.getAll();
    writeAuctionsList({
      data,
      status: LoadStatus.Success,
      errorMessage: "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load auctions";
    logger.error("Failed to fetch auctions list", { error: String(error) });
    writeAuctionsList({
      data: current.data,
      status: LoadStatus.Error,
      errorMessage: message,
    });
  }
}

export function updateAuctionSummaryInList(
  auctionId: string,
  updater: (auction: AuctionSummary) => AuctionSummary,
): void {
  patchAuctionsList((current) => {
    if (current.data.length === 0) {
      return current;
    }
    return {
      ...current,
      data: current.data.map((auction) =>
        auction.id === auctionId ? updater(auction) : auction,
      ),
    };
  });
}

export function lookupAuctionTitle(auctionId: string): {
  found: boolean;
  title: string;
} {
  const match = readAuctionsList().data.find(
    (auction) => auction.id === auctionId,
  );
  if (!match) {
    return { found: false, title: "" };
  }
  return { found: true, title: match.title };
}

export function findAuctionTitleInList(auctionId: string): string {
  const lookup = lookupAuctionTitle(auctionId);
  if (!lookup.found) {
    return "Auction";
  }
  return lookup.title;
}
