import { describe, expect, it } from "vitest";
import {
  EndedAuctionOutcome,
  EndedAuctionTone,
  resolveEndedAuctionPresentation,
} from "../../../src/domain/auction/resolveEndedAuctionPresentation";

describe("resolveEndedAuctionPresentation", () => {
  it("classifies no-winner endings as warnings", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: null,
      currentBid: 150,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.NoBids);
    expect(result.tone).toBe(EndedAuctionTone.Warning);
  });

  it("marks my win as success", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: "Alice",
      currentBid: 200,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.WonByMe);
    expect(result.tone).toBe(EndedAuctionTone.Success);
  });

  it("treats case variants as my win", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: "Alice",
      currentBid: 200,
      myUsername: "  alice  ",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.WonByMe);
  });

  it("marks another bidder's win as neutral", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: "Bob",
      currentBid: 175,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.WonByOther);
    expect(result.tone).toBe(EndedAuctionTone.Neutral);
  });
});
