import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/infrastructure/api/auctionsService", () => ({
  auctionsService: { getById: vi.fn() },
}));

import { auctionsService } from "../../src/infrastructure/api/auctionsService";
import {
  fetchAuctionDetail,
  listTrackedAuctionDetailIds,
  readAuctionDetail,
  untrackAuctionDetailId,
  writeAuctionDetail,
} from "../../src/state/auctionDetailAtom";
import { LoadStatus } from "../../src/state/LoadStatus";
import { AuctionStatus } from "../../src/shared/types/AuctionStatus";
import type { AuctionDetail } from "../../src/shared/types/AuctionDetail";
import {
  SERVER_ERROR_MESSAGE,
  toSafeErrorMessage,
} from "../../src/shared/errors/toSafeErrorMessage";

const getByIdMock = vi.mocked(auctionsService.getById);

const detail: AuctionDetail = {
  id: "a1",
  title: "Test",
  image: "🎮",
  startPrice: 100,
  currentBid: 100,
  currentBidder: null,
  endsAt: Date.now() + 60_000,
  status: AuctionStatus.Active,
  bidHistory: [],
};

describe("fetchAuctionDetail", () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    untrackAuctionDetailId("a1");
    writeAuctionDetail("a1", {
      data: null,
      status: LoadStatus.Idle,
      errorMessage: "",
    });
  });

  it("discards a superseded response for the same auction id", async () => {
    let resolveFirst: ((value: AuctionDetail) => void) | undefined;
    getByIdMock
      .mockImplementationOnce(
        () =>
          new Promise<AuctionDetail>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ ...detail, currentBid: 200 });

    const firstFetch = fetchAuctionDetail("a1");
    const secondFetch = fetchAuctionDetail("a1");
    resolveFirst?.({ ...detail, currentBid: 100 });

    await Promise.all([firstFetch, secondFetch]);

    expect(readAuctionDetail("a1").data?.currentBid).toBe(200);
  });

  it("keeps the loaded detail visible instead of a full-page error on a background refetch failure", async () => {
    writeAuctionDetail("a1", {
      data: detail,
      status: LoadStatus.Success,
      errorMessage: "",
    });
    // writeAuctionDetail alone does not track; fetch will track.
    getByIdMock.mockRejectedValueOnce(new Error("network down"));

    await fetchAuctionDetail("a1");

    const state = readAuctionDetail("a1");
    expect(state.status).toBe(LoadStatus.Success);
    expect(state.data).toEqual(detail);
    expect(state.errorMessage).toBe(SERVER_ERROR_MESSAGE);
    expect(state.errorMessage).toBe(toSafeErrorMessage(new Error("x")));
  });

  it("unions bid history rather than replacing it on a same-epoch refetch", async () => {
    writeAuctionDetail("a1", {
      data: {
        ...detail,
        bidHistory: [{ bidder: "Noa", amount: 100, timestamp: 1 }],
      },
      status: LoadStatus.Success,
      errorMessage: "",
    });
    getByIdMock.mockResolvedValueOnce({
      ...detail,
      bidHistory: [{ bidder: "Ron", amount: 90, timestamp: 0 }],
    });

    await fetchAuctionDetail("a1");

    expect(readAuctionDetail("a1").data?.bidHistory).toHaveLength(2);
  });

  it("discards a late success after untrack so remount does not see orphan Success", async () => {
    let resolveLate: ((value: AuctionDetail) => void) | undefined;
    getByIdMock.mockImplementationOnce(
      () =>
        new Promise<AuctionDetail>((resolve) => {
          resolveLate = resolve;
        }),
    );

    const inFlight = fetchAuctionDetail("a1");
    expect(listTrackedAuctionDetailIds()).toContain("a1");

    untrackAuctionDetailId("a1");
    expect(listTrackedAuctionDetailIds()).not.toContain("a1");

    resolveLate?.({ ...detail, currentBid: 999 });
    await inFlight;

    // Family atom was removed; a fresh read is Idle with no data.
    const afterUntrack = readAuctionDetail("a1");
    expect(afterUntrack.status).toBe(LoadStatus.Idle);
    expect(afterUntrack.data).toBeNull();

    getByIdMock.mockResolvedValueOnce({ ...detail, currentBid: 150 });
    await fetchAuctionDetail("a1");

    expect(readAuctionDetail("a1").data?.currentBid).toBe(150);
    expect(readAuctionDetail("a1").status).toBe(LoadStatus.Success);
  });
});
