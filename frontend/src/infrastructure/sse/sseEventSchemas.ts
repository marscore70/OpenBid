import { z } from "zod";
import type { NewBidEvent } from "../../shared/types/NewBidEvent";

/**
 * Zod boundary for the `new_bid` SSE event. Unlike REST responses (see
 * `auctionSchemas.ts`), the live stream previously had no schema check at
 * all (`parseSseData` type-asserted `as NewBidEvent`). That gap is safe for
 * most fields today because `mergeNewBid*`'s `amount <= currentBid` guard
 * already rejects a malformed/`NaN` amount before it can corrupt state, but
 * the new authoritative `endsAt` field has no such guard downstream — a
 * malformed value must be rejected here, at the parser boundary, rather
 * than trusted into the merge layer.
 */
export const newBidEventSchema: z.ZodType<NewBidEvent> = z.object({
  auctionId: z.string().min(1),
  bidder: z.string(),
  amount: z.number().finite(),
  previousBid: z.number().finite(),
  timestamp: z.number().finite(),
  bid_id: z.string().min(1),
  endsAt: z.number().finite(),
});
