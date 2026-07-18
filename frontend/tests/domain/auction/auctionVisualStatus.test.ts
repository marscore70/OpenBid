import { describe, expect, it } from "vitest";
import { auctionVisualStatus } from "../../../src/domain/auction/auctionVisualStatus";
import { AuctionStatus } from "../../../src/shared/types/AuctionStatus";
import { AuctionVisualStatus } from "../../../src/shared/types/AuctionVisualStatus";

describe("auctionVisualStatus", () => {
  it("returns urgent when less than 30 seconds remain", () => {
    const now = 1_000_000;
    expect(auctionVisualStatus(AuctionStatus.Active, now + 20_000, now)).toBe(
      AuctionVisualStatus.Urgent,
    );
  });

  it("returns active when plenty of time remains", () => {
    const now = 1_000_000;
    expect(auctionVisualStatus(AuctionStatus.Active, now + 120_000, now)).toBe(
      AuctionVisualStatus.Active,
    );
  });

  it("returns ended when status is ended", () => {
    expect(
      auctionVisualStatus(AuctionStatus.Ended, Date.now() + 99999, Date.now()),
    ).toBe(AuctionVisualStatus.Ended);
  });
});
