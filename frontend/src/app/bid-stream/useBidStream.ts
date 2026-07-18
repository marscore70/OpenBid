import { useAtomValue } from "jotai";
import type { DisplayTiming } from "../../domain/auction/DisplayTiming";
import { outbidNotifier } from "../../features/notifications/outbidNotifier";
import { bidStreamService } from "../../infrastructure/sse/bidStreamService";
import type { SseConnectionStatus } from "../../shared/types/SseConnectionStatus";
import {
  clearDisplayTiming,
  connectionStatusAtom,
  getDisplayTiming,
  timingVersionAtom,
} from "./bidStreamAtoms";

export type BidStreamApi = {
  connectionStatus: SseConnectionStatus;
  timingVersion: number;
  getDisplayTiming: (auctionId: string, serverEndsAt: number) => DisplayTiming;
  clearDisplayTiming: (auctionId: string) => void;
  enableNotificationSound: () => void;
  /** Manually restarts the SSE connection after a permanent give-up (`Disconnected` with no scheduled retry). */
  retryConnection: () => void;
};

/** Subscribes only to connection status — use for header badge / retry. */
export function useBidStreamConnectionStatus(): SseConnectionStatus {
  return useAtomValue(connectionStatusAtom);
}

/** Subscribes only to snipe/timing bumps — use for countdown consumers. */
export function useBidStreamTimingVersion(): number {
  return useAtomValue(timingVersionAtom);
}

export { getDisplayTiming, clearDisplayTiming };

export function enableNotificationSound(): void {
  outbidNotifier.enableSound();
}

export function retryBidStreamConnection(): void {
  bidStreamService.start();
}

/**
 * Facade over stream atoms + module registries/notifier.
 * Prefer focused hooks (`useBidStreamConnectionStatus` / `useBidStreamTimingVersion`)
 * when you do not need both subscriptions.
 */
export function useBidStream(): BidStreamApi {
  const connectionStatus = useBidStreamConnectionStatus();
  const timingVersion = useBidStreamTimingVersion();

  return {
    connectionStatus,
    timingVersion,
    getDisplayTiming,
    clearDisplayTiming,
    enableNotificationSound,
    retryConnection: retryBidStreamConnection,
  };
}
