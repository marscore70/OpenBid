# Known problems / limitations

Pre-submission multi-agent review (2026-07-18): Review + Security + Architecture + Debug agents. Critical race bugs fixed in-frontend; Compose no longer publishes authless `:3005` to the host.

**Verdict:** Application logic + Docker Compose path are **GO** for the mock assignment after Critical fixes below. Remaining accepted High: **#5 no auth**.

Verification: run `cd frontend && npm test && npm run build && npm audit`.

---

## Critical

_(none open)_

---

## High

5. **No authentication** — `bidder` is client-supplied (localStorage + POST body). Anyone can impersonate any display name; “You won” / My Bids trust `loadBidderName()`. Acceptable for the authless mock assignment; not production identity. Frontend cannot fix alone.

---

## Medium

_(none open)_

---

## Low

19. **Testing gaps (integration)** — still thin: full `usePlaceBid` hook paths, `BidForm` disabled/pending UX, `useBidStream` subscription surface. Equal-amount merge + 400 bidder-clear now covered at domain/merge level.

20. **Self-outbid is client-only UX** — trivial bypass via direct `POST` / DevTools; same authless model as #5. Not a new exploit path.

21. **CSP `style-src 'unsafe-inline'`** — required by styled-components; script stays `'self'`. Defense-in-depth tradeoff only.

22. **`docs/chat.md` session log** — may contain agent transcripts; prefer not publishing raw chat if the repo is public. Assignment requires `PROMPTS.md` (present under `frontend/PROMPTS.md`).

---

## Fixed (solved — do not reopen unless regression)

### Pre-submission gate 2026-07-18 (multi-agent)

- **Equal-amount SSE merge** — `mergeNewBid*` now applies when `amount === currentBid` (adopts `endsAt`, bidder, history) so HTTP-ahead success / 400 floor no longer burns `bid_id` and drops snipe/history.
- **HTTP 400 outbid** — clears `currentBidder` only when it is still the rejected bidder (Bugbot: never wipe SSE leader); tied GET fills null leader; list+detail refetch.
- **Place-bid success list reconcile** — also `fetchAuctionsList()` so catalog `endsAt`/bidCount recover if SSE is late/dropped.
- **Reconnect list refetch** — `fetchAuctionsList({ force: true })` from reconcile supersedes in-flight Loading fetches.
- **Malformed 200 place-bid** — no longer `recordMyBid` + silent success; surfaces error and reconciles via GET.
- **Clock-skew bid form** — bidding disabled only on server `AuctionStatus.Ended`, not client visual Ended.
- **Catalog `00:00 left`** — shows Ended tag when visual Ended even if status still Active.
- **SSE reconnect timer stack** — `scheduleReconnect` clears an existing timer before scheduling.
- **Compose CSRF surface** — backend `:3005` not published to host; SPA uses nginx `:8080` same-origin `/api`.
- **`frontend/PROMPTS.md`** — restored required AI prompt log.
- **README / summary doc links** — `summery.md` → `summary.md`.

### Production gate 2026-07-18 implement

