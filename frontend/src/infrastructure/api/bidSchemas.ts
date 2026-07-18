import { z } from "zod";
import {
  nullableNetworkBidderSchema,
  sanitizeNetworkText,
} from "../../domain/bid/sanitizeBidderName";

export type PlaceBidSuccess = {
  success: true;
  bid_id: string;
  currentBid: number;
  message: string;
};

/** Cap place-bid error body text so a hostile payload cannot flood the UI. */
export const MAX_PLACE_BID_ERROR_LENGTH = 200;

/** Sanitize + truncate; never fail the parent object (preserve currentBid etc.). */
const placeBidErrorTextSchema = z.string().transform((value) => {
  const cleaned = sanitizeNetworkText(value).slice(0, MAX_PLACE_BID_ERROR_LENGTH);
  return cleaned;
});

export const placeBidSuccessSchema: z.ZodType<PlaceBidSuccess> = z.object({
  success: z.literal(true),
  bid_id: z.string().min(1),
  currentBid: z.number().finite(),
  message: z.string(),
});

export const placeBidErrorBodySchema = z.object({
  error: placeBidErrorTextSchema.optional(),
  currentBid: z.number().finite().optional(),
  winner: nullableNetworkBidderSchema.optional(),
  finalPrice: z.number().finite().optional(),
});

export type PlaceBidErrorBody = z.infer<typeof placeBidErrorBodySchema>;

export function parsePlaceBidErrorBody(body: unknown): PlaceBidErrorBody {
  const result = placeBidErrorBodySchema.safeParse(body ?? {});
  return result.success ? result.data : {};
}
