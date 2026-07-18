import { beforeEach, describe, expect, it } from "vitest";
import { collectMyBidEntries } from "../../../src/features/my-bids/collectMyBidEntries";
import { recordMyBid } from "../../../src/shared/storage/bidderStorage";
import type { AuctionSummary } from "../../../src/shared/types/AuctionSummary";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";
import { LoadStatus } from "../../../src/state/LoadStatus";
import { MyBidStatus } from "../../../src/shared/types/MyBidStatus";

const lamp: AuctionSummary = {
  id: "lamp",
  title: "Vintage lamp",
  image: "💡",
  startPrice: 50,
  currentBid: 100,
  currentBidder: "Ron",
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidCount: 2,
};

describe("collectMyBidEntries", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("skips judgment (does not mark Stale) for an absent auction while the list has not loaded successfully", () => {
    recordMyBid({ auctionId: "vanished", amount: 40, timestamp: Date.now() });

    const entries = collectMyBidEntries(LoadStatus.Loading, [], "Noa");

    expect(entries).toHaveLength(0);
  });

  it("marks Stale once the list has loaded successfully and the auction is genuinely absent", () => {
    recordMyBid({ auctionId: "vanished", amount: 40, timestamp: Date.now() });

    const entries = collectMyBidEntries(LoadStatus.Success, [], "Noa");

    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(MyBidStatus.Stale);
  });

  it("judges a bid normally when its auction is present, even while the list is mid-refetch", () => {
    recordMyBid({ auctionId: "lamp", amount: 80, timestamp: Date.now() });

    const entries = collectMyBidEntries(LoadStatus.Loading, [lamp], "Noa");

    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(MyBidStatus.Outbid);
    expect(entries[0]?.title).toBe("Vintage lamp");
  });

  it("maps each stored bid to its own auction with a single pass (no O(n*m) re-parsing)", () => {
    recordMyBid({ auctionId: "lamp", amount: 80, timestamp: Date.now() });
    recordMyBid({ auctionId: "vase", amount: 30, timestamp: Date.now() });

    const vase: AuctionSummary = {
      ...lamp,
      id: "vase",
      currentBid: 30,
      currentBidder: "Noa",
    };

    const entries = collectMyBidEntries(LoadStatus.Success, [lamp, vase], "Noa");

    expect(entries).toHaveLength(2);
    const byId = new Map(entries.map((entry) => [entry.auctionId, entry]));
    expect(byId.get("lamp")?.status).toBe(MyBidStatus.Outbid);
    expect(byId.get("vase")?.status).toBe(MyBidStatus.Winning);
  });
});
