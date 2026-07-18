import { describe, expect, it } from "vitest";
import { shouldNotifyOutbid } from "../../../src/features/notifications/outbidNotifier";
import type { NewBidEvent } from "../../../src/shared/types/NewBidEvent";

const baseEvent: NewBidEvent = {
  auctionId: "a1",
  bidder: "Other",
  amount: 120,
  previousBid: 100,
  timestamp: 1,
  bid_id: "bid_1",
  endsAt: 2,
};

describe("shouldNotifyOutbid", () => {
  it("notifies only when the local user was the previous leader", () => {
    expect(shouldNotifyOutbid(baseEvent, "Me", "Me")).toBe(true);
  });

  it("does not notify when the user only participated earlier", () => {
    expect(shouldNotifyOutbid(baseEvent, "Me", "SomeoneElse")).toBe(false);
  });

  it("does not notify for the user's own bid", () => {
    expect(shouldNotifyOutbid({ ...baseEvent, bidder: "Me" }, "Me", "Me")).toBe(
      false,
    );
  });

  it("does not notify without a username", () => {
    expect(shouldNotifyOutbid(baseEvent, "", "Me")).toBe(false);
  });
});
