import { z } from "zod";

const INVALID_AMOUNT = "Enter a valid bid amount.";
const SCIENTIFIC_NOTATION_MESSAGE = "Scientific notation is not allowed.";
const SCIENTIFIC_NOTATION = /[eE]/;
const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;

//?  string normalization and validation
const bidAmountFromStringSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(
    z
      .string()
      .min(1, INVALID_AMOUNT)
      .refine((value) => !SCIENTIFIC_NOTATION.test(value), {
        message: SCIENTIFIC_NOTATION_MESSAGE,
      })
      .refine((value) => PLAIN_DECIMAL.test(value), { message: INVALID_AMOUNT })
      .transform((value) => Number(value)),
  );

function bidAmountSchema(currentBid: number, startPrice: number) {
  const minimumCompetingBid = Math.max(currentBid, startPrice);

  return z
    .union([
      z.number({
        required_error: INVALID_AMOUNT,
        invalid_type_error: INVALID_AMOUNT,
      }),
      bidAmountFromStringSchema,
    ])
    .pipe(
      z
        .number({ invalid_type_error: INVALID_AMOUNT })
        .finite({ message: INVALID_AMOUNT })
        .refine((value) => value <= Number.MAX_SAFE_INTEGER, {
          message: INVALID_AMOUNT,
        })
        .transform((value) => Math.floor(value))
        .pipe(
          z
            .number()
            .positive({ message: "Bid must be a positive amount." })
            .refine((amount) => amount > minimumCompetingBid, {
              message: `Bid must be higher than $${minimumCompetingBid}.`,
            }),
        ),
    );
}

//? Validates and normalizes a bid amount.
export function validateBidAmount(
  amount: unknown,
  currentBid: number,
  startPrice: number,
): number {
  return bidAmountSchema(currentBid, startPrice).parse(amount);
}

export function getBidValidationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid input.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Invalid input.";
}

export function minimumAllowedBid(
  currentBid: number,
  startPrice: number,
): number {
  return Math.max(currentBid, startPrice) + 1;
}
