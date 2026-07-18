import { z } from "zod";
import { nullableNetworkBidderSchema } from "../../domain/bid/sanitizeBidderName";

export type PlaceBidSuccess = {
  success: true;
  bid_id: string;
  currentBid: number;
  message: string;
};

export const placeBidSuccessSchema: z.ZodType<PlaceBidSuccess> = z.object({
  success: z.literal(true),
  bid_id: z.string().min(1),
  currentBid: z.number().finite(),
  message: z.string(),
});

export const placeBidErrorBodySchema = z.object({
  error: z.string().optional(),
  currentBid: z.number().finite().optional(),
  winner: nullableNetworkBidderSchema.optional(),
  finalPrice: z.number().finite().optional(),
});

export type PlaceBidErrorBody = z.infer<typeof placeBidErrorBodySchema>;

export function parsePlaceBidErrorBody(body: unknown): PlaceBidErrorBody {
  const result = placeBidErrorBodySchema.safeParse(body ?? {});
  return result.success ? result.data : {};
}
