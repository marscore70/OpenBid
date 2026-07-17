import type { NewBidEvent } from '../../shared/types/NewBidEvent';
import type { AuctionEndedEvent } from '../../shared/types/AuctionEndedEvent';

export type ParsedStreamEvent =
  | { type: 'connected'; timestamp: number }
  | { type: 'new_bid'; payload: NewBidEvent }
  | { type: 'auction_ended'; payload: AuctionEndedEvent };

export function parseSseData(
  eventName: string | undefined,
  dataLine: string,
): ParsedStreamEvent | null {
  if (eventName === 'heartbeat') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine) as unknown;
  } catch {
    return null;
  }
  if (eventName === 'connected') {
    const timestamp =
      typeof parsed === 'object' &&
      parsed !== null &&
      'timestamp' in parsed &&
      typeof (parsed as { timestamp: unknown }).timestamp === 'number'
        ? (parsed as { timestamp: number }).timestamp
        : Date.now();
    return { type: 'connected', timestamp };
  }
  if (eventName === 'new_bid') {
    return { type: 'new_bid', payload: parsed as NewBidEvent };
  }
  if (eventName === 'auction_ended') {
    return { type: 'auction_ended', payload: parsed as AuctionEndedEvent };
  }
  return null;
}
