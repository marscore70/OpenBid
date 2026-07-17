import { z } from "zod";

export const MAX_BIDDER_LENGTH = 64;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Live-input helper: strip controls and enforce max length without validating emptiness. */
export function constrainBidderNameInput(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").slice(0, MAX_BIDDER_LENGTH);
}

const bidderNameSchema = z
  .string()
  .transform((value) => value.replace(CONTROL_CHARS, "").trim())
  .pipe(
    z
      .string()
      .min(1, "Enter your bidder name.")
      .max(MAX_BIDDER_LENGTH, "Bidder name is too long."),
  );

export function parseBidderName(raw: unknown): string {
  return bidderNameSchema.parse(raw);
}
