import type { AuctionEndedEvent } from "../../shared/types/AuctionEndedEvent";
import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import { SseEventType } from "../../shared/types/SseEventType";
import { auctionEndedEventSchema, newBidEventSchema } from "./sseEventSchemas";

export type ParsedStreamEvent =
  | { type: typeof SseEventType.NewBid; payload: NewBidEvent }
  | { type: typeof SseEventType.AuctionEnded; payload: AuctionEndedEvent }
  | { type: typeof SseEventType.Ignored };

export function parseSseData(
  eventName: string | undefined,
  dataLine: string,
): ParsedStreamEvent {
  // Heartbeat + named `connected` are unused by atom apply; connection state
  // comes from EventSource `open` only (#31 / #35).
  if (
    eventName === SseEventType.Heartbeat ||
    eventName === SseEventType.Connected
  ) {
    return { type: SseEventType.Ignored };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine) as unknown;
  } catch {
    return { type: SseEventType.Ignored };
  }

  if (eventName === SseEventType.NewBid) {
    const result = newBidEventSchema.safeParse(parsed);
    if (!result.success) {
      return { type: SseEventType.Ignored };
    }
    return { type: SseEventType.NewBid, payload: result.data };
  }

  if (eventName === SseEventType.AuctionEnded) {
    const result = auctionEndedEventSchema.safeParse(parsed);
    if (!result.success) {
      return { type: SseEventType.Ignored };
    }
    return { type: SseEventType.AuctionEnded, payload: result.data };
  }

  return { type: SseEventType.Ignored };
}
