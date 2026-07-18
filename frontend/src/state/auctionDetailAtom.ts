import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { auctionsService } from "../infrastructure/api/auctionsService";
import type { AuctionDetail } from "../shared/types/AuctionDetail";
import { mergeFetchedAuctionDetail } from "../domain/auction/mergeFetchedAuctionSnapshot";
import { logger } from "../shared/logging/logger";
import { toSafeErrorMessage } from "../shared/errors/toSafeErrorMessage";
import { createRequestGenerationGuard } from "./RequestGenerationGuard";
import { auctionStore } from "./auctionStore";
import { LoadStatus } from "./LoadStatus";

export type AuctionDetailState = {
  data: AuctionDetail | null;
  status: LoadStatus;
  errorMessage: string;
};

function createInitialDetailState(): AuctionDetailState {
  return {
    data: null,
    status: LoadStatus.Idle,
    errorMessage: "",
  };
}

export const auctionDetailAtomFamily = atomFamily((_auctionId: string) =>
  atom<AuctionDetailState>(createInitialDetailState()),
);

const trackedAuctionDetailIdsAtom = atom<readonly string[]>([]);

const MAX_TRACKED_DETAIL_IDS = 20;

/** Keyed per auction id so concurrent fetches for different auctions never block each other. */
const detailGenerationGuard = createRequestGenerationGuard<string>();

function isAuctionDetailTracked(auctionId: string): boolean {
  return auctionStore.get(trackedAuctionDetailIdsAtom).includes(auctionId);
}

function invalidateAuctionDetailRequests(auctionId: string): void {
  // Bump generation so an in-flight fetch cannot pass isLatest and recreate
  // the family atom after remove (untrack / eviction resurrection race).
  detailGenerationGuard.next(auctionId);
}

export function trackAuctionDetailId(auctionId: string): void {
  if (!auctionId) {
    return;
  }
  const current = auctionStore.get(trackedAuctionDetailIdsAtom);
  if (current.includes(auctionId)) {
    return;
  }
  const next = [...current, auctionId];
  // Cap reconnect herd: drop oldest tracked ids (and their family atoms).
  while (next.length > MAX_TRACKED_DETAIL_IDS) {
    const evicted = next.shift();
    if (evicted) {
      invalidateAuctionDetailRequests(evicted);
      auctionDetailAtomFamily.remove(evicted);
    }
  }
  auctionStore.set(trackedAuctionDetailIdsAtom, next);
}

/** Stops reconnect refetch for a detail page that unmounted. */
export function untrackAuctionDetailId(auctionId: string): void {
  if (!auctionId) {
    return;
  }
  const current = auctionStore.get(trackedAuctionDetailIdsAtom);
  if (!current.includes(auctionId)) {
    return;
  }
  invalidateAuctionDetailRequests(auctionId);
  auctionStore.set(
    trackedAuctionDetailIdsAtom,
    current.filter((id) => id !== auctionId),
  );
  auctionDetailAtomFamily.remove(auctionId);
}

export function listTrackedAuctionDetailIds(): readonly string[] {
  return auctionStore.get(trackedAuctionDetailIdsAtom);
}

export function readAuctionDetail(auctionId: string): AuctionDetailState {
  return auctionStore.get(auctionDetailAtomFamily(auctionId));
}

export function writeAuctionDetail(
  auctionId: string,
  next: AuctionDetailState,
): void {
  auctionStore.set(auctionDetailAtomFamily(auctionId), next);
}

export function patchAuctionDetail(
  auctionId: string,
  patch: (current: AuctionDetailState) => AuctionDetailState,
): void {
  writeAuctionDetail(auctionId, patch(readAuctionDetail(auctionId)));
}

function canCommitAuctionDetail(
  auctionId: string,
  generation: number,
): boolean {
  if (!detailGenerationGuard.isLatest(auctionId, generation)) {
    return false;
  }
  // Untrack removes membership + atom; refuse to recreate an orphan Success.
  return isAuctionDetailTracked(auctionId);
}

export async function fetchAuctionDetail(auctionId: string): Promise<void> {
  trackAuctionDetailId(auctionId);
  const generation = detailGenerationGuard.next(auctionId);
  const current = readAuctionDetail(auctionId);
  writeAuctionDetail(auctionId, {
    ...current,
    status: LoadStatus.Loading,
    errorMessage: "",
  });

  try {
    const fetched = await auctionsService.getById(auctionId);
    if (!canCommitAuctionDetail(auctionId, generation)) {
      logger.debug("Discarding superseded auction detail response", {
        auctionId,
      });
      return;
    }
    const latest = readAuctionDetail(auctionId);
    writeAuctionDetail(auctionId, {
      data: mergeFetchedAuctionDetail(latest.data, fetched),
      status: LoadStatus.Success,
      errorMessage: "",
    });
  } catch (error) {
    if (!canCommitAuctionDetail(auctionId, generation)) {
      logger.debug("Discarding superseded auction detail error", {
        auctionId,
      });
      return;
    }
    const message = toSafeErrorMessage(error);
    logger.error("Failed to fetch auction detail", {
      auctionId,
      error: String(error),
    });
    // Keep the already-loaded auction visible on a background refetch
    // failure instead of replacing it with a full-page error.
    const latest = readAuctionDetail(auctionId);
    writeAuctionDetail(auctionId, {
      data: latest.data,
      status: latest.data ? LoadStatus.Success : LoadStatus.Error,
      errorMessage: message,
    });
  }
}

export function updateLoadedAuctionDetail(
  auctionId: string,
  updater: (auction: AuctionDetail) => AuctionDetail,
): void {
  patchAuctionDetail(auctionId, (current) => {
    if (!current.data) {
      return current;
    }
    return {
      ...current,
      data: updater(current.data),
    };
  });
}
