import { describe, expect, it } from "vitest";
import {
  auctionDetailSchema,
  auctionSummaryListSchema,
  auctionSummarySchema,
} from "../../../src/infrastructure/api/auctionSchemas";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";

const validSummary = {
  id: "a1",
  title: "Vintage lamp",
  image: "💡",
  startPrice: 50,
  currentBid: 100,
  currentBidder: "Ron",
  endsAt: 1_700_000_000_000,
  status: AuctionStatus.Active,
  bidCount: 3,
};

const validDetail = {
  ...validSummary,
  bidHistory: [{ bidder: "Ron", amount: 100, timestamp: 1_699_999_000_000 }],
};

describe("auctionSummarySchema", () => {
  it("accepts a well-formed auction summary", () => {
    expect(auctionSummarySchema.safeParse(validSummary).success).toBe(true);
  });

  it("accepts a null currentBidder (no bids yet)", () => {
    const result = auctionSummarySchema.safeParse({
      ...validSummary,
      currentBidder: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing endsAt", () => {
    const { endsAt: _endsAt, ...withoutEndsAt } = validSummary;
    expect(auctionSummarySchema.safeParse(withoutEndsAt).success).toBe(false);
  });

  it("rejects a non-numeric currentBid", () => {
    const result = auctionSummarySchema.safeParse({
      ...validSummary,
      currentBid: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a NaN endsAt", () => {
    const result = auctionSummarySchema.safeParse({
      ...validSummary,
      endsAt: Number.NaN,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status value", () => {
    const result = auctionSummarySchema.safeParse({
      ...validSummary,
      status: "paused",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative bidCount", () => {
    const result = auctionSummarySchema.safeParse({
      ...validSummary,
      bidCount: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("auctionSummaryListSchema", () => {
  it("accepts an array of valid summaries", () => {
    expect(
      auctionSummaryListSchema.safeParse([validSummary, validSummary]).success,
    ).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(auctionSummaryListSchema.safeParse([]).success).toBe(true);
  });

  it("rejects a non-array payload", () => {
    expect(auctionSummaryListSchema.safeParse(validSummary).success).toBe(
      false,
    );
  });

  it("rejects when a single entry in the list is malformed", () => {
    const result = auctionSummaryListSchema.safeParse([
      validSummary,
      { ...validSummary, currentBid: undefined },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("auctionDetailSchema", () => {
  it("accepts a well-formed auction detail with bid history", () => {
    expect(auctionDetailSchema.safeParse(validDetail).success).toBe(true);
  });

  it("accepts an empty bid history", () => {
    expect(
      auctionDetailSchema.safeParse({ ...validDetail, bidHistory: [] }).success,
    ).toBe(true);
  });

  it("rejects a malformed bid history entry", () => {
    const result = auctionDetailSchema.safeParse({
      ...validDetail,
      bidHistory: [{ bidder: "Ron", amount: "oops", timestamp: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a null/non-object payload", () => {
    expect(auctionDetailSchema.safeParse(null).success).toBe(false);
    expect(auctionDetailSchema.safeParse("auction").success).toBe(false);
  });
});
