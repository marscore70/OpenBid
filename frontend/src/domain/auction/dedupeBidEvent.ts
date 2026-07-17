import { logger } from '../../shared/logging/logger';

export function isDuplicateBidId(seenBidIds: Set<string>, bidId: string): boolean {
  if (seenBidIds.has(bidId)) {
    logger.debug('Duplicate bid_id ignored', { bidId });
    return true;
  }
  seenBidIds.add(bidId);
  return false;
}
