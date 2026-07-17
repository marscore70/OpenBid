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
    expect(() => validateBidAmount("   ", currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount(null, currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount(undefined, currentBid, startPrice)).toThrow(
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
    expect(() => validateBidAmount("💰101", currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount({}, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("strips whitespace from numeric strings", () => {
    expect(validateBidAmount("  1 0 1  ", currentBid, startPrice)).toBe(101);
    expect(validateBidAmount("\t150\n", currentBid, startPrice)).toBe(150);
  });

  it("accepts plain numeric strings and floors decimals", () => {
    expect(validateBidAmount("101", currentBid, startPrice)).toBe(101);
    expect(validateBidAmount(101.9, currentBid, startPrice)).toBe(101);
  });

  it("rejects scientific notation", () => {
    expect(() => validateBidAmount("1e3", currentBid, startPrice)).toThrow(
      /Scientific notation is not allowed/,
    );
    expect(() => validateBidAmount("1E5", currentBid, startPrice)).toThrow(
      /Scientific notation is not allowed/,
    );
    expect(() => validateBidAmount("10e-1", currentBid, startPrice)).toThrow(
      /Scientific notation is not allowed/,
    );
  });

  it("rejects NaN, Infinity, and unsafe huge numbers", () => {
    expect(() => validateBidAmount(Number.NaN, currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() =>
      validateBidAmount(Number.POSITIVE_INFINITY, currentBid, startPrice),
    ).toThrow(ZodError);
    expect(() =>
      validateBidAmount(Number.NEGATIVE_INFINITY, currentBid, startPrice),
    ).toThrow(ZodError);
    expect(() =>
      validateBidAmount(Number.MAX_SAFE_INTEGER + 1, currentBid, startPrice),
    ).toThrow(ZodError);
  });

  it("rejects zero and non-positive amounts", () => {
    expect(() => validateBidAmount(0, currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount(-5, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("rejects bid less than or equal to current bid", () => {
    expect(() => validateBidAmount(100, currentBid, startPrice)).toThrow(
      ZodError,
    );
    expect(() => validateBidAmount(50, currentBid, startPrice)).toThrow(
      ZodError,
    );
  });

  it("rejects bid that does not beat start price when start price is higher", () => {
    expect(() => validateBidAmount(150, 100, 200)).toThrow(ZodError);
    expect(validateBidAmount(201, 100, 200)).toBe(201);
  });

  it("accepts bid above current bid and start price", () => {
    expect(validateBidAmount(101, currentBid, startPrice)).toBe(101);
  });

  it("minimumAllowedBid is one above the higher of currentBid and startPrice", () => {
    expect(minimumAllowedBid(100, 50)).toBe(101);
    expect(minimumAllowedBid(100, 200)).toBe(201);
  });

  it("constrainBidAmountInput strips non-digits and caps length", () => {
    expect(constrainBidAmountInput("12a3$")).toBe("123");
    expect(constrainBidAmountInput("1e3")).toBe("13");
    expect(constrainBidAmountInput("9".repeat(MAX_BID_AMOUNT_DIGITS + 5))).toBe(
      "9".repeat(MAX_BID_AMOUNT_DIGITS),
    );
  });

  it("isBidAmountValid mirrors schema without throwing", () => {
    expect(isBidAmountValid(101, currentBid, startPrice)).toBe(true);
    expect(isBidAmountValid(50, currentBid, startPrice)).toBe(false);
    expect(isBidAmountValid("9999999999999999", currentBid, startPrice)).toBe(
      false,
    );
    expect(isBidAmountValid("", currentBid, startPrice)).toBe(false);
  });

  it("getBidAmountErrorMessage is silent for blank and verbose when invalid", () => {
    expect(getBidAmountErrorMessage("", currentBid, startPrice)).toBe("");
    expect(getBidAmountErrorMessage(null, currentBid, startPrice)).toBe("");
    expect(getBidAmountErrorMessage(50, currentBid, startPrice)).toMatch(
      /higher than/,
    );
    expect(getBidAmountErrorMessage(101, currentBid, startPrice)).toBe("");
  });
});
