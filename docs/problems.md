# Known problems / limitations

Final production review of `frontend/` (2026-07-18) against `docs/BidBlitz_Assignment_Clean.md` / assignment PDF quirks. Ranked Critical → Low. Items in **Fixed** are solved — do not reopen unless a regression is found.

Agents: [Frontend code review](92f2da03-316b-4fa0-899e-1718b3007df5), [Frontend security review](87b28c41-af28-48e5-ab14-31731691aea1), plus a dedicated race/requirements exploration pass.

**Verdict:** All MUST requirements and all four bonuses are implemented. Hard races (duplicate `bid_id`, out-of-order lower amount, request-generation guard, monotonic fetch merge, bounded reconnect, backend-authoritative snipe) are solid. Remaining debt is validation-boundary gaps, a few race edge holes, and deploy/transport hardening — not missing features.

---

## Critical

1. **SSE `auction_ended` is type-asserted, not Zod-validated — can corrupt state and stick Ended** — `parseSseMessage.ts` validates `new_bid` via `newBidEventSchema` but still does `parsed as AuctionEndedEvent`. `mergeAuctionEndedInto*` then writes `currentBid = event.finalPrice` / `currentBidder = event.winner` / `status = Ended` with no numeric/string guard. A malformed payload can render `$NaN` / odd winners. Worse: `resolveMonotonicStatus` makes `Ended` sticky, so a spurious end event can lock the auction as Ended against later valid REST refetches until a full reload. React escaping prevents XSS (security review: no Critical XSS path); impact is **state corruption / irreversible Ended**.
   _Also still open:_ `bidService.placeBid` success body is cast-only (see High #21).
   **Fix:** Add `auctionEndedEventSchema` + `safeParse` → `Ignored` on failure; optionally refuse to lower an already-higher `currentBid` on end.

---

## High

4. **HTTP 400 outbid patch incomplete AND non-monotonic** — `usePlaceBid` on 400 only sets `currentBid` on list + detail; does not set `currentBidder`, history, or `bidCount`. UI can show the wrong leader until SSE. **NEW (final review):** the patch assigns `body.currentBid` unconditionally. During the 800–2500 ms bid delay an SSE `new_bid` can already have advanced `currentBid` higher than the rejection body’s value — this path can **roll the displayed high bid backward**, undoing the monotonic fetch-merge invariant on the error path.
   **Fix:** Only raise with `Math.max`; prefer SSE/GET for leader/history; validate error body with Zod.

5. **No authentication** — `bidder` is client-supplied (localStorage + POST body). Anyone can impersonate any display name; “You won” / My Bids trust `loadBidderName()`. Acceptable for the authless mock assignment; not production identity. Frontend cannot fix alone.

6. **Sanitization gap on network strings** — Form bidders go through `sanitizeBidderName`; SSE/REST `bidder` / `title` / `winner` do not. React text escaping mitigates HTML XSS (no `dangerouslySetInnerHTML` / `innerHTML` / `javascript:` found). Trust-consistency gap vs form input; `new_bid` Zod only requires `z.string()` (no control-char strip).

7. **`placeBid` success (and error) bodies unchecked** — `bidService.placeBid` returns `data as PlaceBidSuccess` with no Zod. Success handler can write `undefined`/`NaN` `currentBid` into the list atom when the body is malformed (`undefined <= number` is `false`, so the patch still runs). Error path also casts `error.body` and surfaces `body.error` verbatim (escaped, but not shape-checked).
   **Fix:** `placeBidSuccessSchema` + error-body schema at the boundary.

8. **`new_bid` merge has no `status === Ended` guard (out-of-order QUIRK4)** — **NEW.** `mergeNewBidIntoSummary`/`Detail` only gate on `auctionId` and `amount > currentBid`. A late/out-of-order `new_bid` after `auction_ended` can overwrite `currentBid`/`currentBidder`/`bidCount` on an already-Ended auction (wrong “winner”, price above `finalPrice`).
   **Fix:** No-op when `auction.status === Ended`; add regression test.

---

## Medium

9. **`seenBidIds` never pruned** — grows for the tab lifetime (long sessions → unbounded memory).

10. **Jotai `atomFamily` retention + reconnect thundering herd** — `listTrackedAuctionDetailIds` / detail family entries are never removed; visiting many auctions retains them forever. Every reconnect refetches **all** tracked ids + list.

11. **Outbid notify heuristic** — notifies on every foreign bid after any local participation (`getMyLastBid` defined), not only when the user was the previous leader.

12. **My Bids sidebar storage reads** — `loadBidderName()` / `getMyLastBid()` during render without a storage subscription; can lag until an unrelated re-render.

13. **N countdown timers** — each `AuctionCard` / detail mounts its own `setInterval(1000)`. Intervals are not stopped when the auction is already expired/Ended while still mounted.

14. **Visual “Ended” vs server Active** — countdown / `auctionVisualStatus` can show ended (gray strip / 00:00) while `BidForm` stays enabled until `status === Ended`. User can still submit and get a late 409.

15. **Plain HTTP default API** — `getApiBaseUrl()` defaults to `http://localhost:3005` with no production scheme/host allowlist. Makes MITM of SSE/REST realistic if that default ships.

16. **Production nginx / Docker hardening** — `frontend/Dockerfile` uses stock `nginx:alpine` with no custom `nginx.conf` → no CSP, no `frame-ancestors` / `X-Frame-Options`, no `nosniff`, no HSTS. **NEW (final review):** `RUN npm install` instead of `npm ci` (ignores lockfile → deployed tree may drift from audited deps); no `.dockerignore`; nginx runs as root; floating base tags.

17. **Place-bid success detail lag** — list patched optimistically; detail only `fetchAuctionDetail` (no optimistic detail patch). Stale current bid/history until fetch or SSE wins.

18. **Catalog error UI has no retry** — initial-load error branch renders `Message` only; `refetch` unused on that path.

19. **HTTP status magic numbers** — `400` / `409` inlined in `usePlaceBid` / `getBidErrorMessage` instead of shared consts/enum.

20. **`useBidStream` over-subscribes consumers** — facade always reads `connectionStatusAtom` + `timingVersionAtom`. Every `AuctionCard` / `BidForm` re-renders on any connection change or any auction’s snipe bump. Global `timingVersion` is a coarse hammer.

21. **Deep-link detail without catalog fetch** — when `myBidsTracker` is off, `useAuctionList` never mounts on `/auctions/:id`. List stays empty → `applyNewBidToList` no-ops, outbid titles fall back to `"Auction"`, until catalog visit or reconnect reconcile.

22. **Cold-start connection badge shows “Offline + Retry”** — **NEW.** `connectionStatusAtom` initializes to `Disconnected`; cold start emits nothing until `open`. Badge treats all `Disconnected` as give-up (“Offline” + Retry). Users see a scary offline flash on every load indistinguishable from permanent give-up. No `Connecting` status exists.
    **Fix:** Add `Connecting` (initial/cold-start); only show Retry after genuine give-up.

23. **Dedupe can consume `bid_id` before apply when auction is unloaded** — **NEW.** `seenBidIds.consume` runs before list/detail patch. If the auction is in neither cache, the id is still marked seen → a later load of that auction will not apply that SSE (must wait for refetch/reconnect).
    **Fix:** Consume only after a successful apply, or key dedupe per loaded auction.

24. **Unconditional production console logging** — **NEW (security).** `logger` always calls `console.*` with no `import.meta.env.DEV` gate; Zod issue lists, URLs, and `bid_id` can appear in end-user consoles (no secrets, but info disclosure noise).

---

## Low

24. **Fallback title magic string** — `findAuctionTitleInList` / My Bids fallback returns `"Auction"` when missing from list.

25L. **`isPlaceBidHttpError`** — thin alias of `isHttpError`; little value.

26. **`useAuctionDetail` empty id** — `id ?? ""` still subscribes to `auctionDetailAtomFamily("")` when param missing (feeds retention leak #10).

27L. **Quote / style inconsistency** — mixed `'` / `"` across modules.

28. **Narrow double-submit window** — `isPending` disables after re-render; rapid double-click before paint can fire two POSTs.

29. **`auction_ended` timing clear is merge-gated** — `displayTimingRegistry.clear` runs only inside `mergeAuctionEndedInto*` when that auction exists in list/detail. Orphaned snipe entries can linger.

30. **Duplicate outbid guards** — `shouldNotifyOutbid` and `notifyOutbid` both re-check feature flag / username / `getMyLastBid`.

31. **SSE `connected` timestamp partially validated** — non-numeric `timestamp` silently falls back to `Date.now()` instead of `Ignored`.

32. **`loadBidderName` unvalidated on read** — raw localStorage string (input path is sanitized); unlike Zod’d `loadMyBids`. Low risk (escaped text only).

33. **Manual `retryConnection` while a reconnect timer is pending** — `start()` may not clear an in-flight reconnect timer → brief double-connect risk.

34. **`computeTimeRemaining` shows `00:00` for up to ~1s while still “active”** — cosmetic floor edge before `expired` flips.

35. **Parsed `Connected` SSE event is unused** — `applySseEventToAuctionAtoms` ignores it; dead work after parse.

---

## Fixed (solved — do not reopen unless regression)

Moved here from prior open lists when verified solved. Retained for history.

- **Auction ID URL encoding** — `auctionsService.getById` uses `encodeURIComponent(id)`.
- **HTTP 409 end-path timing** — `usePlaceBid` clears display timing via BidStream context.
- **Snipe `timingVersion` list-only** — apply path bumps timing when list _or_ detail merge changes display timing.
- **Place-bid success list sync** — success path patches list when ahead of SSE and refetches detail.
- **Place-bid success `bidCount` race** — increments only when HTTP result is ahead of list `currentBid`.
- **Axios client timeout** — `apiClient` uses `timeout: 30_000`.
- **React Query removal** — jotai list + `atomFamily` detail; no TanStack Query.
- **`mergeAuctionState` facade removal** — merges live in `mergeNewBid` / `mergeAuctionEnded`.
- **DisplayTiming registry API** — `get(auctionId, serverEndsAt) => DisplayTiming`; readonly frozen entries.
- **SSE single-id list patch (#5)** — `updateAuctionSummaryInList` instead of remapping the catalog.
- **Outbid toast EventEmitter** — module singleton; AppShell unsubscribes on unmount.
- **BidStream without callback soup** — status/timing atoms + module registries; thin provider.
- **`applySseEventToAuctionAtoms` SRP split** — thin facade + `applyNewBidEvent` / `applyAuctionEndedEvent`.
- **`atomFamily` → `jotai-family`** — deprecated import removed (retention leak #10 still open).
- **Docs plan drift (#22)** — `docs/plan.md` aligned to jotai + Axios + BidStream.
- **Outbid toast only when applied (#24/#33 historical)** — `shouldNotifyOutbidWhenApplied` after merge.
- **`enableSound` AudioContext reuse (#26 historical)** — create once; resume if suspended.
- **Cold-start false reconcile (#2)** — `Connected` only from real `open`; no reconcile on first Connected.
- **SSE vs refetch races (#3)** — `RequestGenerationGuard` + monotonic `mergeFetchedAuctionSnapshot`.
- **localStorage `loadMyBids` trust (#17)** — Zod per entry; corrupt dropped.
- **Catalog/detail background refetch non-destructive** — keep `Success` + inline warn instead of wiping data.
- **Unbounded SSE reconnect retries** — give up after `MAX_RECONNECT_ATTEMPTS` (8).
- **SSE permanent give-up recovery (#28/#40 historical)** — offline badge + Retry → `bidStreamService.start()`.
- **My Bids Stale status** — `MyBidStatus.Stale`; pure `deriveMyBidStatus`; inverted `collectMyBidEntries`.
- **My Bids clear-all after server reset** — `shouldClearMyBidsAfterListReconcile` on raw fetched list.
- **REST auction payload Zod (#1 partial)** — `auctionSchemas` on `getAll`/`getById`.
- **`new_bid` SSE Zod** — `newBidEventSchema` at parser boundary (closes the `new_bid` half of #1).
- **`bidCount` merge tied to `bidAdvanced`** — not an independent `Math.max`.
- **`deriveMyBidStatus` tie edge (#29)** — tie with other `currentBidder` → `Outbid`.
- **`MyBidsSidebar` exhaustive status maps** — `Record<MyBidStatus, …>`; Won severity now success (green).
- **Duplicate `Reconnecting` emission** — only from `scheduleReconnect`.
- **`axios` CVEs (#8/#39)** — pinned `1.18.1`; `npm audit` 0 vulnerabilities (reverified 2026-07-18).
- **Error UI method/path leak (#33/#41)** — `toSafeErrorMessage` at catalog/detail/generic bid fallback.
- **Client-only snipe (#15)** — backend-authoritative stacking extension; client adopts `endsAt` only.
- **Nested map callbacks on hot SSE path (#30)** — fixed with single-id list patch.

---

## Requirements coverage (final review)

| Requirement                                            | Status                                |
| ------------------------------------------------------ | ------------------------------------- |
| Catalog `GET /api/auctions` + Zod                      | Pass                                  |
| Live `mm:ss` countdown from `endsAt`                   | Pass                                  |
| Active green / &lt;30s red / Ended gray                | Pass                                  |
| Detail `GET /api/auctions/:id`                         | Pass                                  |
| SSE `new_bid` / `auction_ended` / ignore heartbeat     | Pass (ended payload unvalidated — #1) |
| Place bid: name, amount, validation, loading, 400, 409 | Pass (400 patch weak — #4)            |
| Dedupe duplicate `bid_id`                              | Pass (#9/#44 caveats)                 |
| Out-of-order lower amount rejected                     | Pass                                  |
| Out-of-order `new_bid` after Ended                     | **Gap — #42**                         |
| Auto-reconnect + indicator + refresh after reconnect   | Pass (#43 cold-start UX)              |
| ≥5 unit-test categories; logic separated from UI       | Pass (well beyond minimum)            |
| Bonus: snipe / chart / notifications / my bids         | Pass                                  |
| SPA + `PROMPTS.md` + `README.md` + visible errors      | Pass                                  |

Server quirks: POST delay, duplicate SSE, 409-on-end, out-of-order amounts, heartbeat, ~45s disconnect, delayed auctions list — all handled with the gaps called out above.

---

## Testing gaps (still open)

Still thin or missing:

- `applySseEventToAuctionAtoms` / `applyNewBidEvent` / `applyAuctionEndedEvent` integration (dual list+detail, dedupe-once, snipe bump)
- `usePlaceBid` success / 400 / 409 (including non-monotonic 400 rollback and incomplete leader patch)
- `parseSseData` rejection of malformed `auction_ended` (once schema lands)
- `new_bid` after `Ended` regression (#42)
- Outbid notifier “previous leader” vs “any participation”
- `BidForm` disabled / pending / visual-ended UX
- Cold-start badge: no Offline flash / `Connecting` state (#43)
- `useBidStream` subscription surface (who re-renders)

Well covered: merges + `applied`, fetch generation guard, monotonic fetch merge, snipe/`endsAt` contract, `new_bid` Zod, My Bids Stale/clear-on-reset, BidStream cold-start vs reconnect, countdown, visual status, dedupe unit, bid amount Zod, bidder sanitize, `toSafeErrorMessage`, ConnectionStatusBadge Retry.

---

## Security review notes (2026-07-18)

- **No Critical XSS/RCE** found: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `javascript:` hrefs, open redirects, or prototype-pollution sinks (immutable field spreads only).
- **`npm audit`:** 0 vulnerabilities (reaffirms axios pin).
- **#17 / #41:** still Fixed and holding.
- Highest production-hardening priority after functional Critical/High: HTTPS default (#16), CSP/nginx (#18), `npm ci` + `.dockerignore` (Dockerfile), then Zod for `auction_ended` + place-bid bodies (#1/#21).

---

## Suggested fix order before production cutover

1. **#1** — Zod `auction_ended` (+ sticky-Ended safety).
2. **#42** — reject `new_bid` when already Ended.
3. **#4 / #21** — monotonic + complete 400 patch; Zod place-bid success/error bodies.
4. **#43** — `Connecting` status (cold-start UX).
5. **#16 / #18** — HTTPS + hardened nginx/`npm ci`.
6. Remaining Medium/Low as capacity allows.
