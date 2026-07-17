import { AuctionStatus } from '../../shared/types/AuctionStatus';
import { AuctionVisualStatus } from '../../shared/types/AuctionVisualStatus';
import { computeTimeRemaining } from './computeTimeRemaining';

const URGENT_THRESHOLD_MS = 30_000;

export function auctionVisualStatus(
  status: AuctionStatus,
  endsAt: number,
  nowMs: number,
): AuctionVisualStatus {
  if (status === AuctionStatus.Ended) {
    return AuctionVisualStatus.Ended;
  }
  const { totalMs, expired } = computeTimeRemaining(endsAt, nowMs);
  if (expired || totalMs <= 0) {
    return AuctionVisualStatus.Ended;
  }
  if (totalMs < URGENT_THRESHOLD_MS) {
    return AuctionVisualStatus.Urgent;
  }
  return AuctionVisualStatus.Active;
}
