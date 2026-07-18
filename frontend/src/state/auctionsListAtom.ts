import { atom } from "jotai";
import { auctionsService } from "../infrastructure/api/auctionsService";
import type { AuctionSummary } from "../shared/types/AuctionSummary";
import { mergeFetchedAuctionSummary } from "../domain/auction/mergeFetchedAuctionSnapshot";
import { shouldClearMyBidsAfterListReconcile } from "../features/my-bids/shouldClearMyBidsAfterListReconcile";
import { clearMyBids, loadMyBids } from "../shared/storage/bidderStorage";
import { logger } from "../shared/logging/logger";
import { toSafeErrorMessage } from "../shared/errors/toSafeErrorMessage";
import { createRequestGenerationGuard } from "./RequestGenerationGuard";
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

/** Single logical resource, but keyed to reuse the generic generation guard. */
const LIST_GENERATION_KEY = "auctions-list";
const listGenerationGuard =
  createRequestGenerationGuard<typeof LIST_GENERATION_KEY>();

function mergeFetchedAuctionsList(
  cached: readonly AuctionSummary[],
  fetched: readonly AuctionSummary[],
): AuctionSummary[] {
  const cachedById = new Map(
    cached.map((auction) => [auction.id, auction] as const),
  );
  return fetched.map((auction) =>
    mergeFetchedAuctionSummary(cachedById.get(auction.id), auction),
  );
}

export async function fetchAuctionsList(): Promise<void> {
  const current = readAuctionsList();
  // Synchronous idle/in-flight guard: sibling StrictMode effects and dual
  // callers that both saw Idle must not start a second network request.
  if (current.status === LoadStatus.Loading) {
    return;
  }
  const generation = listGenerationGuard.next(LIST_GENERATION_KEY);
  writeAuctionsList({
    ...current,
    status: LoadStatus.Loading,
    errorMessage: "",
  });

  try {
    const fetched = await auctionsService.getAll();
    if (!listGenerationGuard.isLatest(LIST_GENERATION_KEY, generation)) {
      logger.debug("Discarding superseded auctions list response");
      return;
    }
    // Reset signal uses the raw validated list only - before monotonic merge
    // could retain a higher client `currentBid` and hide a server restart.
    if (shouldClearMyBidsAfterListReconcile(loadMyBids(), fetched)) {
      clearMyBids();
    }
    const latest = readAuctionsList();
    writeAuctionsList({
      data: mergeFetchedAuctionsList(latest.data, fetched),
      status: LoadStatus.Success,
      errorMessage: "",
    });
  } catch (error) {
    if (!listGenerationGuard.isLatest(LIST_GENERATION_KEY, generation)) {
      logger.debug("Discarding superseded auctions list error");
      return;
    }
    const message = toSafeErrorMessage(error);
    logger.error("Failed to fetch auctions list", { error: String(error) });
    // Keep showing already-loaded data on a background refetch failure
    // instead of replacing it with a full-page error (only surface Error
    // status when there is nothing to show yet).
    const latest = readAuctionsList();
    writeAuctionsList({
      data: latest.data,
      status: latest.data.length > 0 ? LoadStatus.Success : LoadStatus.Error,
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
    return auctionId;
  }
  return lookup.title;
}
