import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  constrainBidAmountInput,
  getBidAmountErrorMessage,
  isBidAmountValid,
  MAX_BID_AMOUNT_DIGITS,
  minimumAllowedBid,
  validateBidAmount,
} from "../../../src/domain/bid/validateBidAmount";

describe("validateBidAmount", () => {
  const currentBid = 100;
  const startPrice = 50;

  it("rejects empty / missing / null / undefined", () => {
    expect(() => validateBidAmount("", currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount(null, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("rejects non-numbers and emoji / XSS-like strings", () => {
    expect(() => validateBidAmount("abc", currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() =>
      validateBidAmount("101<script>", currentBid, startPrice),
    ).toThrow(ZodError);
  });

  it("strips whitespace from numeric strings", () => {
    expect(validateBidAmount("  1 0 1  ", currentBid, startPrice)).toBe(101);
  });

  it("accepts plain numeric strings and floors decimals", () => {
    expect(validateBidAmount("101", currentBid, startPrice)).toBe(101);
    expect(validateBidAmount(101.9, currentBid, startPrice)).toBe(101);
  });

  it("rejects scientific notation", () => {
    expect(() => validateBidAmount("1e3", currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("rejects NaN, Infinity, and unsafe huge numbers", () => {
    expect(() => validateBidAmount(Number.NaN, currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() =>
      validateBidAmount(Number.MAX_SAFE_INTEGER + 1, currentBid, startPrice),
    ).toThrow(ZodError);
  });

  it("rejects zero and non-positive amounts", () => {
    expect(() => validateBidAmount(0, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("rejects a bid that does not beat an existing leader", () => {
    expect(() => validateBidAmount(100, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("requires the opening bid to beat the server's seeded start price", () => {
    expect(() => validateBidAmount(50, 50, 50)).toThrow(ZodError);
    expect(validateBidAmount(51, 50, 50)).toBe(51);
  });

  it("rejects opening bids below the start price", () => {
    expect(() => validateBidAmount(49, 50, 50)).toThrow(ZodError);
  });

  it("rejects a bid below start price when start price exceeds current bid", () => {
    expect(() => validateBidAmount(150, 100, 200)).toThrow(ZodError);
    expect(validateBidAmount(201, 100, 200)).toBe(201);
  });

  it("minimumAllowedBid is one above the higher server floor", () => {
    expect(minimumAllowedBid(50, 50)).toBe(51);
    expect(minimumAllowedBid(100, 50)).toBe(101);
    expect(minimumAllowedBid(100, 200)).toBe(201);
  });

  it("constrainBidAmountInput strips non-digits and caps length", () => {
    expect(constrainBidAmountInput("12a3$")).toBe("123");
    expect(constrainBidAmountInput("9".repeat(MAX_BID_AMOUNT_DIGITS + 5))).toBe(
      "9".repeat(MAX_BID_AMOUNT_DIGITS),
    );
  });

  it("isBidAmountValid mirrors schema without throwing", () => {
    expect(isBidAmountValid(101, currentBid, startPrice)).toBe(true);
    expect(isBidAmountValid(50, 50, 50)).toBe(false);
    expect(isBidAmountValid(50, currentBid, startPrice)).toBe(false);
    expect(isBidAmountValid("", currentBid, startPrice)).toBe(false);
  });

  it("getBidAmountErrorMessage is silent for blank and set when invalid", () => {
    expect(getBidAmountErrorMessage("", currentBid, startPrice)).toBe("");
    expect(
      getBidAmountErrorMessage(50, currentBid, startPrice).length,
    ).toBeGreaterThan(0);
    expect(getBidAmountErrorMessage(101, currentBid, startPrice)).toBe("");
  });
});
