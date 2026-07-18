import { describe, expect, it } from "vitest";
import {
  ActiveBidPresentationKind,
  resolveActiveBidPresentation,
} from "../../../src/domain/auction/resolveActiveBidPresentation";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";

describe("resolveActiveBidPresentation", () => {
  it("uses the opening floor when active with no leader", () => {
    const result = resolveActiveBidPresentation({
      currentBid: 50,
      currentBidder: null,
      startPrice: 50,
      status: AuctionStatus.Active,
    });

    expect(result).toEqual({
      kind: ActiveBidPresentationKind.Opening,
      startPrice: 50,
    });
  });

  it("uses the current leader when a bidder is present", () => {
    const result = resolveActiveBidPresentation({
      currentBid: 120,
      currentBidder: "Alice",
      startPrice: 50,
      status: AuctionStatus.Active,
    });

    expect(result).toEqual({
      kind: ActiveBidPresentationKind.Led,
      currentBid: 120,
      leader: "Alice",
    });
  });

  it("marks ended auctions with no leader as ended without bids", () => {
    const result = resolveActiveBidPresentation({
      currentBid: 50,
      currentBidder: null,
      startPrice: 50,
      status: AuctionStatus.Ended,
    });

    expect(result).toEqual({
      kind: ActiveBidPresentationKind.EndedWithoutBids,
    });
  });

  it("shows current bid when amount advanced with no leader name", () => {
    const result = resolveActiveBidPresentation({
      currentBid: 120,
      currentBidder: null,
      startPrice: 50,
      status: AuctionStatus.Active,
    });

    expect(result.kind).toBe(ActiveBidPresentationKind.Led);
    if (result.kind === ActiveBidPresentationKind.Led) {
      expect(result.currentBid).toBe(120);
    }
  });
});
