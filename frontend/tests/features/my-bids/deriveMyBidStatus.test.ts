import { describe, expect, it } from "vitest";
import { deriveMyBidStatus } from "../../../src/features/my-bids/deriveMyBidStatus";
import type { AuctionSummary } from "../../../src/shared/types/AuctionSummary";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";
import { MyBidStatus } from "../../../src/shared/types/MyBidStatus";

const activeAuction: AuctionSummary = {
  id: "a1",
  title: "Vintage lamp",
  image: "💡",
  startPrice: 50,
  currentBid: 100,
  currentBidder: "Ron",
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidCount: 3,
};

describe("deriveMyBidStatus", () => {
  it("marks Stale when the auction is absent from a Success list", () => {
    const status = deriveMyBidStatus({
      auction: undefined,
      username: "Noa",
      myLastBid: 90,
    });
    expect(status).toBe(MyBidStatus.Stale);
  });

  it("marks Stale when active and the stored amount exceeds the current bid", () => {
    const status = deriveMyBidStatus({
      auction: activeAuction,
      username: "Noa",
      myLastBid: 150,
    });
    expect(status).toBe(MyBidStatus.Stale);
  });

  it("never marks Ended auctions Stale even if the stored amount exceeds the final price", () => {
    const endedAuction: AuctionSummary = {
      ...activeAuction,
      status: AuctionStatus.Ended,
      currentBid: 100,
      currentBidder: "Ron",
    };
    const status = deriveMyBidStatus({
      auction: endedAuction,
      username: "Noa",
      myLastBid: 500,
    });
    expect(status).not.toBe(MyBidStatus.Stale);
    expect(status).toBe(MyBidStatus.Lost);
  });

  it("reports Won when the ended auction's winner is the tracked user", () => {
    const endedAuction: AuctionSummary = {
      ...activeAuction,
      status: AuctionStatus.Ended,
      currentBidder: "Noa",
    };
    const status = deriveMyBidStatus({
      auction: endedAuction,
      username: "Noa",
      myLastBid: 100,
    });
    expect(status).toBe(MyBidStatus.Won);
  });

  it("reports Lost when the ended auction's winner is someone else", () => {
    const endedAuction: AuctionSummary = {
      ...activeAuction,
      status: AuctionStatus.Ended,
      currentBidder: "Ron",
    };
    const status = deriveMyBidStatus({
      auction: endedAuction,
      username: "Noa",
      myLastBid: 90,
    });
    expect(status).toBe(MyBidStatus.Lost);
  });

  it("reports Winning when the tracked user is the current leader", () => {
    const status = deriveMyBidStatus({
      auction: { ...activeAuction, currentBidder: "Noa" },
      username: "Noa",
      myLastBid: 100,
    });
    expect(status).toBe(MyBidStatus.Winning);
  });

  it("reports Winning when the leader matches after identity normalization", () => {
    const status = deriveMyBidStatus({
      auction: { ...activeAuction, currentBidder: "Noa" },
      username: "  noa  ",
      myLastBid: 100,
    });
    expect(status).toBe(MyBidStatus.Winning);
  });

  it("reports Outbid when active, not the leader, and the stored amount trails the current bid", () => {
    const status = deriveMyBidStatus({
      auction: activeAuction,
      username: "Noa",
      myLastBid: 80,
    });
    expect(status).toBe(MyBidStatus.Outbid);
  });

  it("reports Outbid (not Winning) on a tie where someone else is the current bidder", () => {
    const status = deriveMyBidStatus({
      auction: activeAuction,
      username: "Noa",
      myLastBid: activeAuction.currentBid,
    });
    expect(status).toBe(MyBidStatus.Outbid);
  });
});
