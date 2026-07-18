import { z } from "zod";

export const MAX_BIDDER_LENGTH = 64;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
/** Bidi overrides and zero-width chars used for display spoofing. */
const BIDI_AND_ZERO_WIDTH =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

/** Live-input helper: strip controls and enforce max length without validating emptiness. */
export function constrainBidderNameInput(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").slice(0, MAX_BIDDER_LENGTH);
}

/** Zod transform shared by form input and network string boundaries. */
export function sanitizeNetworkText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARS, "")
    .replace(BIDI_AND_ZERO_WIDTH, "")
    .trim();
}

/** Locale-invariant identity key for authless bidder display names. */
export function normalizeBidderIdentity(name: string): string {
  return sanitizeNetworkText(name).toLowerCase();
}

/** True when both sides normalize to the same non-empty bidder identity. */
export function isSameBidderIdentity(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (left == null || right == null) {
    return false;
  }
  const normalizedLeft = normalizeBidderIdentity(left);
  const normalizedRight = normalizeBidderIdentity(right);
  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    normalizedLeft === normalizedRight
  );
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
