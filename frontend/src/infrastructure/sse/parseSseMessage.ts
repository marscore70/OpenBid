import type { NewBidEvent } from '../../shared/types/NewBidEvent';
import type { AuctionEndedEvent } from '../../shared/types/AuctionEndedEvent';
import { SseEventType } from '../../shared/types/SseEventType';

export type ParsedStreamEvent =
  | { type: typeof SseEventType.Connected; timestamp: number }
  | { type: typeof SseEventType.NewBid; payload: NewBidEvent }
  | { type: typeof SseEventType.AuctionEnded; payload: AuctionEndedEvent }
  | { type: typeof SseEventType.Ignored };

export function parseSseData(
  eventName: string | undefined,
  dataLine: string,
): ParsedStreamEvent {
  if (eventName === SseEventType.Heartbeat) {
    return { type: SseEventType.Ignored };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine) as unknown;
  } catch {
    return { type: SseEventType.Ignored };
  }

  if (eventName === SseEventType.Connected) {
    const timestamp =
      typeof parsed === 'object' &&
      parsed !== null &&
      'timestamp' in parsed &&
      typeof (parsed as { timestamp: unknown }).timestamp === 'number'
        ? (parsed as { timestamp: number }).timestamp
        : Date.now();
    return { type: SseEventType.Connected, timestamp };
  }

  if (eventName === SseEventType.NewBid) {
    return { type: SseEventType.NewBid, payload: parsed as NewBidEvent };
  }

  if (eventName === SseEventType.AuctionEnded) {
    return {
      type: SseEventType.AuctionEnded,
      payload: parsed as AuctionEndedEvent,
    };
  }

  return { type: SseEventType.Ignored };
}
