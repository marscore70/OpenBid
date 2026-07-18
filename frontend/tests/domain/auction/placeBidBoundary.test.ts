import { describe, expect, it } from "vitest";
import { nextCurrentBidAfterOutbidRejection } from "../../../src/domain/auction/nextCurrentBidAfterOutbidRejection";
import {
  MAX_PLACE_BID_ERROR_LENGTH,
  placeBidErrorBodySchema,
  placeBidSuccessSchema,
} from "../../../src/infrastructure/api/bidSchemas";

describe("nextCurrentBidAfterOutbidRejection", () => {
  it("raises the cached bid when the rejection body is higher", () => {
    expect(nextCurrentBidAfterOutbidRejection(100, 120)).toBe(120);
  });

  it("does not roll the cached bid backward when SSE already advanced it", () => {
    expect(nextCurrentBidAfterOutbidRejection(150, 120)).toBe(150);
  });

  it("keeps the same value when equal", () => {
    expect(nextCurrentBidAfterOutbidRejection(110, 110)).toBe(110);
  });
});

describe("placeBidSuccessSchema", () => {
  it("accepts a well-formed success body", () => {
    const result = placeBidSuccessSchema.safeParse({
      success: true,
      bid_id: "bid_1",
      currentBid: 120,
      message: "ok",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a success body missing currentBid", () => {
    const result = placeBidSuccessSchema.safeParse({
      success: true,
      bid_id: "bid_1",
      message: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-finite currentBid", () => {
    const result = placeBidSuccessSchema.safeParse({
      success: true,
      bid_id: "bid_1",
      currentBid: Number.NaN,
      message: "ok",
    });
    expect(result.success).toBe(false);
  });
});

describe("placeBidErrorBodySchema", () => {
  it("accepts a 400-shaped body with currentBid", () => {
    const result = placeBidErrorBodySchema.safeParse({
      currentBid: 130,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentBid).toBe(130);
    }
  });

  it("rejects a non-finite currentBid in the error body", () => {
    const result = placeBidErrorBodySchema.safeParse({
      currentBid: Number.NaN,
    });
    expect(result.success).toBe(false);
  });

  it("strips control characters from error text while keeping currentBid", () => {
    const result = placeBidErrorBodySchema.safeParse({
      error: "Outbid\u0000 by peer",
      currentBid: 140,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe("Outbid by peer");
      expect(result.data.currentBid).toBe(140);
      expect(result.data.error).not.toMatch(/[\u0000-\u001F\u007F]/);
    }
  });

  it("truncates oversized error text to the schema max length", () => {
    const result = placeBidErrorBodySchema.safeParse({
      error: "x".repeat(MAX_PLACE_BID_ERROR_LENGTH + 50),
      currentBid: 150,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error?.length).toBe(MAX_PLACE_BID_ERROR_LENGTH);
      expect(result.data.currentBid).toBe(150);
    }
  });
});
