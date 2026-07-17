import type { AuctionVisualStatus } from '../../shared/types/AuctionVisualStatus';
import type { AuctionStatus } from '../../shared/types/AuctionStatus';
import { computeTimeRemaining } from './computeTimeRemaining';

const URGENT_THRESHOLD_MS = 30_000;

export function auctionVisualStatus(
  status: AuctionStatus,
  endsAt: number,
  nowMs: number,
): AuctionVisualStatus {
  if (status === 'ended') {
    return 'ended';
  }
  const { totalMs, expired } = computeTimeRemaining(endsAt, nowMs);
  if (expired || totalMs <= 0) {
    return 'ended';
  }
  if (totalMs < URGENT_THRESHOLD_MS) {
    return 'urgent';
  }
  return 'active';
}
