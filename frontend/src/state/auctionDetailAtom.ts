import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { auctionsService } from "../infrastructure/api/auctionsService";
import type { AuctionDetail } from "../shared/types/AuctionDetail";
import { logger } from "../shared/logging/logger";
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

export function trackAuctionDetailId(auctionId: string): void {
  const current = auctionStore.get(trackedAuctionDetailIdsAtom);
  if (current.includes(auctionId)) {
    return;
  }
  auctionStore.set(trackedAuctionDetailIdsAtom, [...current, auctionId]);
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

export async function fetchAuctionDetail(auctionId: string): Promise<void> {
  trackAuctionDetailId(auctionId);
  const current = readAuctionDetail(auctionId);
  writeAuctionDetail(auctionId, {
    ...current,
    status: LoadStatus.Loading,
    errorMessage: "",
  });

  try {
    const data = await auctionsService.getById(auctionId);
    writeAuctionDetail(auctionId, {
      data,
      status: LoadStatus.Success,
      errorMessage: "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load auction";
    logger.error("Failed to fetch auction detail", {
      auctionId,
      error: String(error),
    });
    writeAuctionDetail(auctionId, {
      data: current.data,
      status: LoadStatus.Error,
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
