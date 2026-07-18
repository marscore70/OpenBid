import { AuctionStatus } from "../../shared/types/AuctionStatus";
import type { DisplayTimingRegistry } from "./DisplayTiming";

/**
 * Notice an authoritative `endsAt` increase and set sticky `snipeExtended`
 * for the "Time extended" tag (server owns the extension math).
 */
export function applySnipeDisplayTimingOnBid(params: {
  auctionId: string;
  previousEndsAt: number;
  nextEndsAt: number;
  auctionStatus: AuctionStatus;
  timingRegistry: DisplayTimingRegistry;
}): boolean {
  const {
    auctionId,
    previousEndsAt,
    nextEndsAt,
    auctionStatus,
    timingRegistry,
  } = params;

  if (auctionStatus !== AuctionStatus.Active) {
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
