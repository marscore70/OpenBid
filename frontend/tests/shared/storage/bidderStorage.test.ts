import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMyBids,
  loadMyBids,
  recordMyBid,
} from "../../../src/shared/storage/bidderStorage";

const MY_BIDS_KEY = "bidblitz.myBids";

describe("loadMyBids", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadMyBids()).toEqual([]);
  });

  it("returns an empty array for corrupt JSON instead of throwing", () => {
    localStorage.setItem(MY_BIDS_KEY, "{not json");
    expect(loadMyBids()).toEqual([]);
  });

  it("returns an empty array when the stored value is not an array", () => {
    localStorage.setItem(MY_BIDS_KEY, JSON.stringify({ auctionId: "a1" }));
    expect(loadMyBids()).toEqual([]);
  });

  it("keeps only entries that satisfy the StoredMyBid shape", () => {
    localStorage.setItem(
      MY_BIDS_KEY,
      JSON.stringify([
        { auctionId: "a1", amount: 100, timestamp: 1_700_000_000_000 },
        { auctionId: "", amount: 100, timestamp: 1 },
        { auctionId: "a2", amount: -5, timestamp: 1 },
        { auctionId: "a3", amount: "not a number", timestamp: 1 },
        { auctionId: "a4" },
        null,
        "just a string",
      ]),
    );

    const result = loadMyBids();

    expect(result).toEqual([
      { auctionId: "a1", amount: 100, timestamp: 1_700_000_000_000 },
    ]);
  });

  it("round-trips entries written via recordMyBid", () => {
    recordMyBid({ auctionId: "a1", amount: 120, timestamp: 5 });
    recordMyBid({ auctionId: "a2", amount: 80, timestamp: 6 });

    expect(loadMyBids()).toEqual([
      { auctionId: "a1", amount: 120, timestamp: 5 },
      { auctionId: "a2", amount: 80, timestamp: 6 },
    ]);
  });
});

describe("clearMyBids", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes the My Bids key so loadMyBids returns empty", () => {
    recordMyBid({ auctionId: "a1", amount: 120, timestamp: 5 });
    clearMyBids();

    expect(localStorage.getItem(MY_BIDS_KEY)).toBeNull();
    expect(loadMyBids()).toEqual([]);
  });

  it("is a no-op when nothing is stored", () => {
    clearMyBids();
    expect(localStorage.getItem(MY_BIDS_KEY)).toBeNull();
  });
});
