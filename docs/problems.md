# Known problems / limitations

Tracked findings from frontend code review. Items marked **Fixed** are retained for history. Open items remain relevant on the current jotai-family + Axios + BidStream architecture (post outbidNotifier / apply SRP / thin provider).

---

## Critical

1. **Unvalidated REST/SSE payloads can corrupt auction state** — `parseSseData` type-asserts `as NewBidEvent` / `as AuctionEndedEvent`; `auctionsService` / `bidService` similarly assert without Zod field checks. A malformed `new_bid` (missing/`undefined` `amount`, `auctionId`, or `bid_id`) can write `undefined` into `currentBid`, break `validateBidAmount` / `minimumAllowedBid` (`NaN` mins), or collapse dedupe onto `seenBidIds.consume(undefined)` / non-string ids that never match later. Form input is sanitized; network data is not.

---

## High

2. **Cold-start “reconnect” reconcile** — `BidStreamService.connect()` reports `Connected` before `EventSource` `open` when `reconnectAttempt === 0`. `useBidStreamSubscription` treats the subsequent real `open` as a second `Connected` while `wasConnected` is already true → `reconcileAfterReconnect()` runs on every cold start (and Strict Mode remount). Extra list + all tracked detail refetches; amplifies stale-overwrite races (#3).

3. **SSE vs refetch last-write-wins races** — `fetchAuctionsList` / `fetchAuctionDetail` have no request generation / etag. Reconnect reconcile, place-bid success refetch, and manual refresh can overwrite newer SSE merges when responses arrive late. Dual in-flight fetches for the same detail id are unsafe.

4. **HTTP 400 outbid patch incomplete** — Updates `currentBid` on list + detail only; does not set `currentBidder` or append detail history. UI can show wrong leader until SSE arrives (and SSE may also no-op if amounts already match).

5. ~~**SSE list updates remap the entire catalog**~~ — **Fixed:** SSE apply uses `updateAuctionSummaryInList` for the matching id only.

6. **No authentication** — `bidder` is client-supplied (localStorage + body). Anyone can impersonate any display name. Acceptable for mock API assignment; not production identity.

7. **Sanitization gap on network strings** — SSE/REST `bidder` / `title` / `winner` are not run through the bidder Zod pipeline before atom merge / toast / display (React text escaping mitigates HTML XSS; inconsistent trust vs form input).

---

## Medium

9. **`seenBidIds` never pruned** — grows for the tab lifetime (long sessions → unbounded memory).

10. **Jotai `atomFamily` retention** — `listTrackedAuctionDetailIds` + `atomFamily` entries are never removed; visiting many auctions retains detail atoms forever. Reconnect refetches _all_ tracked ids. (`jotai-family` migration fixed the deprecated import only; leak remains.)

11. **Outbid notify heuristic** — notifies on every foreign bid after any local participation (`getMyLastBid` defined), not only when the user was the previous leader.

12. **My Bids sidebar storage reads** — `loadBidderName()` / `getMyLastBid()` during render without a storage subscription; can lag until an unrelated re-render (usually rescued by list atom updates after place-bid).

13. **N countdown timers** — each `AuctionCard` / detail mounts its own `setInterval(1000)`.

14. **Visual “Ended” vs server Active** — countdown / `auctionVisualStatus` can show ended while `BidForm` stays enabled until `status === Ended`.

15. **Client-only snipe extension** — display timer can disagree with server `endsAt` (bonus by design); integrity/UX caveat. Dual list+detail `applySnipeDisplayTimingOnBid` on the same event is usually idempotent after +15s but couples both merges to the shared registry.

16. **Plain HTTP default API** — `getApiBaseUrl()` defaults to `http://localhost:3005` with no production scheme/host allowlist.

17. **localStorage trust** — `loadBidderName()` / `loadMyBids()` do not re-validate shapes on load (same-origin; low risk unless prior XSS). `loadMyBids` asserts `as StoredMyBid[]`.

18. **Production nginx hardening** — `frontend/Dockerfile` uses stock nginx without CSP / `frame-ancestors` / `X-Frame-Options`.

19. **Place-bid success detail lag** — list patched optimistically; detail only `fetchAuctionDetail` (no optimistic detail patch). Stale current bid/history until fetch or SSE wins.

20. **Catalog error UI has no retry** — error branch renders `Message` only; Refresh exists only on the success path.

21. **Axios / place-bid success body unchecked** — `placeBid` returns `data` as `PlaceBidSuccess` without runtime validation of `bid_id` / `currentBid`.

22. ~~**Docs drift** — `docs/plan.md` still describes TanStack Query + query-cache patches~~ — **Fixed:** plan stack/architecture/decision log aligned to jotai + Axios services + BidStream.

23. **HTTP status magic numbers** — `400` / `409` inlined in `usePlaceBid` / `getBidErrorMessage` instead of shared const/enum (e.g. alongside `HttpError`).

33. ~~**Outbid toast before merge / independent of apply success**~~ — **Fixed:** `applyNewBidEvent` merges list/detail first; `mergeNewBid*` returns `{ auction, applied }`; toast only via `shouldNotifyOutbidWhenApplied` when amount applied.

34. **`useBidStream` over-subscribes consumers** — facade always reads `connectionStatusAtom` + `timingVersionAtom`. Every `AuctionCard`, `BidForm`, and `usePlaceBid` re-renders on any connection-status change or any auction’s snipe bump, even when the consumer only needs `enableNotificationSound` / `clearDisplayTiming` / timing for one id. Global `timingVersion` is a coarse invalidation hammer.

35. ~~**`enableSound` recreates `AudioContext` every call**~~ — **Fixed:** `outbidNotifier.enableSound` creates once and resumes if suspended.

36. **Deep-link detail without catalog fetch** — when `myBidsTracker` is off, `useAuctionList` never mounts on `/auctions/:id`. List stays empty → `applyNewBidToList` no-ops, outbid titles fall back to `"Auction"`, until user visits catalog or cold-start/reconnect reconcile runs `fetchAuctionsList`.

---

## Low

24. **Fallback title magic string** — `findAuctionTitleInList` returns `"Auction"` when missing from list.

25. **`isPlaceBidHttpError`** — thin alias of `isHttpError`; little value.

26. **`useAuctionDetail` empty id** — `id ?? ""` still subscribes to `auctionDetailAtomFamily("")` when param missing.

27. **Quote / style inconsistency** — mixed `'` / `"` across modules.

28. **Narrow double-submit window** — `isPending` disables the button after re-render; rapid double-click before paint can still fire two POSTs.

29. **`deriveMyBidStatus` tie edge** — `myLastBid >= currentBid` can report Winning when `currentBidder` is someone else (unlikely with strict greater-than bids).

30. ~~**Nested map callbacks on hot SSE path**~~ — **Fixed** with single-id `updateAuctionSummaryInList` (see #5).

37. **`auction_ended` timing clear is merge-gated** — `displayTimingRegistry.clear` runs only inside `mergeAuctionEndedInto*` when that auction exists in list/detail. If neither has data, an orphaned snipe entry can linger until another clear path.

38. **Duplicate outbid guards** — `shouldNotifyOutbid` and `notifyOutbid` both re-check feature flag, username, and `getMyLastBid`; `notifyOutbid` alone does not filter own bids (relies on caller).

---

## Fixed (do not reopen unless regression)

- **Auction ID URL encoding** — `auctionsService.getById` uses `encodeURIComponent(id)`.
- **HTTP 409 end-path timing** — `usePlaceBid` calls `clearDisplayTiming(auctionId)` from BidStream context (no throwaway Map).
- **Snipe `timingVersion` list-only** — apply path bumps timing when list _or_ detail merge changes display timing.
- **Place-bid success list sync** — success path patches list `currentBid` / `currentBidder` / `bidCount` (when ahead of SSE) and refetches detail.
- **Place-bid success `bidCount` race** — increments only when HTTP result is ahead of list `currentBid`, avoiding double-count when SSE arrives first.
- **Axios client timeout** — `apiClient` uses `timeout: 30_000`.
- **React Query removal** — no `@tanstack/react-query` usage; jotai list + `atomFamily` detail.
- **`mergeAuctionState` facade removal** — merges live in `mergeNewBid` / `mergeAuctionEnded`; tests target those helpers.
- **DisplayTiming registry API** — `get(auctionId, serverEndsAt) => DisplayTiming` single return type; readonly frozen entries.
- **SSE single-id list patch** — `applyNewBidEvent` / `applyAuctionEndedEvent` use `updateAuctionSummaryInList`.
- **Outbid toast EventEmitter** — module singleton `outbidNotifier.subscribe` / `notifyOutbid`; AppShell unsubscribes on unmount; `useOutbidNotifierBridge` removed.
- **BidStream without callback soup** — `connectionStatusAtom` / `timingVersionAtom` + module registries; `BidStreamProvider` only starts SSE.
- **`applySseEventToAuctionAtoms` SRP split** — thin facade + `applyNewBidEvent` / `applyAuctionEndedEvent`.
- **`atomFamily` → `jotai-family`** — deprecated `jotai/utils` import removed (retention leak #10 still open).
- **Docs plan drift (#22)** — `docs/plan.md` stack/architecture/decision log uses jotai + Axios + BidStream (not TanStack Query).
- **Outbid toast after apply (#33)** — notify only when list/detail merge reports `applied`; pure `shouldNotifyOutbidWhenApplied` gate.
- **`enableSound` AudioContext reuse (#35)** — create once; resume if suspended.

---

## Testing gaps (still open)

31. No integration/unit coverage for:
    - `applySseEventToAuctionAtoms` / `applyNewBidEvent` / `applyAuctionEndedEvent` (dual list+detail, dedupe once, snipe `timingVersion`)
    - `reconcileAfterReconnect` / cold-start false reconnect
    - `usePlaceBid` success / 400 / 409 (including `bidCount` HTTP-before-SSE case)
    - `parseSseData` rejection of malformed payloads
    - outbid notifier “previous leader” vs “any participation”
    - `BidForm` disabled / pending / validation UX
    - `BidStreamService` status transitions (`Connected` only after `open`)
    - fetch race / generation guards (if added)
    - `useBidStream` subscription surface (who re-renders on status/timing)

Covered in phase 1 domain/unit tests: merge `applied` flag, `shouldNotifyOutbidWhenApplied` (notify only when amount applied), DisplayTiming registry freeze/isolation, countdown, visual status, dedupe, bidder sanitize, bid amount Zod.
