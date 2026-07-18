import { z } from "zod";

export const MAX_BIDDER_LENGTH = 64;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Live-input helper: strip controls and enforce max length without validating emptiness. */
export function constrainBidderNameInput(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").slice(0, MAX_BIDDER_LENGTH);
}

/** Zod transform shared by form input and network string boundaries. */
export function sanitizeNetworkText(value: string): string {
  return value.replace(CONTROL_CHARS, "").trim();
}

export const networkTextSchema = z.string().transform(sanitizeNetworkText);

export const networkBidderSchema = networkTextSchema.pipe(
  z.string().max(MAX_BIDDER_LENGTH),
);

export const nullableNetworkBidderSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }
    const cleaned = sanitizeNetworkText(value).slice(0, MAX_BIDDER_LENGTH);
    return cleaned.length === 0 ? null : cleaned;
  });

const bidderNameSchema = z
  .string()
  .transform(sanitizeNetworkText)
  .pipe(
    z
      .string()
      .min(1, "Enter your bidder name.")
      .max(MAX_BIDDER_LENGTH, "Bidder name is too long."),
  );

export function parseBidderName(raw: unknown): string {
  return bidderNameSchema.parse(raw);
}
