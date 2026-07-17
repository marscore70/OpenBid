import { atom } from "jotai";
import { SseConnectionStatus } from "../../shared/types/SseConnectionStatus";
import { auctionStore } from "../../state/auctionStore";
import { displayTimingRegistry } from "./bidStreamRegistries";

export const connectionStatusAtom = atom<SseConnectionStatus>(
  SseConnectionStatus.Disconnected,
);

/** Bumped when display timing changes so countdown consumers re-read the registry. */
export const timingVersionAtom = atom(0);

export function setConnectionStatus(status: SseConnectionStatus): void {
  auctionStore.set(connectionStatusAtom, status);
}

export function bumpTimingVersion(): void {
  const current = auctionStore.get(timingVersionAtom);
  auctionStore.set(timingVersionAtom, current + 1);
}

export function clearDisplayTiming(auctionId: string): void {
  displayTimingRegistry.clear(auctionId);
  bumpTimingVersion();
}

export function getDisplayTiming(auctionId: string, serverEndsAt: number) {
  return displayTimingRegistry.get(auctionId, serverEndsAt);
}
