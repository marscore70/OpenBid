import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import type { AuctionDetail } from '../../shared/types/AuctionDetail';
import type { NewBidEvent } from '../../shared/types/NewBidEvent';
import type { AuctionEndedEvent } from '../../shared/types/AuctionEndedEvent';
import { isDuplicateBidId } from './dedupeBidEvent';
import { applySnipeExtensionPolicy } from '../snipe/SnipeExtensionPolicy';
import { featureFlags } from '../../config/features';

export type DisplayTiming = {
  displayEndsAt: number;
  snipeExtended: boolean;
};

export function mergeNewBidIntoSummary(
  auction: AuctionSummary,
  event: NewBidEvent,
  seenBidIds: Set<string>,
  displayTimingById: Map<string, DisplayTiming>,
): AuctionSummary | null {
  if (event.auctionId !== auction.id) {
    return null;
  }
  if (isDuplicateBidId(seenBidIds, event.bid_id)) {
    return null;
  }
  if (event.amount <= auction.currentBid) {
    return null;
  }

  let timing = displayTimingById.get(auction.id) ?? {
    displayEndsAt: auction.endsAt,
    snipeExtended: false,
  };

  if (featureFlags.snipeProtection && auction.status === 'active') {
    const snipe = applySnipeExtensionPolicy(
      auction.endsAt,
      event.timestamp,
      timing.displayEndsAt,
    );
    timing = {
      displayEndsAt: snipe.displayEndsAt,
      snipeExtended: timing.snipeExtended || snipe.extended,
    };
    displayTimingById.set(auction.id, timing);
  }

  return {
    ...auction,
    currentBid: event.amount,
    currentBidder: event.bidder,
    bidCount: auction.bidCount + 1,
  };
}

export function mergeNewBidIntoDetail(
  auction: AuctionDetail,
  event: NewBidEvent,
  seenBidIds: Set<string>,
  displayTimingById: Map<string, DisplayTiming>,
): AuctionDetail | null {
  if (event.auctionId !== auction.id) {
    return null;
  }
  if (isDuplicateBidId(seenBidIds, event.bid_id)) {
    return null;
  }
  if (event.amount <= auction.currentBid) {
    return null;
  }

  let timing = displayTimingById.get(auction.id) ?? {
    displayEndsAt: auction.endsAt,
    snipeExtended: false,
  };

  if (featureFlags.snipeProtection && auction.status === 'active') {
    const snipe = applySnipeExtensionPolicy(
      auction.endsAt,
      event.timestamp,
      timing.displayEndsAt,
    );
    timing = {
      displayEndsAt: snipe.displayEndsAt,
      snipeExtended: timing.snipeExtended || snipe.extended,
    };
    displayTimingById.set(auction.id, timing);
  }

  const entry = {
    bidder: event.bidder,
    amount: event.amount,
    timestamp: event.timestamp,
  };

  const bidHistory = [...auction.bidHistory, entry].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  return {
    ...auction,
    currentBid: event.amount,
    currentBidder: event.bidder,
    bidHistory,
  };
}

export function mergeAuctionEndedIntoSummary(
  auction: AuctionSummary,
  event: AuctionEndedEvent,
  displayTimingById: Map<string, DisplayTiming>,
): AuctionSummary | null {
  if (event.auctionId !== auction.id) {
    return null;
  }
  displayTimingById.delete(auction.id);
  return {
    ...auction,
    status: 'ended',
    currentBid: event.finalPrice,
    currentBidder: event.winner,
  };
}

export function mergeAuctionEndedIntoDetail(
  auction: AuctionDetail,
  event: AuctionEndedEvent,
  displayTimingById: Map<string, DisplayTiming>,
): AuctionDetail | null {
  if (event.auctionId !== auction.id) {
    return null;
  }
  displayTimingById.delete(auction.id);
  return {
    ...auction,
    status: 'ended',
    currentBid: event.finalPrice,
    currentBidder: event.winner,
  };
}

export function applyEndedFromHttpConflict(
  auction: AuctionSummary,
  winner: string | null,
  finalPrice: number,
  displayTimingById: Map<string, DisplayTiming>,
): AuctionSummary {
  displayTimingById.delete(auction.id);
  return {
    ...auction,
    status: 'ended',
    currentBidder: winner,
    currentBid: finalPrice,
  };
}
