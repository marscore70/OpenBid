import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import {
  mergeNewBidIntoDetail,
  mergeNewBidIntoSummary,
} from "../../domain/auction/mergeNewBid";
import {
  outbidNotifier,
  shouldNotifyOutbid,
} from "../../features/notifications/outbidNotifier";
import { shouldNotifyOutbidWhenApplied } from "../../features/notifications/shouldNotifyOutbidWhenApplied";
import { loadBidderName } from "../../shared/storage/bidderStorage";
import {
  findAuctionTitleInList,
  readAuctionsList,
  updateAuctionSummaryInList,
} from "../../state/auctionsListAtom";
import {
  readAuctionDetail,
  updateLoadedAuctionDetail,
} from "../../state/auctionDetailAtom";
import type { ApplyNewBidPatchResult } from "./ApplyNewBidPatchResult";
import { bumpTimingVersion } from "./bidStreamAtoms";
import { displayTimingRegistry, seenBidIds } from "./bidStreamRegistries";

const noPatch: ApplyNewBidPatchResult = {
  amountApplied: false,
  snipeUpdated: false,
};

function readPreviousLeader(auctionId: string): string | null {
  const detail = readAuctionDetail(auctionId).data;
  if (detail) {
    return detail.currentBidder;
  }
  const match = readAuctionsList().data.find(
    (auction) => auction.id === auctionId,
  );
  return match?.currentBidder ?? null;
}

function auctionIsCached(auctionId: string): boolean {
  if (readAuctionDetail(auctionId).data) {
    return true;
  }
  return readAuctionsList().data.some((auction) => auction.id === auctionId);
}

function maybeNotifyOutbid(
  payload: NewBidEvent,
  amountApplied: boolean,
  previousLeader: string | null,
): void {
  const username = loadBidderName();
  const eligible = shouldNotifyOutbid(payload, username, previousLeader);
  if (!shouldNotifyOutbidWhenApplied(amountApplied, eligible)) {
    return;
  }
  outbidNotifier.notifyOutbid({
    auctionId: payload.auctionId,
    title: findAuctionTitleInList(payload.auctionId),
    amount: payload.amount,
  });
}

function displayEndsAtFor(auctionId: string, serverEndsAt: number): number {
  return displayTimingRegistry.get(auctionId, serverEndsAt).displayEndsAt;
}

function applyNewBidToList(payload: NewBidEvent): ApplyNewBidPatchResult {
  const match = readAuctionsList().data.find(
    (auction) => auction.id === payload.auctionId,
  );
  if (!match) {
    return noPatch;
  }

  const before = displayEndsAtFor(match.id, match.endsAt);
  let amountApplied = false;
  updateAuctionSummaryInList(payload.auctionId, (auction) => {
    const result = mergeNewBidIntoSummary(
      auction,
      payload,
      displayTimingRegistry,
    );
    amountApplied = result.applied;
    return result.auction;
  });
  const after = displayEndsAtFor(match.id, match.endsAt);
  return {
    amountApplied,
    snipeUpdated: before !== after,
  };
}

function applyNewBidToDetail(payload: NewBidEvent): ApplyNewBidPatchResult {
  const detailState = readAuctionDetail(payload.auctionId);
  if (!detailState.data) {
    return noPatch;
  }

  const detail = detailState.data;
  const before = displayEndsAtFor(detail.id, detail.endsAt);
  let amountApplied = false;
  updateLoadedAuctionDetail(payload.auctionId, (current) => {
    const result = mergeNewBidIntoDetail(
      current,
      payload,
      displayTimingRegistry,
    );
    amountApplied = result.applied;
    return result.auction;
  });
  const after = displayEndsAtFor(detail.id, detail.endsAt);
  return {
    amountApplied,
    snipeUpdated: before !== after,
  };
}

/** Dedupes bid_id only after the auction is cached; patches list/detail; notifies on leader loss. */
export function applyNewBidEvent(payload: NewBidEvent): void {
  if (seenBidIds.has(payload.bid_id)) {
    return;
  }
  // Do not consume when the auction is unloaded — a later load must still accept this id.
  if (!auctionIsCached(payload.auctionId)) {
    return;
  }
  if (seenBidIds.consume(payload.bid_id)) {
    return;
  }

  const previousLeader = readPreviousLeader(payload.auctionId);
  const listPatch = applyNewBidToList(payload);
  const detailPatch = applyNewBidToDetail(payload);
  const amountApplied = listPatch.amountApplied || detailPatch.amountApplied;

  maybeNotifyOutbid(payload, amountApplied, previousLeader);

  if (listPatch.snipeUpdated || detailPatch.snipeUpdated) {
    bumpTimingVersion();
  }
}
