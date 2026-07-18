import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/infrastructure/api/auctionsService", () => ({
  auctionsService: { getAll: vi.fn() },
}));

import { auctionsService } from "../../src/infrastructure/api/auctionsService";
import {
  fetchAuctionsList,
  readAuctionsList,
  writeAuctionsList,
} from "../../src/state/auctionsListAtom";
import { LoadStatus } from "../../src/state/LoadStatus";
import { AuctionStatus } from "../../src/shared/types/AuctionStatus";
import type { AuctionSummary } from "../../src/shared/types/AuctionSummary";
import {
  loadMyBids,
  recordMyBid,
} from "../../src/shared/storage/bidderStorage";

const getAllMock = vi.mocked(auctionsService.getAll);

const MY_BIDS_KEY = "bidblitz.myBids";

const auction: AuctionSummary = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidCount: 0,
};

describe("fetchAuctionsList", () => {
  beforeEach(() => {
    getAllMock.mockReset();
    localStorage.clear();
    writeAuctionsList({ data: [], status: LoadStatus.Idle, errorMessage: "" });
  });

  it("discards a superseded response so an in-flight fetch cannot overwrite a newer one", async () => {
    let resolveFirst: ((value: AuctionSummary[]) => void) | undefined;
    getAllMock
      .mockImplementationOnce(
        () =>
          new Promise<AuctionSummary[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce([{ ...auction, currentBid: 200 }]);

    const firstFetch = fetchAuctionsList();
    const secondFetch = fetchAuctionsList();
    resolveFirst?.([{ ...auction, currentBid: 100 }]);

    await Promise.all([firstFetch, secondFetch]);

    expect(readAuctionsList().data[0]?.currentBid).toBe(200);
  });

  it("keeps existing data and does not force a full-page error when a background refetch fails", async () => {
    writeAuctionsList({
      data: [auction],
      status: LoadStatus.Success,
      errorMessage: "",
    });
    getAllMock.mockRejectedValueOnce(new Error("network down"));

    await fetchAuctionsList();

    const state = readAuctionsList();
    expect(state.status).toBe(LoadStatus.Success);
    expect(state.data).toHaveLength(1);
    expect(state.errorMessage).toBe("network down");
  });

  it("surfaces Error status when there is no data to fall back on", async () => {
    getAllMock.mockRejectedValueOnce(new Error("network down"));

    await fetchAuctionsList();

    expect(readAuctionsList().status).toBe(LoadStatus.Error);
  });

  it("only advances currentBid when the fetched value is ahead of a same-epoch cached one", async () => {
    writeAuctionsList({
      data: [{ ...auction, currentBid: 150, currentBidder: "Noa" }],
      status: LoadStatus.Success,
      errorMessage: "",
    });
    getAllMock.mockResolvedValueOnce([
      { ...auction, currentBid: 120, currentBidder: "Ron" },
    ]);

    await fetchAuctionsList();

    const merged = readAuctionsList().data[0];
    expect(merged?.currentBid).toBe(150);
    expect(merged?.currentBidder).toBe("Noa");
  });

  it("clears My Bids after a successful list fetch when every stored bid is ahead of the raw server list", async () => {
    recordMyBid({ auctionId: "a1", amount: 500, timestamp: 1 });
    recordMyBid({ auctionId: "a2", amount: 400, timestamp: 2 });
    getAllMock.mockResolvedValueOnce([
      { ...auction, id: "a1", currentBid: 100 },
      { ...auction, id: "a2", currentBid: 100 },
    ]);

    await fetchAuctionsList();

    expect(loadMyBids()).toEqual([]);
    expect(localStorage.getItem(MY_BIDS_KEY)).toBeNull();
    expect(readAuctionsList().status).toBe(LoadStatus.Success);
  });

  it("does not clear My Bids when a list fetch fails", async () => {
    recordMyBid({ auctionId: "a1", amount: 500, timestamp: 1 });
    getAllMock.mockRejectedValueOnce(new Error("network down"));

    await fetchAuctionsList();

    expect(loadMyBids()).toEqual([
      { auctionId: "a1", amount: 500, timestamp: 1 },
    ]);
  });

  it("does not clear My Bids when a superseded list response would have matched the reset signal", async () => {
    recordMyBid({ auctionId: "a1", amount: 500, timestamp: 1 });

    let resolveFirst: ((value: AuctionSummary[]) => void) | undefined;
    getAllMock
      .mockImplementationOnce(
        () =>
          new Promise<AuctionSummary[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      // Latest: stored 500 is not ahead of server 600 → must not clear.
      .mockResolvedValueOnce([{ ...auction, id: "a1", currentBid: 600 }]);

    const firstFetch = fetchAuctionsList();
    const secondFetch = fetchAuctionsList();
    // Superseded: stored 500 > server 100 would look like a reset if applied.
    resolveFirst?.([{ ...auction, id: "a1", currentBid: 100 }]);

    await Promise.all([firstFetch, secondFetch]);

    expect(loadMyBids()).toEqual([
      { auctionId: "a1", amount: 500, timestamp: 1 },
    ]);
    expect(readAuctionsList().data[0]?.currentBid).toBe(600);
  });

  it("uses the raw fetched list for the reset signal even when merge keeps a higher cached bid", async () => {
    writeAuctionsList({
      data: [{ ...auction, id: "a1", currentBid: 600, currentBidder: "Noa" }],
      status: LoadStatus.Success,
      errorMessage: "",
    });
    recordMyBid({ auctionId: "a1", amount: 500, timestamp: 1 });
    // 300 is a stale-but-real (not startPrice) currentBid, so the summary
    // merge treats it as an ordinary lost race (keeps the higher cached
    // 600), not a server reset - the My Bids clear signal below still
    // reads the raw fetched 300 independently of that merge decision.
    getAllMock.mockResolvedValueOnce([
      { ...auction, id: "a1", currentBid: 300, currentBidder: null },
    ]);

    await fetchAuctionsList();

    // Merged cache stays at 600, but reset clear keyed off raw fetched 300.
    expect(readAuctionsList().data[0]?.currentBid).toBe(600);
    expect(loadMyBids()).toEqual([]);
  });
});
