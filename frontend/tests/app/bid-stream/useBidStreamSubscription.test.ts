import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { SseConnectionStatus } from "../../../src/shared/types/SseConnectionStatus";
import { useBidStreamSubscription } from "../../../src/app/bid-stream/useBidStreamSubscription";

type StatusListener = (status: SseConnectionStatus) => void;

const statusListeners: StatusListener[] = [];
const start = vi.fn();
const stop = vi.fn();
const subscribe = vi.fn(() => () => {});
const onStatus = vi.fn((listener: StatusListener) => {
  statusListeners.push(listener);
  return () => {
    const index = statusListeners.indexOf(listener);
    if (index >= 0) {
      statusListeners.splice(index, 1);
    }
  };
});

vi.mock("../../../src/infrastructure/sse/bidStreamService", () => ({
  bidStreamService: {
    onStatus: (listener: StatusListener) => onStatus(listener),
    subscribe: () => subscribe(),
    start: () => start(),
    stop: () => stop(),
  },
}));

const reconcileAfterReconnect = vi.fn();
vi.mock("../../../src/app/bid-stream/reconcileAfterReconnect", () => ({
  reconcileAfterReconnect: () => reconcileAfterReconnect(),
}));

function emitStatus(status: SseConnectionStatus): void {
  statusListeners.forEach((listener) => listener(status));
}

describe("useBidStreamSubscription reconcile decision", () => {
  beforeEach(() => {
    statusListeners.length = 0;
    start.mockClear();
    stop.mockClear();
    subscribe.mockClear();
    onStatus.mockClear();
    reconcileAfterReconnect.mockClear();
  });

  it("does not reconcile on the first Connected (cold start)", () => {
    renderHook(() => useBidStreamSubscription());

    emitStatus(SseConnectionStatus.Connected);

    expect(reconcileAfterReconnect).not.toHaveBeenCalled();
  });

  it("reconciles exactly once after Connected -> Reconnecting -> Connected", () => {
    renderHook(() => useBidStreamSubscription());

    emitStatus(SseConnectionStatus.Connected);
    emitStatus(SseConnectionStatus.Reconnecting);
    emitStatus(SseConnectionStatus.Connected);

    expect(reconcileAfterReconnect).toHaveBeenCalledTimes(1);
  });

  it("reconciles again after a second real reconnect (Connected -> Reconnecting -> Connected twice)", () => {
    renderHook(() => useBidStreamSubscription());

    emitStatus(SseConnectionStatus.Connected);
    emitStatus(SseConnectionStatus.Reconnecting);
    emitStatus(SseConnectionStatus.Connected);
    emitStatus(SseConnectionStatus.Reconnecting);
    emitStatus(SseConnectionStatus.Connected);

    expect(reconcileAfterReconnect).toHaveBeenCalledTimes(2);
  });

  it("starts the stream on mount and stops it on unmount", () => {
    const { unmount } = renderHook(() => useBidStreamSubscription());
    expect(start).toHaveBeenCalledTimes(1);

    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
