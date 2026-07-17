import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { featureFlags } from "../../config/features";
import { applySnipeExtensionPolicy } from "../snipe/SnipeExtensionPolicy";
import type { DisplayTimingRegistry } from "./DisplayTiming";

/** Applies snipe display-timing policy for an active auction bid. Returns whether timing changed. */
export function applySnipeDisplayTimingOnBid(params: {
  auctionId: string;
  serverEndsAt: number;
  auctionStatus: AuctionStatus;
  bidTimestamp: number;
  timingRegistry: DisplayTimingRegistry;
}): boolean {
  const {
    auctionId,
    serverEndsAt,
    auctionStatus,
    bidTimestamp,
    timingRegistry,
  } = params;

  if (!featureFlags.snipeProtection || auctionStatus !== AuctionStatus.Active) {
    return false;
  }

  const previous = timingRegistry.get(auctionId, serverEndsAt);
  const beforeEndsAt = previous.displayEndsAt;

  const snipe = applySnipeExtensionPolicy(
    serverEndsAt,
    bidTimestamp,
    previous.displayEndsAt,
  );

  timingRegistry.set(auctionId, {
    displayEndsAt: snipe.displayEndsAt,
    snipeExtended: previous.snipeExtended || snipe.extended,
  });

  return beforeEndsAt !== snipe.displayEndsAt;
}