- **Dockerfile `VITE_API_BASE_URL`** — `ARG`/`ENV` before `npm run build`; empty string = same-origin.
- **`docker-compose.yml` prod match** — frontend `8080:8080`, no Vite volumes; backend healthcheck; `depends_on: service_healthy`.
- **nginx `/api` proxy + CSP** — reverse-proxy to `backend:3005`; `connect-src 'self'`; SSE-friendly buffering off.
- **CSP docs aligned** — same-origin proxy model documented in README.
- **README TanStack claim** — now jotai + `jotai-family`.
- **Prod `env` tests** — `resolveApiBaseUrl` covers missing / empty / HTTP reject / HTTPS / local HTTP.
- **Bidder identity** — shared `normalizeBidderIdentity` / `isSameBidderIdentity` (`toLowerCase`, not locale); used by self-outbid, My Bids, ended presentation, outbid notify.
- **Unicode hardening** — NFKC + strip bidi/zero-width in `sanitizeNetworkText`.
- **Caret deps pinned** — `date-fns`, `jotai`, `jotai-family`, `vite` exact.
- **Docker image pins + non-root + healthcheck** — unprivileged nginx on 8080; frontend `HEALTHCHECK`.
- **Obsolete compose `version` key** — removed.
- **Node docs** — README says Node 22+.
- **Redundant `//?` comments** in `validateBidAmount.ts` — removed.
- **Ended without bids copy** — catalog/detail use **Closed without a sale** (warning tone); duplicate “No bids placed” summary line suppressed.
- **Error UI** — catalog/detail use atom `errorMessage` (already `toSafeErrorMessage`); `getBidValidationMessage` no longer surfaces arbitrary `Error.message`.
- **Feature flags YAGNI (#15)** — deleted `config/features.ts`; bonuses always on.
- **Backend Dockerfile pin (#21)** — `node:22.17.0-alpine`.
- **Opening bid contract (#22)** — `minimumAllowedBid` returns `max(currentBid, startPrice) + 1`, matching the frozen server’s strict `amount > currentBid` rule.

### Earlier fixes

- **Auction ID URL encoding** — `auctionsService.getById` uses `encodeURIComponent(id)`.
- **HTTP 409 end-path timing** — `usePlaceBid` clears display timing via BidStream context.
- **Snipe `timingVersion` list-only** — apply path bumps timing when list _or_ detail merge changes display timing.
- **Place-bid success list sync** — success path patches list when ahead of SSE and refetches detail.
- **Place-bid success `bidCount` race** — increments only when HTTP result is ahead of list `currentBid`.
- **Axios client timeout** — `apiClient` uses `timeout: 30_000`.
- **React Query removal** — jotai list + `atomFamily` detail; no TanStack Query.
- **`mergeAuctionState` facade removal** — merges live in `mergeNewBid` / `mergeAuctionEnded`.
- **DisplayTiming registry API** — `get(auctionId, serverEndsAt) => DisplayTiming`; readonly frozen entries.
- **SSE single-id list patch** — `updateAuctionSummaryInList` instead of remapping the catalog.
- **Outbid toast EventEmitter** — module singleton; AppShell unsubscribes on unmount.
- **BidStream without callback soup** — status/timing atoms + module registries; thin provider.
- **`applySseEventToAuctionAtoms` SRP split** — thin facade + `applyNewBidEvent` / `applyAuctionEndedEvent`.
- **`atomFamily` → `jotai-family`** — deprecated import removed; retention addressed via untrack/`remove`.
- **Docs plan drift** — `docs/plan.md` aligned to jotai + Axios + BidStream.
- **Outbid toast only when applied** — gate is `amountApplied && eligible` at apply site.
- **`enableSound` AudioContext reuse** — create once; resume if suspended.
- **Cold-start false reconcile** — `Connected` only from real `open`; no reconcile on first Connected.
- **SSE vs refetch races** — `RequestGenerationGuard` + monotonic `mergeFetchedAuctionSnapshot`.
- **localStorage `loadMyBids` trust** — Zod per entry; corrupt dropped.
- **Catalog/detail background refetch non-destructive** — keep `Success` + inline warn instead of wiping data.
- **Unbounded SSE reconnect retries** — give up after `MAX_RECONNECT_ATTEMPTS` (8).
- **SSE permanent give-up recovery** — offline badge + Retry → `bidStreamService.start()`.
- **My Bids Stale status** — `MyBidStatus.Stale`; pure `deriveMyBidStatus`; inverted `collectMyBidEntries`.
- **My Bids clear-all after server reset** — `shouldClearMyBidsAfterListReconcile` on raw fetched list.
- **REST auction payload Zod** — `auctionSchemas` on `getAll`/`getById`.
- **`new_bid` SSE Zod** — `newBidEventSchema` at parser boundary.
- **`bidCount` merge tied to `bidAdvanced`** — not an independent `Math.max`.
- **`deriveMyBidStatus` tie edge** — tie with other `currentBidder` → `Outbid`.
- **`MyBidsSidebar` exhaustive status maps** — `Record<MyBidStatus, …>`; Won severity now success (green).
- **Duplicate `Reconnecting` emission** — only from `scheduleReconnect`.
- **`axios` CVEs** — pinned `1.18.1`; `npm audit` 0 vulnerabilities.
- **Error UI method/path leak** — `toSafeErrorMessage` at catalog/detail/generic bid fallback.
- **Client-only snipe** — backend-authoritative stacking extension; client adopts `endsAt` only.
- **Nested map callbacks on hot SSE path** — fixed with single-id list patch.
- **SSE `auction_ended` Zod + sticky-Ended safety** — `auctionEndedEventSchema` at parser; merge refuses to lower `currentBid` below cached high.
- **`new_bid` after Ended no-op** — `mergeNewBid*` returns `applied: false` when `status === Ended`.
- **400 outbid patch monotonic** — `nextCurrentBidAfterOutbidRejection` via `Math.max`; Zod-parsed error body.
- **`placeBid` success/error Zod** — `placeBidSuccessSchema` / `placeBidErrorBodySchema`; `InvalidBidResponseError` reconciles via GET.
- **Network string sanitize** — Zod transforms strip control chars on REST/SSE bidder/title/winner.
- **Connecting status** — cold-start/manual retry emit `Connecting`; Retry only on `Disconnected`.
- **Prod API URL gate** — `VITE_API_BASE_URL` required in production; non-local HTTP rejected; empty = same-origin.
- **Docker/nginx hardening** — `npm ci`, `.dockerignore`, CSP/`X-Frame-Options`/`nosniff`, unprivileged nginx, healthchecks.
- **HTTP status consts** — Axios `HttpStatusCode.BadRequest` / `Conflict` in `usePlaceBid`.
- **Retry clears reconnect timer** — `start()` clears pending timer + resets attempts.
- **`seenBidIds` LRU prune** — `lru-cache` (max 500) replaces unbounded `Set`.
- **Dedupe only when auction cached** — `consume` skipped until list or detail holds the auction.
- **Detail atom retention + reconnect herd** — untrack + `atomFamily.remove` on detail unmount; cap 20 tracked ids.
- **Outbid previous-leader heuristic** — notify only when pre-merge leader matches username (identity-normalized).
- **My Bids storage subscription** — `bidderStorageVersionAtom` bumped on write; sidebar subscribes.
- **Countdown interval stop** — `useCountdownTick` clears interval once expired.
- **Visual Ended disables bid form** — superseded: form disables on server Ended only (pre-submission 2026-07-18).
- **Place-bid optimistic detail** — success patches `currentBid`/`currentBidder` only; GET/SSE own history/`endsAt`; HTTP `bid_id` not consumed.
- **Catalog error Retry** — error branch wires `refetch`.
- **`useBidStream` split subscriptions** — `useBidStreamConnectionStatus` / `useBidStreamTimingVersion`; module fns for sound/timing/clear.
- **Deep-link catalog warm** — `AppShell` always calls `useAuctionList`; catalog/sidebar use `useAuctionListReader`.
- **Prod logger silence** — `logger` no-ops in `import.meta.env.PROD`.
- **Fallback title** — missing title uses `auctionId`, not `"Auction"`.
- **`isPlaceBidHttpError` removed** — callers use `isHttpError`.
- **Empty detail id** — missing route id uses idle atom (no `atomFamily("")`).
- **Double-submit lock** — `useRef` in-flight guard in `usePlaceBid`.
- **Ended timing clear ungated** — `applyAuctionEndedEvent` always clears display timing.
- **Duplicate outbid guards** — `notifyOutbid` is side-effect only; gate lives in `shouldNotifyOutbid`.
- **Unused `connected` SSE** — named `connected` parsed as `Ignored`; connection from EventSource `open`.
- **`loadBidderName` Zod** — `networkBidderSchema` on read.
- **Partial-second countdown** — `Math.ceil` so active remainder shows ≥ `00:01`.
- **atomFamily resurrection race** — `untrack`/`evict` bumps `RequestGenerationGuard` + tracked-membership commit gate.
- **`auction_ended` timing bump** — `applyAuctionEndedEvent` uses `clearDisplayTiming`.
- **BidForm stale amount** — `syncBidAmountTextToMinimum` raises field only when below new min.
- **Detail error Retry** — PrimeReact Retry wires `useAuctionDetail.refetch`.
- **placeBid error body sanitize** — Zod `sanitizeNetworkText` + max length on `error` field.
- **`toSafeErrorMessage` trust boundary** — never surfaces arbitrary `Error.message`; exported safe constants only.
- **localStorage write/remove warnings** — `logger.warn` on failure; safe fallback preserved.
- **Double catalog idle fetch** — Loading sync guard + `useAuctionListReader` for catalog/sidebar.
- **Malformed SSE observability** — dev `logger.warn` on JSON/schema failure without raw payloads.
- **Quote style** — formatter-owned single quotes normalized to double quotes in frontend TS/TSX.
- **Malformed REST response errors** — `AuctionsService` delegates validation failures to Zod.
- **Fragile/tautological tests** — removed; UI tests assert roles/state/outcomes.
- **Self-outbidding guard (UI)** — `BidForm` blocks the current leader under shared bidder identity.

---

## Requirements coverage (final review)

| Requirement                                            | Status                                    |
| ------------------------------------------------------ | ----------------------------------------- |
| Catalog `GET /api/auctions` + Zod                      | Pass                                      |
| Live `mm:ss` countdown from `endsAt`                   | Pass                                      |
| Active green / &lt;30s red / Ended gray                | Pass                                      |
| Detail `GET /api/auctions/:id`                         | Pass                                      |
| SSE `new_bid` / `auction_ended` / ignore heartbeat     | Pass                                      |
| Place bid: name, amount, validation, loading, 400, 409 | Pass (400 clears leader + raises floor)   |
| Dedupe duplicate `bid_id`                              | Pass                                      |
| Out-of-order lower amount rejected                     | Pass                                      |
| Equal-amount SSE reconciles endsAt/bidder/history      | Pass                                      |
| Out-of-order `new_bid` after Ended                     | Pass                                      |
| Auto-reconnect + indicator + refresh after reconnect   | Pass (`force` list refetch)               |
| ≥5 unit-test categories; logic separated from UI       | Pass                                      |
| Bonus: snipe / chart / notifications / my bids         | Pass                                      |
| SPA + `PROMPTS.md` + `README.md` + visible errors      | Pass                                      |
| Containerized compose deploy                           | Pass (same-origin nginx; API not on host) |

---

## Suggested fix order (remaining)

1. **#5** — auth (backend decision; accepted for mock).
2. Optional: integration tests for Low #19.
