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

/**
 * Facade over stream atoms + module registries/notifier.
 * Prefer this in UI; BidStreamProvider only starts the SSE subscription.
 */
export function useBidStream(): BidStreamApi {
  const connectionStatus = useAtomValue(connectionStatusAtom);
  const timingVersion = useAtomValue(timingVersionAtom);

  return {
    connectionStatus,
    timingVersion,
    getDisplayTiming,
    clearDisplayTiming,
    enableNotificationSound: outbidNotifier.enableSound,
    retryConnection: () => bidStreamService.start(),
  };
}
