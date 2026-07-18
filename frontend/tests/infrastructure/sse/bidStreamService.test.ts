import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BidStreamService } from "../../../src/infrastructure/sse/bidStreamService";
import { SseConnectionStatus } from "../../../src/shared/types/SseConnectionStatus";

type Listener = () => void;

/** Minimal controllable EventSource stand-in (jsdom has no native EventSource). */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  onerror: (() => void) | null = null;
  private openListeners: Listener[] = [];

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    if (type === "open") {
      this.openListeners.push(listener);
    }
  }

  close(): void {
    this.closed = true;
  }

  emitOpen(): void {
    this.openListeners.forEach((listener) => listener());
  }

  emitError(): void {
    this.onerror?.();
  }
}

function latestSource(): FakeEventSource {
  const source = FakeEventSource.instances.at(-1);
  if (!source) {
    throw new Error("No FakeEventSource instance was created");
  }
  return source;
}

describe("BidStreamService connection status", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("emits nothing before open on cold start, then Connected exactly once from the real open event", () => {
    const service = new BidStreamService();
    const statuses: SseConnectionStatus[] = [];
    service.onStatus((status) => statuses.push(status));

    service.start();
    expect(statuses).toEqual([]);

    latestSource().emitOpen();
    expect(statuses).toEqual([SseConnectionStatus.Connected]);
  });

  it("reports Connected only twice across a real reconnect (fixes the cold-start false-reconcile double emission)", () => {
    const service = new BidStreamService();
    const statuses: SseConnectionStatus[] = [];
    service.onStatus((status) => statuses.push(status));

    service.start();
    latestSource().emitOpen();
    expect(statuses).toEqual([SseConnectionStatus.Connected]);

    latestSource().emitError();
    vi.runOnlyPendingTimers();
    latestSource().emitOpen();

    const connectedCount = statuses.filter(
      (status) => status === SseConnectionStatus.Connected,
    ).length;
    expect(connectedCount).toBe(2);
    expect(statuses.at(-1)).toBe(SseConnectionStatus.Connected);
    expect(statuses).toContain(SseConnectionStatus.Reconnecting);
  });

  it("gives up and reports Disconnected after exhausting reconnect attempts, without scheduling further retries", () => {
    const service = new BidStreamService();
    const statuses: SseConnectionStatus[] = [];
    service.onStatus((status) => statuses.push(status));

    service.start();
    latestSource().emitOpen();

    for (let attempt = 0; attempt < 9; attempt += 1) {
      latestSource().emitError();
      vi.runOnlyPendingTimers();
    }

    expect(statuses.at(-1)).toBe(SseConnectionStatus.Disconnected);
    expect(vi.getTimerCount()).toBe(0);

    const instanceCountAtGiveUp = FakeEventSource.instances.length;
    vi.runOnlyPendingTimers();
    expect(FakeEventSource.instances.length).toBe(instanceCountAtGiveUp);
  });

  it("reports Disconnected without scheduling a reconnect after an intentional stop", () => {
    const service = new BidStreamService();
    const statuses: SseConnectionStatus[] = [];
    service.onStatus((status) => statuses.push(status));

    service.start();
    latestSource().emitOpen();
    service.stop();

    expect(statuses.at(-1)).toBe(SseConnectionStatus.Disconnected);
    expect(vi.getTimerCount()).toBe(0);
  });
});
