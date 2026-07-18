import { LRUCache } from "lru-cache";
import { logger } from "../../shared/logging/logger";

/** Caps retained bid ids so long-lived tabs cannot grow unbounded. */
const SEEN_BID_ID_MAX = 500;

/** Tracks processed bid ids without exposing the backing cache. */
export type SeenBidIdRegistry = {
  /** Returns true if this bid_id was already seen. */
  has: (bidId: string) => boolean;
  /** Returns true if this bid_id was already seen; otherwise marks it and returns false. */
  consume: (bidId: string) => boolean;
};

export function createSeenBidIdRegistry(
  max = SEEN_BID_ID_MAX,
): SeenBidIdRegistry {
  const seenBidIds = new LRUCache<string, true>({ max });
  return {
    has: (bidId) => seenBidIds.has(bidId),
    consume: (bidId) => {
      if (seenBidIds.has(bidId)) {
        logger.debug("Duplicate bid_id ignored", { bidId });
        return true;
      }
      seenBidIds.set(bidId, true);
      return false;
    },
  };
}
