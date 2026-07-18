import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { featureFlags } from "../../config/features";
import type { DisplayTimingRegistry } from "./DisplayTiming";

/**
 * The backend now owns the actual anti-snipe extension math (see
 * `backend/server.js`'s `applySnipeExtension`, which stacks +15s on
 * `auction.endsAt` for accepted bids in the closing window). The client's
 * only remaining job on an applied bid is to notice that the authoritative
 * `endsAt` increased and set a sticky `snipeExtended` flag for the
 * "Time extended" tag — no client-side arithmetic on the deadline itself,
 * which is what would risk double-extending on top of the server's own
 * stacked extension.
 */
export function applySnipeDisplayTimingOnBid(params: {
  auctionId: string;
  previousEndsAt: number;
  nextEndsAt: number;
  auctionStatus: AuctionStatus;
  timingRegistry: DisplayTimingRegistry;
}): boolean {
  const { auctionId, previousEndsAt, nextEndsAt, auctionStatus, timingRegistry } =
    params;

  if (!featureFlags.snipeProtection || auctionStatus !== AuctionStatus.Active) {
    return false;
  }
  if (nextEndsAt <= previousEndsAt) {
    return false;
  }

  timingRegistry.set(auctionId, {
    displayEndsAt: nextEndsAt,
    snipeExtended: true,
  });
  return true;
}
