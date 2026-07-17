import { logger } from "../../shared/logging/logger";

/** Tracks processed bid ids without exposing the backing Set. */
export type SeenBidIdRegistry = {
  /** Returns true if this bid_id was already seen; otherwise marks it and returns false. */
  consume: (bidId: string) => boolean;
};

export function createSeenBidIdRegistry(): SeenBidIdRegistry {
  const seenBidIds = new Set<string>();
  return {
    consume: (bidId) => {
      if (seenBidIds.has(bidId)) {
        logger.debug("Duplicate bid_id ignored", { bidId });
        return true;
      }
      seenBidIds.add(bidId);
      return false;
    },
  };
}
