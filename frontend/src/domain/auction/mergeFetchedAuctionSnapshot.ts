import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { unionBidHistory } from "./unionBidHistory";

/**
 * A REST fetch can resolve after newer SSE merges already advanced the
 * cached auction. Blindly overwriting the cache would lose that progress, so
 * a fetched snapshot only replaces the cache wholesale when it looks like a
 * genuine server reset (e.g. the in-memory mock restarting with the same
 * auction ids); otherwise it is merged monotonically.
 *
 * `endsAt` is deliberately NOT used as the reset signal — a legitimate
 * stacked snipe extension (see `backend/server.js`'s `applySnipeExtension`)
 * changes `endsAt` on the very same auction/epoch, so treating any `endsAt`
 * change as "new epoch" would let a stale/delayed GET response carrying an
 * older `endsAt` roll the cache's deadline backward. Instead, `endsAt` is
 * merged monotonically (`Math.max`) in the same-epoch branch below.
 *
 * A bare "fetched currentBid < cached currentBid" is NOT a safe reset signal
 * on its own: the mock server always serializes the live `auctions` state at
 * actual response-send time, so a GET that was in flight when a newer bid
 * landed can legitimately arrive at the client *after* that bid's SSE
 * broadcast, describing a real-but-older state that is behind the
 * SSE-advanced cache — not a restart (see the "stale fetch" tests below,
 * which this merge must keep protecting). Server `currentBid` is otherwise
 * monotonically non-decreasing for the lifetime of a process, so the only
 * way a fetch can show it having regressed all the way back to `startPrice`
 * is a genuine restart; that is the narrower, safe signal used here. (A
 * restart caught on a *later* fetch — after a post-restart bid already
 * landed — is not detected by this check; a full page reload already covers
 * that case by discarding the stale cache entirely.)
 */
function isServerReset(
  cached: Pick<AuctionSummary, "currentBid">,
  fetched: Pick<AuctionSummary, "currentBid" | "startPrice">,
): boolean {
  return (
    fetched.currentBid < cached.currentBid &&
    fetched.currentBid <= fetched.startPrice
  );
}

function resolveMonotonicStatus(
  cachedStatus: AuctionStatus,
  fetchedStatus: AuctionStatus,
): AuctionStatus {
  return cachedStatus === AuctionStatus.Ended ? cachedStatus : fetchedStatus;
}

export function mergeFetchedAuctionSummary(
  cached: AuctionSummary | undefined,
  fetched: AuctionSummary,
): AuctionSummary {
  if (!cached || isServerReset(cached, fetched)) {
    return fetched;
  }

  const bidAdvanced = fetched.currentBid > cached.currentBid;
  return {
    ...fetched,
    status: resolveMonotonicStatus(cached.status, fetched.status),
    currentBid: bidAdvanced ? fetched.currentBid : cached.currentBid,
    currentBidder: bidAdvanced ? fetched.currentBidder : cached.currentBidder,
    // Tied to the same branch as currentBid/currentBidder: bidCount only
    // moves in lockstep with a genuinely-ahead fetch, never independently
    // (an independent Math.max could adopt a stale fetch's bidCount whenever
    // it happened to be numerically higher than the cache for any reason).
    bidCount: bidAdvanced ? fetched.bidCount : cached.bidCount,
    // endsAt only ever advances: a stale GET can't roll back an extension
    // an SSE merge already applied, but a genuinely newer extension (this
    // fetch raced ahead of the client's own SSE) is still adopted.
    endsAt: Math.max(cached.endsAt, fetched.endsAt),
  };
}

export function mergeFetchedAuctionDetail(
  cached: AuctionDetail | null,
  fetched: AuctionDetail,
): AuctionDetail {
  if (!cached || isServerReset(cached, fetched)) {
    return fetched;
  }

  const bidAdvanced = fetched.currentBid > cached.currentBid;
  return {
    ...fetched,
    status: resolveMonotonicStatus(cached.status, fetched.status),
    currentBid: bidAdvanced ? fetched.currentBid : cached.currentBid,
    currentBidder: bidAdvanced ? fetched.currentBidder : cached.currentBidder,
    bidHistory: unionBidHistory(cached.bidHistory, fetched.bidHistory),
    endsAt: Math.max(cached.endsAt, fetched.endsAt),
  };
}
