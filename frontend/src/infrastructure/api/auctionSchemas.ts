import { z } from "zod";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import {
  networkBidderSchema,
  networkTextSchema,
  nullableNetworkBidderSchema,
} from "../../domain/bid/sanitizeBidderName";

/**
 * Zod boundary for `auctionsService` - the REST responses are network input,
 * not trusted data. Without this, a malformed `endsAt`/`currentBid` (missing,
 * `NaN`, or wrong type) would flow straight into
 * `mergeFetchedAuctionSummary`/`mergeFetchedAuctionDetail`, where an invalid
 * `endsAt` in particular is misread as a "new epoch" and forces an incorrect
 * wholesale overwrite of already-merged cache state.
 */
const auctionStatusSchema = z.enum([AuctionStatus.Active, AuctionStatus.Ended]);

const bidHistoryEntrySchema: z.ZodType<BidHistoryEntry> = z.object({
  bidder: networkBidderSchema,
  amount: z.number().finite(),
  timestamp: z.number().finite(),
});

export const auctionSummarySchema: z.ZodType<AuctionSummary> = z.object({
  id: z.string().min(1),
  title: networkTextSchema,
  image: z.string(),
  startPrice: z.number().finite(),
  currentBid: z.number().finite(),
  currentBidder: nullableNetworkBidderSchema,
  endsAt: z.number().finite(),
  status: auctionStatusSchema,
  bidCount: z.number().finite().nonnegative(),
});

export const auctionSummaryListSchema = z.array(auctionSummarySchema);

export const auctionDetailSchema: z.ZodType<AuctionDetail> = z.object({
  id: z.string().min(1),
  title: networkTextSchema,
  image: z.string(),
  startPrice: z.number().finite(),
  currentBid: z.number().finite(),
  currentBidder: nullableNetworkBidderSchema,
  endsAt: z.number().finite(),
  status: auctionStatusSchema,
  bidHistory: z.array(bidHistoryEntrySchema),
});
