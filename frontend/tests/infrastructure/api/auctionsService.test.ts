import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import { ZodError } from "zod";
import { AuctionsService } from "../../../src/infrastructure/api/auctionsService";
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

const { bidCount: _unusedBidCount, ...summaryFieldsForDetail } = validSummary;
const validDetail = {
  ...summaryFieldsForDetail,
  bidHistory: [{ bidder: "Ron", amount: 100, timestamp: 1_699_999_000_000 }],
};

function fakeClient(data: unknown): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ data }),
  } as unknown as AxiosInstance;
}

describe("AuctionsService.getAll", () => {
  it("returns the parsed list on a well-formed response", async () => {
    const service = new AuctionsService(fakeClient([validSummary]));
    await expect(service.getAll()).resolves.toEqual([validSummary]);
  });

  it("rejects instead of returning a malformed entry to the caller", async () => {
    const service = new AuctionsService(
      fakeClient([{ ...validSummary, endsAt: "not-a-timestamp" }]),
    );
    await expect(service.getAll()).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects when the response is not an array", async () => {
    const service = new AuctionsService(fakeClient(validSummary));
    await expect(service.getAll()).rejects.toBeInstanceOf(ZodError);
  });
});

describe("AuctionsService.getById", () => {
  it("returns the parsed detail on a well-formed response", async () => {
    const service = new AuctionsService(fakeClient(validDetail));
    await expect(service.getById("a1")).resolves.toEqual(validDetail);
  });

  it("rejects instead of returning a malformed detail to the caller", async () => {
    const service = new AuctionsService(
      fakeClient({ ...validDetail, currentBid: undefined }),
    );
    await expect(service.getById("a1")).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a null response", async () => {
    const service = new AuctionsService(fakeClient(null));
    await expect(service.getById("a1")).rejects.toBeInstanceOf(ZodError);
  });
});
