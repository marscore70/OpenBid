import { describe, expect, it } from "vitest";
import {
  EndedAuctionOutcome,
  EndedAuctionTone,
  resolveEndedAuctionPresentation,
} from "../../../src/domain/auction/resolveEndedAuctionPresentation";

describe("resolveEndedAuctionPresentation", () => {
  it("marks no-winner endings as warning with no-bids copy", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: null,
      currentBid: 150,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.NoBids);
    expect(result.tone).toBe(EndedAuctionTone.Warning);
    expect(result.catalogMessage).toBe("No bids yet");
    expect(result.detailMessage).toBe("Auction ended without bids");
  });

  it("marks my win as success", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: "Alice",
      currentBid: 200,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.WonByMe);
    expect(result.tone).toBe(EndedAuctionTone.Success);
    expect(result.catalogMessage).toBe("You won - $200");
    expect(result.detailMessage).toBe("Auction ended. You won at $200");
  });

  it("marks another bidder's win as neutral", () => {
    const result = resolveEndedAuctionPresentation({
      currentBidder: "Bob",
      currentBid: 175,
      myUsername: "Alice",
    });

    expect(result.outcome).toBe(EndedAuctionOutcome.WonByOther);
    expect(result.tone).toBe(EndedAuctionTone.Neutral);
    expect(result.catalogMessage).toBe("Winner: Bob - $175");
  });
});
