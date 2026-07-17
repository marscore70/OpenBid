import { useEffect } from "react";
import { bidStreamService } from "../../infrastructure/sse/bidStreamService";
import { SseConnectionStatus } from "../../shared/types/SseConnectionStatus";
import { applySseEventToAuctionAtoms } from "./applySseEventToAuctionAtoms";
import { setConnectionStatus } from "./bidStreamAtoms";
import { reconcileAfterReconnect } from "./reconcileAfterReconnect";

/** Owns SSE lifecycle: connect, status atoms, event routing, teardown. */
export function useBidStreamSubscription(): void {
  useEffect(() => {
    let wasConnected = false;

    const unsubStatus = bidStreamService.onStatus((status) => {
      setConnectionStatus(status);
      if (status === SseConnectionStatus.Connected && wasConnected) {
        reconcileAfterReconnect();
      }
      if (status === SseConnectionStatus.Connected) {
        wasConnected = true;
      }
    });

    const unsubEvents = bidStreamService.subscribe((event) => {
      applySseEventToAuctionAtoms(event);
    });

    bidStreamService.start();
    return () => {
      unsubEvents();
      unsubStatus();
      bidStreamService.stop();
    };
  }, []);
}
