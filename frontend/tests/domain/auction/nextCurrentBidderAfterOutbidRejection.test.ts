import { describe, expect, it } from "vitest";
import { nextCurrentBidderAfterOutbidRejection } from "../../../src/domain/auction/nextCurrentBidderAfterOutbidRejection";

describe("nextCurrentBidderAfterOutbidRejection", () => {
  it("clears the leader when it is still the rejected bidder", () => {
    expect(nextCurrentBidderAfterOutbidRejection("Local", "Local")).toBeNull();
    expect(nextCurrentBidderAfterOutbidRejection("local", "LOCAL")).toBeNull();
  });

  it("keeps a different leader already applied by SSE", () => {
    expect(nextCurrentBidderAfterOutbidRejection("Ron", "Local")).toBe("Ron");
  });

  it("keeps a null leader as null", () => {
    expect(nextCurrentBidderAfterOutbidRejection(null, "Local")).toBeNull();
  });
});
