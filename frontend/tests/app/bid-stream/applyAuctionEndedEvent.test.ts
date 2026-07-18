import { beforeEach, describe, expect, it } from "vitest";
import { applyAuctionEndedEvent } from "../../../src/app/bid-stream/applyAuctionEndedEvent";
import {
  clearDisplayTiming,
  getDisplayTiming,
} from "../../../src/app/bid-stream/bidStreamAtoms";
import { auctionStore } from "../../../src/state/auctionStore";
import { timingVersionAtom } from "../../../src/app/bid-stream/bidStreamAtoms";
import { displayTimingRegistry } from "../../../src/app/bid-stream/bidStreamRegistries";

describe("applyAuctionEndedEvent timing", () => {
  beforeEach(() => {
    clearDisplayTiming("a1");
    auctionStore.set(timingVersionAtom, 0);
  });

  it("bumps timingVersion when clearing display timing for an ended auction", () => {
    displayTimingRegistry.get("a1", Date.now() + 60_000);
    const before = auctionStore.get(timingVersionAtom);

    applyAuctionEndedEvent({
      auctionId: "a1",
      title: "Test",
      winner: "Noa",
      finalPrice: 150,
      timestamp: Date.now(),
    });

    expect(auctionStore.get(timingVersionAtom)).toBe(before + 1);
    // Cleared entry falls back to serverEndsAt with no sticky extension.
    const timing = getDisplayTiming("a1", 1_700_000_000_000);
    expect(timing.snipeExtended).toBe(false);
    expect(timing.displayEndsAt).toBe(1_700_000_000_000);
  });
});
