# Known problems / limitations

Tracked findings from frontend code review. Items marked **Fixed** are retained for history. Open items remain relevant on the current jotai-family + Axios + BidStream architecture (post outbidNotifier / apply SRP / thin provider).

---

## Critical

1. ~~**Unvalidated REST payloads can corrupt auction state**~~ — **Partially fixed 2026-07-17, `new_bid` SSE gap closed 2026-07-18:** `auctionsService.getAll`/`getById` parse every response through Zod schemas (`auctionSummarySchema`/`auctionSummaryListSchema`/`auctionDetailSchema` in `auctionSchemas.ts`) before returning; a malformed/missing `endsAt`, `currentBid`, `bidCount`, or `status` throws instead of reaching `mergeFetchedAuctionSummary`/`mergeFetchedAuctionDetail`. As part of the authoritative anti-snipe work (see #15), `parseSseData` (`parseSseMessage.ts`) no longer type-asserts `new_bid` — it now runs every payload through `newBidEventSchema` (`sseEventSchemas.ts`) and returns `Ignored` on a malformed `auctionId`/`bidder`/`amount`/`previousBid`/`timestamp`/`bid_id`/`endsAt` instead of adopting an unsafe value (this was required for `endsAt`, which has no downstream guard the way `amount` does). **Remaining gap (still open):** `auction_ended` is still type-asserted (`as AuctionEndedEvent`) with no Zod check — lower risk than `new_bid` since `mergeAuctionEnded*` only sets `status`/`currentBid`/`currentBidder` from it and a malformed value can't roll back an already-higher `currentBid` display, but it is not yet schema-validated. `bidService.placeBid`'s success body is also still un-validated (see #21).

---

## High

2. ~~**Cold-start “reconnect” reconcile**~~ — **Fixed:** `BidStreamService.connect()` no longer reports any status before `open` on a cold start (`reconnectAttempt === 0`); `Connected` is only ever emitted from the real `open` handler, so `useBidStreamSubscription`'s `wasConnected` guard sees exactly one `Connected` per real connection and `reconcileAfterReconnect()` no longer fires on cold start or Strict Mode remount.

3. ~~**SSE vs refetch last-write-wins races**~~ — **Fixed:** `fetchAuctionsList` / `fetchAuctionDetail` now allocate a monotonic generation per resource (`RequestGenerationGuard`, keyed by auction id for detail) and discard any response/error that is no longer the latest in-flight request for that key. On commit, fetched snapshots are merged with `mergeFetchedAuctionSummary` / `mergeFetchedAuctionDetail` instead of overwriting the cache: a different `endsAt` is treated as a new epoch (accept wholesale), otherwise `currentBid`/`currentBidder`/`bidCount` only advance and `bidHistory` is unioned by `(bidder, amount, timestamp)` — so a stale REST response can never roll back a newer SSE merge. Remaining gap: this protects fetch-commit vs fetch-commit and fetch-commit vs SSE; it does not add generation/etag protection to the SSE apply path itself (not needed — SSE merges are already monotonic via `mergeNewBid*`'s `applied` check).
   ~~_Caveat (2026-07-17):_ this merge logic previously ran on an unvalidated REST payload — a malformed `endsAt` from the server could still misfire the "new epoch" branch and wholesale-overwrite the monotonic merge this fix relies on, until a Zod boundary landed on `auctionsService`.~~ **Caveat resolved 2026-07-17:** `auctionsService.getAll`/`getById` now Zod-validate every response before it reaches this merge (see #1), so the epoch/monotonic logic here only ever sees a well-formed `endsAt`/`currentBid`/`bidCount`.

4. **HTTP 400 outbid patch incomplete** — Updates `currentBid` on list + detail only; does not set `currentBidder` or append detail history. UI can show wrong leader until SSE arrives (and SSE may also no-op if amounts already match).

5. ~~**SSE list updates remap the entire catalog**~~ — **Fixed:** SSE apply uses `updateAuctionSummaryInList` for the matching id only.

6. **No authentication** — `bidder` is client-supplied (localStorage + body). Anyone can impersonate any display name. Acceptable for mock API assignment; not production identity.
   _Reaffirmed 2026-07-17 (security review):_ still accurate. `deriveMyBidStatus`/`collectMyBidEntries` (My Bids Stale work) compare `auction.currentBidder === username` using the same unauthenticated `loadBidderName()` string — a spoofed/shared name affects only the local "My Bids" judgment (client-side display), not server state, so no new escalation, but the underlying identity gap is unchanged.

7. **Sanitization gap on network strings** — SSE/REST `bidder` / `title` / `winner` are not run through the bidder Zod pipeline before atom merge / toast / display (React text escaping mitigates HTML XSS; inconsistent trust vs form input).
   _Reaffirmed 2026-07-17 (security review):_ still accurate. `mergeFetchedAuctionSummary`/`mergeFetchedAuctionDetail`/`unionBidHistory` merge `currentBidder`/`bidder` strings straight from the fetched/SSE payload with no schema check before they reach `MyBidsSidebar`/`AuctionDetailPage` JSX; still relies entirely on React's default text escaping, not explicit sanitization.

39. ~~**`axios@1.11.0` has multiple known high-severity CVEs`**~~ — **Fixed 2026-07-17:** `axios` pinned (exact, matching the existing `zod` pin style) to `1.18.1`, past the vulnerable `1.0.0 - 1.15.2` range covering the SSRF / prototype-pollution / ReDoS / DoS advisories `npm audit` previously reported. `npm audit` now reports 0 vulnerabilities.

---

## Medium

9. **`seenBidIds` never pruned** — grows for the tab lifetime (long sessions → unbounded memory).

10. **Jotai `atomFamily` retention** — `listTrackedAuctionDetailIds` + `atomFamily` entries are never removed; visiting many auctions retains detail atoms forever. Reconnect refetches _all_ tracked ids. (`jotai-family` migration fixed the deprecated import only; leak remains.)

11. **Outbid notify heuristic** — notifies on every foreign bid after any local participation (`getMyLastBid` defined), not only when the user was the previous leader.

12. **My Bids sidebar storage reads** — `loadBidderName()` / `getMyLastBid()` during render without a storage subscription; can lag until an unrelated re-render (usually rescued by list atom updates after place-bid).

13. **N countdown timers** — each `AuctionCard` / detail mounts its own `setInterval(1000)`.

14. **Visual “Ended” vs server Active** — countdown / `auctionVisualStatus` can show ended while `BidForm` stays enabled until `status === Ended`.

15. ~~**Client-only snipe extension**~~ — **Fixed 2026-07-18 (implemented under a one-time backend exception):** the anti-snipe extension is now backend-authoritative and stacks. Do not reopen unless a regression is found; see the "Fixed" writeup below for the exact change and residual limitations.

    **One-time exception (this feature only, now used):** the user explicitly granted permission to modify **only** `backend/server.js` for this feature; the "never touch the backend" rule otherwise stands and reverted immediately after this change — no other backend file was touched in this turn.

    **Backend (`backend/server.js`) — implemented:**
    - Lines 83–99: `SNIPE_WINDOW_MS = 10_000` / `SNIPE_EXTENSION_MS = 15_000` constants and `applySnipeExtension(auction, bidTimestamp)`: `if (remaining > 0 && remaining < SNIPE_WINDOW_MS) { auction.endsAt += SNIPE_EXTENSION_MS; }` where `remaining = auction.endsAt - bidTimestamp`. Reusing `auction.endsAt` (already reflecting any prior extension) on every call is what makes stacking work for free — no separate "extension count" state.
    - Lines 176–195 (bot interval) and lines 290–316 (`POST /api/bid`): both now capture one `const bidTimestamp = Date.now()` per accepted bid, reused for the `bidHistory` timestamp, the `applySnipeExtension` check, the `bid_id`, and the `new_bid` broadcast `timestamp` (previously several independent `Date.now()` calls per site). Both call `applySnipeExtension(auction, bidTimestamp)` right after the mutation and before `broadcast("new_bid", …)`, and both now add `endsAt: auction.endsAt` to that broadcast — the only wire-contract change (no new endpoint/event/dependency; GET endpoints already returned `endsAt`; the POST 200 body is deliberately unchanged since the placing client already reconciles via its own SSE subscription and the existing post-success `fetchAuctionDetail` GET).
    - **Quirks preserved:** QUIRK1 — `bidTimestamp` is still read at mutation time (post-delay), unchanged behavior. QUIRK2 — the duplicate resend is the same `msg` string (same `endsAt`), and the frontend dedupes by `bid_id` before any merge, so a duplicate can't double-extend. QUIRK3 — 409-on-ended unchanged; extension only ever postpones the existing 1s end-sweep (`Date.now() >= a.endsAt`), which reads the same mutated field and needed no changes. QUIRK4 — unaffected; see the frontend guard below. QUIRK5/6/7 — untouched.
    - **Risk (accepted, not mitigated, pre-existing):** no auth (see #6) means one bidder can indefinitely extend an auction they're already winning via a second identity in the closing window. Not newly introduced by this feature (it's the same "no identity" gap), but this feature makes its effect ("auction never closes") more visible. Out of scope to fix under "keep backend change minimal and feature-scoped."
    - Verification: `node --check backend/server.js` passes. The mock server could not be restarted mid-session to avoid disrupting the running dev environment (see Verification below), so behavior was confirmed by direct code inspection plus full frontend unit coverage of the client side of the contract; manual verification command recorded in the Verification section of this pass.

    **Frontend — implemented (`frontend/src`):**
    - `shared/types/NewBidEvent.ts` — added required `endsAt: number`.
    - `infrastructure/sse/sseEventSchemas.ts` (new) + `infrastructure/sse/parseSseMessage.ts` — `new_bid` payloads are now Zod-validated (`newBidEventSchema`, mirroring the existing `auctionSchemas.ts` REST pattern) at the parser boundary; a malformed event (bad/missing `endsAt`, `bid_id`, `amount`, etc.) is dropped (`Ignored`) instead of ever reaching the merge layer with an unsafe value. This closes the specific `endsAt` instance of the gap noted in #1 (the rest of #1's gap — `AuctionEndedEvent` and the POST success body — remains open by design; out of scope for this pass).
    - `domain/auction/mergeNewBid.ts` — on the existing `applied` branch, adopts `Math.max(auction.endsAt, event.endsAt)` as the merged `endsAt`. The `Math.max` is a defensive backstop; the real non-regression guarantee is the pre-existing `event.amount > auction.currentBid` gate, which already makes a stale/out-of-order event with a smaller amount a no-op that can't touch `endsAt` (or anything else) at all — this is how QUIRK4 (out-of-order SSE) stays safe with no new code.
    - `domain/snipe/SnipeExtensionPolicy.ts` — the additive `applySnipeExtensionPolicy` (`+= 15_000` on the client) and its `SnipeExtensionResult` type were deleted; only `resolveDisplayEndsAt` remains. Doing the addition on **both** sides was exactly the "double extension" risk named in the original requirements — the fix is deleting the client addition, not trying to keep two arithmetics in sync.
    - `domain/auction/applySnipeDisplayTimingOnBid.ts` — simplified to a pure comparison: if the merge's `nextEndsAt` is greater than the auction's previous `endsAt`, set `{ displayEndsAt: nextEndsAt, snipeExtended: true }` on the existing `DisplayTimingRegistry` entry (sticky — a later non-extending bid does not clear it; only `auction_ended`'s existing `timingRegistry.clear` does). No arithmetic left on the client.
    - `domain/auction/mergeFetchedAuctionSnapshot.ts` — **the epoch/reset detector had to change, and the literal architecture suggestion ("any `currentBid` decrease = reset") turned out to be unsafe on its own**: this codebase already protects against an ordinary stale-GET-vs-SSE race (see #3 / plan.md 2026-07-17) where a `GET` in flight when a newer bid lands can legitimately arrive *after* that bid's SSE broadcast, showing a real-but-older `currentBid` below the SSE-advanced cache — that is not a restart, and the existing regression tests for it (`mergeFetchedAuctionSnapshot.test.ts`, `auctionsListAtom.test.ts`) construct exactly that scenario. A bare "currentBid decreased" signal misclassifies it as a reset and wholesale-overwrites the cache, breaking those tests. The implemented, narrower signal requires the fetched `currentBid` to have regressed all the way back to `startPrice` (server `currentBid` is otherwise monotonically non-decreasing for the life of a process, so reaching `startPrice` after having been higher is only possible right after a genuine restart). `endsAt` is merged via `Math.max(cached.endsAt, fetched.endsAt)` in the non-reset branch, so a stale GET can never roll the deadline backward while a fetch that raced ahead of the client's own SSE (carrying a newer extension) is still adopted. **Residual limitation:** a restart caught on a *later* GET (after a post-restart bot bid already pushed `currentBid` back above `startPrice`) is not detected by this check and could retain a stale pre-restart cached value until a full reload/remount discards the cache outright — acceptable for an in-memory mock server whose only realistic "restart" is a local dev-process bounce, and consistent with the pre-existing documented workaround ("tolerate restart; refetch on load").
    - `features/auction-detail/AuctionDetailPage.tsx` — dropped "(display only)" from the "Snipe protection: time extended" tag (now true); `AuctionCard.tsx` already said "Time extended" with no changes needed.
    - `AuctionCard.tsx` / `useCountdownTick.ts` / `resolveDisplayEndsAt` — unchanged, as predicted: `DisplayTiming.displayEndsAt` now always tracks the authoritative `auction.endsAt`, so `resolveDisplayEndsAt`'s `Math.max` is a harmless no-op.
    - Net effect: countdown, the "Time extended" tag, and the bid form's `disabled` (already keyed off server `status`, unaffected) all read from one authoritative number with no separate "display" layer left to disagree with it.

    **My Bids requirement (verified, no change needed):** `shouldClearMyBidsAfterListReconcile`, wired into `fetchAuctionsList` against the *raw* pre-merge fetched list, already implements exactly the requested rule (confirmed against its existing unit tests, plus the pre-existing integration test in `auctionsListAtom.test.ts` proving a successful list reconcile actually invokes the clear). Orthogonal to the anti-snipe feature (`currentBid`, not `endsAt`); no changes made.

16. **Plain HTTP default API** — `getApiBaseUrl()` defaults to `http://localhost:3005` with no production scheme/host allowlist.
    _Reaffirmed 2026-07-17 (security review):_ still accurate, unchanged by this phase.

17. ~~**localStorage trust — `loadMyBids` asserts `as StoredMyBid[]`**~~ — **Fixed:** `loadMyBids` now runs each entry through a Zod `storedMyBidSchema` (`auctionId` non-empty string, `amount` finite positive, `timestamp` finite) and drops/logs invalid ones instead of trusting the cast. `loadBidderName()` still returns a raw string with no shape to validate (low risk).
    _Reaffirmed 2026-07-17 (security review):_ confirmed fixed — read the current `bidderStorage.ts` and `bidderStorage.test.ts`; `parseStoredMyBids` safe-parses every entry and the test suite covers corrupt JSON, non-array, and per-field-invalid entries (empty `auctionId`, negative `amount`, non-numeric `amount`, missing fields, `null`, bare string). `getMyLastBid`/`collectMyBidEntries`/`deriveMyBidStatus` (My Bids Stale) all consume `loadMyBids()`, so they inherit this validation — no new unvalidated read path was introduced. Still correctly marked Fixed.

18. **Production nginx hardening** — `frontend/Dockerfile` uses stock nginx without CSP / `frame-ancestors` / `X-Frame-Options`.
    _Reaffirmed 2026-07-17 (security review):_ still accurate, `frontend/Dockerfile` unchanged.

19. **Place-bid success detail lag** — list patched optimistically; detail only `fetchAuctionDetail` (no optimistic detail patch). Stale current bid/history until fetch or SSE wins.

20. **Catalog error UI has no retry** — error branch renders `Message` only; Refresh exists only on the success path.

21. **Axios / place-bid success body unchecked** — `placeBid` returns `data` as `PlaceBidSuccess` without runtime validation of `bid_id` / `currentBid`.

22. ~~**Docs drift** — `docs/plan.md` still describes TanStack Query + query-cache patches~~ — **Fixed:** plan stack/architecture/decision log aligned to jotai + Axios services + BidStream.

23. **HTTP status magic numbers** — `400` / `409` inlined in `usePlaceBid` / `getBidErrorMessage` instead of shared const/enum (e.g. alongside `HttpError`).

33. ~~**Outbid toast before merge / independent of apply success**~~ — **Fixed:** `applyNewBidEvent` merges list/detail first; `mergeNewBid*` returns `{ auction, applied }`; toast only via `shouldNotifyOutbidWhenApplied` when amount applied.

34. **`useBidStream` over-subscribes consumers** — facade always reads `connectionStatusAtom` + `timingVersionAtom`. Every `AuctionCard`, `BidForm`, and `usePlaceBid` re-renders on any connection-status change or any auction’s snipe bump, even when the consumer only needs `enableNotificationSound` / `clearDisplayTiming` / timing for one id. Global `timingVersion` is a coarse invalidation hammer.

35. ~~**`enableSound` recreates `AudioContext` every call**~~ — **Fixed:** `outbidNotifier.enableSound` creates once and resumes if suspended.

36. **Deep-link detail without catalog fetch** — when `myBidsTracker` is off, `useAuctionList` never mounts on `/auctions/:id`. List stays empty → `applyNewBidToList` no-ops, outbid titles fall back to `"Auction"`, until user visits catalog or cold-start/reconnect reconcile runs `fetchAuctionsList`.

40. ~~**SSE permanent give-up has no recovery path beyond a reload**~~ — **Fixed 2026-07-17:** `ConnectionStatusBadge` now labels the gave-up state "Offline" (was the more technical "Disconnected") and renders a "Retry" action once `onRetry` is provided; `useBidStream().retryConnection` calls `bidStreamService.start()`, restarting a fresh cold-start connection attempt without a full page reload. Wired in `AppShell` so it is always visible next to the badge. Bid integrity is unaffected either way (stale bids still get a server-side 409); this closes the "no way to recover short of a reload" gap.

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

41. ~~**Error UI leaks internal API shape**~~ — **Fixed 2026-07-17 (method/path leak only):** a new `toSafeErrorMessage` helper (`shared/errors/toSafeErrorMessage.ts`) maps any `HttpError` to a short generic message ("Something went wrong…" / a connectivity message for network failures) instead of its raw `` `${method} ${path} failed (${status})` `` text; `auctionsListAtom`/`auctionDetailAtom`'s fetch-failure `errorMessage` and `usePlaceBid`'s `getBidErrorMessage` fallback (for bid failures with no server `body.error`, e.g. an unexpected 500) now go through it, while `logger.error` still logs the raw `error` (full method/path/status) for diagnostics. **Deliberately left unchanged:** `getBidErrorMessage`'s 400/409 branches still surface the server's `body.error` verbatim — that is the intended "clear 400/409 message" UX (plan §3 MUST requirement), not a route/method leak, and rewriting it was out of scope for this pass.

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
- **Cold-start false reconcile (#2)** — see High section; `Connected` only from the real `open` handler.
- **SSE vs refetch races (#3)** — see High section; request-generation guard + monotonic fetch-commit merge.
- **localStorage `loadMyBids` trust (#17)** — see Medium section; Zod-validated on load.
- **Catalog/detail background refetch failure was destructive** — a failed reconnect-reconcile or manual refresh refetch used to overwrite an already-loaded catalog/detail with a full-page error. `fetchAuctionsList` / `fetchAuctionDetail` now only surface `LoadStatus.Error` when there is no data to fall back on; otherwise `status` stays `Success`, `data` is untouched, and `errorMessage` carries a non-destructive inline warning (`AuctionCatalogPage` / `AuctionDetailPage` render it via `Message severity="warn"` above the existing content).
- **Unbounded SSE reconnect retries** — `BidStreamService` now gives up after `MAX_RECONNECT_ATTEMPTS` (8) consecutive failures: reports `Disconnected` and stops scheduling further attempts (a full page reload starts a fresh cold-start attempt count). Backoff delay/curve unchanged.
- **My Bids: no way to represent a mismatched stored bid** — added `MyBidStatus.Stale` (removed the unused `MyBidStatus.Active`). `deriveMyBidStatus` is now a pure, single-return-type function: auction absent from a `Success` list → `Stale`; active auction with a stored amount above `currentBid` → `Stale`; `Ended` → never `Stale` (existing `Won`/`Lost`); otherwise existing `Winning`/`Outbid`. Per-mismatch entries stay in `localStorage` (Stale, no automatic delete of individual stale rows). `collectMyBidEntries` was inverted to iterate `loadMyBids()` once against a single `Map` of auctions (was O(n·m) repeated `getMyLastBid` re-parses of `localStorage`) and now skips judgment entirely (renders nothing yet) for an auction that is absent while the list has not yet loaded successfully — a live/found auction is still judged normally even mid-refetch, since `data` is retained during background reloads. `MyBidsSidebar` shows `Stale` with `warning` severity. Manual "clear stale" was scoped as nice-to-have and skipped (no cheap, safe UI slot for it without a larger sidebar redesign).
- **My Bids: clear-all after server reset signal (2026-07-18)** — after a successful validated `GET /api/auctions` commit, `fetchAuctionsList` runs `shouldClearMyBidsAfterListReconcile(loadMyBids(), fetched)` against the **raw** fetched list (before monotonic merge) and, when true, `clearMyBids()` removes the storage key. Clear iff ≥1 valid stored bid, every stored `auctionId` exists in that list, and every stored amount is strictly `>` that auction’s server `currentBid`. Missing ids → no clear (Stale remains). Any amount `<=` server `currentBid` → no clear. Empty storage → no clear/write. Failed or generation-superseded fetches never clear. Orthogonal to anti-snipe (`currentBid`, not `endsAt`); unaffected by the #15 backend change made in a later pass.
- **REST auction payload Zod validation (#1 partial)** — see Critical section; `auctionSchemas.ts` + `auctionsService.ts`.
- **`bidCount` merge tied to `bidAdvanced` (not an independent `Math.max`)** — `mergeFetchedAuctionSummary` previously let a stale-but-numerically-higher fetched `bidCount` win via `Math.max(cached.bidCount, fetched.bidCount)` even when `currentBid`/`currentBidder` correctly stayed on the cached (newer) value. `bidCount` now moves in lockstep with the same `bidAdvanced` branch as `currentBid`/`currentBidder`.
- **`deriveMyBidStatus` tie edge (#29)** — a tie (`myLastBid === currentBid`) with someone else as `currentBidder` now reports `Outbid`, not `Winning`; leadership is decided by `currentBidder` alone, never by amount comparison. The now-redundant `myLastBid >= currentBid` branch was removed.
- **`MyBidsSidebar` exhaustive status maps** — `severityForStatus`/`labelForStatus` now index `Record<MyBidStatus, …>` lookups (compile-time exhaustive; drops the unreachable `default: "secondary"`) instead of a `switch` with a dead default, and labels are consistently capitalized ("Winning", "Outbid", "Won", "Lost", "Stale" — was the raw lowercase status string for everything except `Stale`).
- **Duplicate `Reconnecting` emission** — `BidStreamService.connect()` no longer sets `Reconnecting` itself; only `scheduleReconnect()` does, once per retry cycle, right before the backoff timer starts.
- **`axios@1.11.0` CVEs (#39)** — see High section; pinned to `1.18.1`, `npm audit` clean.
- **SSE permanent give-up recovery (#40)** — see Medium section; `ConnectionStatusBadge` "Offline" + "Retry" wired to `bidStreamService.start()` via `useBidStream().retryConnection`.
- **Error UI method/path leak (#41)** — see Medium section; `toSafeErrorMessage` maps `HttpError` to a short safe message at the catalog/detail fetch-failure and generic-bid-failure call sites; server-authored 400/409 bid messages are intentionally untouched.
- **Client-only snipe extension (#15)** — see Medium section; backend now owns and stacks the actual `endsAt` extension (`backend/server.js` `applySnipeExtension`, one-time exception), the frontend adopts it monotonically and only sets a display flag, and the fetch-merge reset detector was fixed so a legitimate extension is never mistaken for a server restart.

---

## Testing gaps (still open)

31. No integration/unit coverage for:
    - `applySseEventToAuctionAtoms` / `applyNewBidEvent` / `applyAuctionEndedEvent` (dual list+detail, dedupe once, snipe `timingVersion`)
    - `usePlaceBid` success / 400 / 409 (including `bidCount` HTTP-before-SSE case)
    - `parseSseData` rejection of malformed `auction_ended`/`connected` payloads (the `new_bid` case is now covered — see below)
    - outbid notifier “previous leader” vs “any participation”
    - `BidForm` disabled / pending / validation UX
    - `useBidStream` subscription surface (who re-renders on status/timing)

Covered in phase 1 domain/unit tests: merge `applied` flag, `shouldNotifyOutbidWhenApplied` (notify only when amount applied), DisplayTiming registry freeze/isolation, countdown, visual status, dedupe, bidder sanitize, bid amount Zod.

Covered in this phase 5 + My Bids pass:
- `BidStreamService` status transitions — no status before `open` on cold start, `Connected` only twice across a real reconnect, bounded give-up → `Disconnected` with no further scheduling, clean `stop()`.
- `RequestGenerationGuard` — per-key generation invalidation, independence across keys.
- `mergeFetchedAuctionSummary` / `mergeFetchedAuctionDetail` / `unionBidHistory` — new-epoch wholesale accept, same-epoch monotonic advance, bid-history union, Ended-status stickiness.
- `fetchAuctionsList` / `fetchAuctionDetail` — superseded response discarded, background failure keeps existing data (`Success` + inline `errorMessage`) instead of forcing a full-page error, monotonic merge on commit.
- `deriveMyBidStatus` — absent→Stale, active+amount-ahead→Stale, Ended never Stale, Won/Lost/Winning/Outbid, tie-with-someone-else→Outbid.
- `collectMyBidEntries` — skip-during-load vs genuine absence, single-pass mapping across multiple stored bids/auctions.
- `loadMyBids` — Zod drops malformed/corrupt entries instead of trusting a cast; round-trips `recordMyBid` writes.

Covered in the review-remediation pass (2026-07-17):
- `auctionSummarySchema` / `auctionSummaryListSchema` / `auctionDetailSchema` — accept/reject for missing fields, wrong types, `NaN`, unknown `status`, negative `bidCount`, non-array list, malformed bid-history entries, null/non-object detail.
- `AuctionsService.getAll` / `getById` — resolve with the parsed payload on valid data; reject (never return) on a malformed entry, non-array list, or malformed/null detail.
- `mergeFetchedAuctionSummary` — added case proving a stale-but-numerically-higher fetched `bidCount` no longer wins when `currentBid` correctly stays on the cached value.
- `useBidStreamSubscription` — first `Connected` (cold start) does not reconcile; `Connected → Reconnecting → Connected` reconciles exactly once; a second full reconnect cycle reconciles again; `start`/`stop` called once each on mount/unmount.
- `toSafeErrorMessage` — `HttpError` (server + network/status-0) never leaks method/path; a plain `Error` message passes through unchanged; a non-`Error` throw gets a generic fallback.
- `ConnectionStatusBadge` — "Offline" label + Retry action only when `Disconnected` and `onRetry` is provided; clicking Retry invokes the handler.

Covered in the My Bids server-reset clear pass (2026-07-18):
- `shouldClearMyBidsAfterListReconcile` — all matched+ahead → true; empty → false; missing id → false; equal/behind amount → false.
- `clearMyBids` — removes key; no-op when empty.
- `fetchAuctionsList` — successful raw-list reset signal clears storage; failed fetch does not clear; generation-superseded response that would have cleared does not clear; clear uses raw fetched `currentBid` even when monotonic merge retains a higher cached bid.

Covered in the authoritative anti-snipe implementation pass (2026-07-18):
- `mergeNewBidIntoSummary`/`mergeNewBidIntoDetail` — adopts a same-or-later authoritative `endsAt` and flags `snipeExtended`; stacks a second extension from a later accepted bid; a stale/out-of-order event (amount not ahead) is rejected wholesale and cannot roll `endsAt` back or "double extend" it.
- `mergeFetchedAuctionSummary`/`mergeFetchedAuctionDetail` — a same-epoch fetch with a later `endsAt` (extension) is adopted, not treated as a reset; a stale GET with an older `endsAt` cannot roll the cached (SSE-extended) deadline backward; a genuine reset (fetched `currentBid` back at `startPrice`) is still accepted wholesale even carrying an older `endsAt`; the pre-existing "stale GET behind SSE" protection tests (non-`startPrice` `currentBid` regression) still pass unchanged.
- `parseSseData` — a well-formed `new_bid` (including `endsAt`) parses; a malformed payload (non-JSON, missing/non-finite `endsAt`, missing `bid_id`) is rejected as `Ignored` instead of adopting an unsafe value; heartbeat/unknown event names remain ignored.

## Security review pass (2026-07-17)

Scope: `bidderStorage` Zod load, My Bids Stale derivation/localStorage trust, `BidStreamService` reconnect give-up, fetch merge/generation guard, catalog/detail error UI, new dependencies. Frontend only.

- Reaffirmed still-open/still-fixed: #1, #6, #7, #16, #17, #18 (see inline notes above dated 2026-07-17).
- New findings added: #39 (`axios@1.11.0` known CVEs per `npm audit`), #40 (SSE permanent give-up has no recovery signal beyond the badge), #41 (error UI leaks internal API method/path/server error text — info disclosure, not XSS; React escaping confirmed intact everywhere, no `dangerouslySetInnerHTML`/`innerHTML` usage found in `frontend/src`).
- No new authorization/authentication mechanism was introduced by the Phase 5 / My Bids work, so #6 stands unchanged; no secrets or `.env` files found in `frontend/`.

## Review remediation pass (2026-07-17)

Addressed the Must-fix and cheap Nice-to-have findings from the "Review phase 5 implementation" and "Security review phase 5" reviews:

- **#1 (Critical, partial)** — Zod-validated REST auction payloads at the `auctionsService` boundary (SSE Zod remains explicitly out of scope; see updated Critical entry).
- **#3 (High, caveat resolved)** — the epoch/monotonic merge this relies on now only ever sees Zod-validated REST data.
- **bidCount merge bug** — tied to the same `bidAdvanced` branch as `currentBid`/`currentBidder` instead of an independent `Math.max`.
- **#29 (Low, tie edge)** — `deriveMyBidStatus` tie now resolves to `Outbid` when someone else is `currentBidder`.
- **`MyBidsSidebar` labels/severity** — exhaustive `Record<MyBidStatus, …>`, dead `default` removed, consistent capitalization.
- **Duplicate `Reconnecting` emission** — now set from exactly one place (`scheduleReconnect`).
- **#39 (High)** — `axios` pinned to `1.18.1`; `npm audit` clean.
- **#40 (Medium)** — `ConnectionStatusBadge` "Offline" + "Retry" affordance wired to a manual `bidStreamService.start()` restart.
- **#41 (Medium)** — `toSafeErrorMessage` strips method/path from `HttpError`-derived UI text at the catalog/detail/bid-fallback call sites; server 400/409 bid messages intentionally left untouched (required UX).
- Also added a real cold-start-vs-reconnect test for `useBidStreamSubscription` (mocked `bidStreamService` + spied `reconcileAfterReconnect`), matching the "High — Test cold-start vs reconnect" ask.
- `frontend/tsc -b` and `npm test` both green after these changes (123 tests, 24 files).
