export type DisplayTiming = Readonly<{
  displayEndsAt: number;
  snipeExtended: boolean;
}>;

/** Read/write access to per-auction display timing without exposing the backing Map. */
export type DisplayTimingRegistry = Readonly<{
  get: (auctionId: string, serverEndsAt: number) => DisplayTiming;
  set: (auctionId: string, timing: DisplayTiming) => void;
  clear: (auctionId: string) => void;
}>;

export function createDefaultDisplayTiming(
  serverEndsAt: number,
): DisplayTiming {
  return Object.freeze({
    displayEndsAt: serverEndsAt,
    snipeExtended: false,
  });
}

export function createDisplayTimingRegistry(): DisplayTimingRegistry {
  const timings = new Map<string, DisplayTiming>();
  return {
    get: (auctionId, serverEndsAt) => {
      const stored = timings.get(auctionId);
      if (stored) {
        return stored;
      }
      return createDefaultDisplayTiming(serverEndsAt);
    },
    set: (auctionId, timing) => {
      timings.set(
        auctionId,
        Object.freeze({
          displayEndsAt: timing.displayEndsAt,
          snipeExtended: timing.snipeExtended,
        }),
      );
    },
    clear: (auctionId) => {
      timings.delete(auctionId);
    },
  };
}
