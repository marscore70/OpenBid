import { describe, expect, it } from "vitest";
import { parseSseData } from "../../../src/infrastructure/sse/parseSseMessage";
import { SseEventType } from "../../../src/shared/types/SseEventType";

const validNewBid = {
  auctionId: "a1",
  bidder: "Ron",
  amount: 110,
  previousBid: 100,
  timestamp: 1_700_000_000_000,
  bid_id: "bid_1",
  endsAt: 1_700_000_060_000,
};

describe("parseSseData", () => {
  it("ignores heartbeat events without parsing the payload", () => {
    const result = parseSseData(SseEventType.Heartbeat, "not json");
    expect(result).toEqual({ type: SseEventType.Ignored });
  });

  it("ignores payloads that are not valid JSON", () => {
    const result = parseSseData(SseEventType.NewBid, "{not-json");
    expect(result).toEqual({ type: SseEventType.Ignored });
  });

  it("parses a well-formed new_bid event, including the authoritative endsAt", () => {
    const result = parseSseData(
      SseEventType.NewBid,
      JSON.stringify(validNewBid),
    );
    expect(result).toEqual({
      type: SseEventType.NewBid,
      payload: validNewBid,
    });
  });

  it("rejects a new_bid event with a missing endsAt instead of adopting an unsafe value", () => {
    const payload: Record<string, unknown> = { ...validNewBid };
    delete payload.endsAt;
    const result = parseSseData(SseEventType.NewBid, JSON.stringify(payload));
    expect(result).toEqual({ type: SseEventType.Ignored });
  });

  it("rejects a new_bid event with a non-finite endsAt", () => {
    const result = parseSseData(
      SseEventType.NewBid,
      JSON.stringify({ ...validNewBid, endsAt: Number.NaN }),
    );
    expect(result).toEqual({ type: SseEventType.Ignored });
  });

  it("rejects a new_bid event with a missing bid_id", () => {
    const payload: Record<string, unknown> = { ...validNewBid };
    delete payload.bid_id;
    const result = parseSseData(SseEventType.NewBid, JSON.stringify(payload));
    expect(result).toEqual({ type: SseEventType.Ignored });
  });

  it("returns Ignored for an unknown event name", () => {
    const result = parseSseData("some_unknown_event", JSON.stringify({}));
    expect(result).toEqual({ type: SseEventType.Ignored });
  });
});
