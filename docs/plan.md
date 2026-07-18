# BidBlitz (OpenBid) - Project Plan

## 1. Purpose & scope

BidBlitz is a live auction bidding dashboard for Noa's vintage shop: browse auctions, place bids, watch countdowns, and see winners when timers expire. The **provided mock server** ([`backend/server.js`](../backend/server.js)) is owned by another team - **frontend-only changes** are allowed.

This document is the single source of truth for architecture, requirements, backend workarounds, and delivery phases.

## 2. Stack & repo layout

| Area         | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Frontend     | React 18, Vite, TypeScript (strict)                        |
| UI           | PrimeReact (Card, DataTable, Toast, Chart, etc.)           |
| Styling      | styled-components; inline `style` only for â‰¤2 properties |
| Client state | jotai (list atom + `jotai-family` detail atoms)            |
| HTTP         | Axios services (`auctionsService`, `bidService`)           |
| Real-time    | Single `EventSource` via `BidStream` (`/api/stream`)       |
| Tests        | Vitest                                                     |
| API base     | `VITE_API_BASE_URL` (default `http://localhost:3005`)      |

```
OpenBid/
  backend/server.js    # Do not modify
  frontend/            # SPA application
    src/               # app code
    tests/             # unit tests (by concern: domain/auction, domain/bid, â€¦)
    public/            # static assets (favicon)
  docs/plan.md         # This file
  README.md            # Run instructions
```

## 3. Requirements - MUST vs BONUS

### MUST (MVP)

- [x] **Catalog** - `GET /api/auctions`: title, emoji, current bid, bidder, mm:ss countdown; green active / red pulse (&lt;30s) / gray ended + winner
- [x] **Detail** - `GET /api/auctions/:id` with full bid history (scrollable DataTable)
- [x] **SSE** - `new_bid`, `auction_ended`; ignore `heartbeat`
- [x] **Place bid** - `POST /api/bid`; client validation; loading during 800â€“2500ms delay; clear **400** / **409** messages
- [x] **Races** - outbid during delay, auction ended in-flight, duplicate `bid_id` dedupe
- [x] **SSE lifecycle** - auto-reconnect (~45s drops); Connected / Disconnected / Reconnecting; refetch after reconnect
- [x] **Tests** - â‰¥5 unit tests on pure domain logic (no DOM), under `frontend/tests/`
- [x] **SPA** - no full page reloads
- [x] **Security** - sanitize bidder input; no `dangerouslySetInnerHTML` for API strings
- [x] **Observability** - structured logs for reconnect, dedupe, bid failures; user-visible errors
- [x] **Performance** - patch single auction on SSE; clear timers on end/unmount
- [x] **PROMPTS.md** + README

### BONUS (implemented; always on)

- [x] **Bid snipe protection** - backend-authoritative `endsAt += 15_000` (stacking) for accepted bids (user + bot) in the final 10s; see Â§6 "one-time exception"
- [x] **Bid history chart** - PrimeReact Chart from merged history
- [x] **Outbid notifications** - Toast + optional sound after user gesture
- [x] **My Bids tracker** - sidebar: winning / outbid / won / lost from local username

## 4. Architecture

### Layers

1. **Presentation** - PrimeReact pages and feature components
2. **Application** - hooks, thin `BidStreamProvider`, jotai atom patches
3. **Domain** - pure TS: merge, dedupe, validate, countdown, status, snipe policy
4. **Infrastructure** - Axios HTTP client, SSE `BidStreamService`

### State

- jotai holds REST snapshots: `auctionsListAtom` + `auctionDetailAtomFamily`.
- One SSE connection at app shell (`BidStreamProvider`); events run through domain merge then single-id atom patches.
- Bid submission: local pending state per auction; reconcile with SSE/GET after POST.

### Data flow

```
REST GET â”€â”€â–º jotai atoms â—„â”€â”€ domain merge â—„â”€â”€ SSE / BidStream (dedupe, monotonic bids)
POST bid â”€â”€â–º pending UI â”€â”€â–º success/error â”€â”€â–º refetch/patch atoms
SSE disconnect â”€â”€â–º reconnect â”€â”€â–º refetch list + tracked detail ids
```

## 5. Backend API reference

| Method | Path                | Notes                                                     |
| ------ | ------------------- | --------------------------------------------------------- |
| GET    | `/api/auctions`     | Summaries, no `bidHistory`                                |
| GET    | `/api/auctions/:id` | Full auction + `bidHistory`                               |
| POST   | `/api/bid`          | `{ auctionId, bidder, amount }`                           |
| GET    | `/api/stream`       | SSE: `connected`, `new_bid`, `auction_ended`, `heartbeat` |

## 6. Backend limitations & client workarounds

**The backend is otherwise off-limits** (workspace policy: frontend-only). All mitigations below are client-side, **except** the authoritative anti-snipe extension, which required a **one-time, user-granted exception** to modify only `backend/server.js` - see "Bonus vs server" below. That exception is scoped to this single feature; the "never touch the backend" rule reverts afterward for every other change.

### Documented quirks (QUIRK 1â€“7)

| ID  | Behavior                           | Workaround                                                       |
| --- | ---------------------------------- | ---------------------------------------------------------------- |
| 1   | POST bid delayed 800â€“2500ms      | Pending UI, no double-submit, reconcile after response           |
| 2   | ~20% duplicate SSE (same `bid_id`) | Dedupe by `bid_id` before merge                                  |
| 3   | 409 if auction ended during delay  | Ended UX with `winner` / `finalPrice`; never success toast       |
| 4   | Out-of-order events (spec)         | Apply only if `amount > currentBid`; sort history by `timestamp` |
| 5   | `heartbeat` every 15s              | Filter in SSE parser                                             |
| 6   | SSE hard close ~45s, no replay     | Reconnect + backoff; refetch REST                                |
| 7   | List GET +500ms (30%)              | Skeletons; generous client timeout                               |

### Undocumented / buggy behavior

| Issue                                      | Workaround                                                        |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Bot bidders every 8â€“15s                  | Treat SSE as live truth                                           |
| User bid SSE sets `previousBid === amount` | Derive increment from prior local `currentBid`                    |
| In-memory server state                     | Tolerate restart; refetch on load                                 |
| No auth on `bidder`                        | Sanitize display; username in localStorage is not identity        |
| `endsAt` server-authoritative              | Countdown from `endsAt - Date.now()`; trust `auction_ended` / 409 |
| Weak server `amount` validation            | Client: positive finite integer before POST                       |

### Bonus vs server

**Authoritative anti-snipe - implemented 2026-07-18.**

> **One-time exception (used for this turn):** the user explicitly granted one-time permission to modify **only** `backend/server.js` for this single feature, superseding the normal "never touch the backend" rule for this change alone. The rule reverts after this feature; no other backend file was touched.

Implementation (`backend/server.js`):

- **Lines 83â€“99** - `SNIPE_WINDOW_MS = 10_000` / `SNIPE_EXTENSION_MS = 15_000` constants and the pure helper `applySnipeExtension(auction, bidTimestamp)`: if `0 < auction.endsAt - bidTimestamp < SNIPE_WINDOW_MS`, mutates `auction.endsAt += SNIPE_EXTENSION_MS`. Reusing `auction.endsAt` (already reflecting any prior extension) on every call is what makes repeated accepted bids in the closing window **stack** extensions for free - no separate "extension count" state needed.
- **Lines 176â€“195** (bot interval) and **lines 290â€“316** (`POST /api/bid`) - both call sites now capture a single `const bidTimestamp = Date.now()` right after the bid is accepted, reused for the `bidHistory` timestamp, the `applySnipeExtension` check, the `bid_id`, and the `new_bid` broadcast `timestamp` (previously multiple independent `Date.now()` calls). Both call `applySnipeExtension(auction, bidTimestamp)` immediately after the mutation and before `broadcast("new_bid", â€¦)`, and both now add `endsAt: auction.endsAt` to that broadcast payload - the only contract change (no new endpoint/event/dependency; GET endpoints already returned `endsAt`; the POST 200 body is intentionally left unchanged, since the placing client reconciles via its own SSE subscription and the existing post-success `fetchAuctionDetail` GET).
- The existing 1s end-sweep (`Date.now() >= a.endsAt`) and the `POST /api/bid` 409 check read the same mutated `auction.endsAt` field, so both automatically observe an extension with no changes needed - `endsAt` is now truly authoritative end-to-end.

Frontend adaptation (`frontend/src`):

- `NewBidEvent` gained a required `endsAt: number`. The SSE parser boundary (`parseSseMessage.ts`) now runs every `new_bid` payload through a Zod schema (`sseEventSchemas.ts`, mirroring the existing `auctionSchemas.ts` REST pattern) and drops a malformed event (missing/non-finite `endsAt`, `bid_id`, etc.) instead of adopting an unsafe value - closing the specific gap called out in problems.md #1 for this field.
- `mergeNewBidIntoSummary`/`mergeNewBidIntoDetail` adopt `Math.max(auction.endsAt, event.endsAt)` as the merged `endsAt` on every applied bid (the `Math.max` is a defensive backstop; the real ordering guarantee is the existing `event.amount > auction.currentBid` gate, which already makes a stale/out-of-order event with a smaller amount a no-op that cannot touch `endsAt` at all).
- The additive client-side math (`applySnipeExtensionPolicy` in `SnipeExtensionPolicy.ts`) was deleted - the client no longer performs `+= 15_000` anywhere, eliminating the double-extension risk. `applySnipeDisplayTimingOnBid.ts` was simplified to a pure comparison: if the merged `endsAt` increased versus what was previously known, set a sticky `snipeExtended` boolean on the existing `DisplayTimingRegistry` entry (for the "Time extended" tag) and mirror `displayEndsAt` to the new authoritative value. `resolveDisplayEndsAt`'s `Math.max(serverEndsAt, displayEndsAt)` is therefore a harmless no-op in normal operation - `AuctionCard.tsx`/`useCountdownTick.ts` needed no changes.
- `mergeFetchedAuctionSnapshot.ts`'s reset detector no longer keys off `endsAt` (a legitimate extension now changes it on the very same auction/epoch). The reset signal is a fetched `currentBid` that has regressed all the way back to `startPrice` (only possible right after a genuine backend restart - normal bidding is monotonic and a stale/delayed GET describing a real earlier state, still above `startPrice`, is not a restart and must not roll back the cache). In the non-reset branch, `endsAt` is merged with `Math.max(cached.endsAt, fetched.endsAt)` so a stale GET can never roll the deadline backward, while a fetch that raced ahead of the client's own SSE (carrying a newer extension) is still adopted.
- "(display only)" / "(visual only)" copy was removed (`AuctionDetailPage.tsx` now reads "Snipe protection: time extended"; `AuctionCard.tsx` already said "Time extended").

See `docs/problems.md` #15 for the full before/after write-up, and Â§11 for the new/updated tests.

## 7. Feature design

### Catalog

- Fetch list on mount; skeleton while loading (QUIRK 7).
- Per-card countdown via shared tick (1s) from server `endsAt`.
- Visual status from `auctionVisualStatus` (active / urgent / ended).
- Click navigates to detail route (SPA).

### Detail

- Fetch detail by id; merge SSE updates into detail atoms.
- Bid form: name (persisted), amount, validation, submit with loading.
- History: scrollable PrimeReact DataTable for long lists.

### SSE

- `BidStreamService`: connect, parse, ignore heartbeat, emit domain events.
- On reconnect: set status Reconnecting â†’ refetch auctions (+ detail if open).

## 8. Bonus features

Always enabled (no runtime feature-flag layer):

| Bonus                | Module                                                            |
| -------------------- | ----------------------------------------------------------------- |
| Snipe protection     | `applySnipeDisplayTimingOnBid.ts` + backend `applySnipeExtension` |
| Bid history chart    | `features/auction-detail/BidHistoryChart.tsx`                     |
| Outbid notifications | `features/notifications/outbidNotifier.ts`                        |
| My Bids tracker      | `features/my-bids/`                                               |

## 9. Security & performance

- Trim and length-limit bidder name; strip control characters.
- React text for all API-driven strings.
- Patch one auction in the list atom on SSE; avoid remounting entire catalog.
- Remove countdown intervals when auction ends or component unmounts.

## 10. Observability

Use `shared/logging/logger.ts`: info for reconnect/refetch, debug for dedupe, warn/error for bid failures. User sees Toast for actionable errors.

## 11. Testing strategy

Unit tests live under **`frontend/tests/`**, organized by what they cover (not co-located under `src/`):

```
frontend/tests/
  domain/
    bid/validateBidAmount.test.ts
    auction/
      dedupeBidEvent.test.ts
      computeTimeRemaining.test.ts
      auctionVisualStatus.test.ts
      mergeAuctionState.test.ts
```

| Test                    | File                                                |
| ----------------------- | --------------------------------------------------- |
| Rejects bid â‰¤ current | `tests/domain/bid/validateBidAmount.test.ts`        |
| Dedupes same `bid_id`   | `tests/domain/auction/dedupeBidEvent.test.ts`       |
| Countdown mm:ss         | `tests/domain/auction/computeTimeRemaining.test.ts` |
| &lt;30s urgent          | `tests/domain/auction/auctionVisualStatus.test.ts`  |
| Ended merge             | `tests/domain/auction/mergeAuctionState.test.ts`    |

Vitest `include`: `tests/**/*.test.ts`. Integration tests use fake SSE/HTTP where needed; avoid flaky dependence on probabilistic server quirks in CI.

## 12. Do / Avoid

**Do:** domain-first logic, quirk mapping to tests, PrimeReact, phased MVP then bonuses, PROMPTS.md.

**Avoid:** backend edits outside the one-time, feature-scoped anti-snipe exception (Â§6), trusting user `previousBid` on SSE, POST 200 as sole truth, full list re-render per event, innerHTML for API data, aggressive fetch timeouts, polling `/api/stream`, re-deriving the deadline on the client instead of adopting the authoritative `endsAt`.

## 13. Phased delivery

| Phase | Focus                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Scaffold frontend, env, smoke API                                                                                                                                                                                                                       |
| 1     | Domain + unit tests                                                                                                                                                                                                                                     |
| 2     | Catalog + countdown                                                                                                                                                                                                                                     |
| 3     | SSE + live updates                                                                                                                                                                                                                                      |
| 4     | Detail + bid form                                                                                                                                                                                                                                       |
| 5     | Reconnect + reconciliation - **done**: no false Connected before `open`; bounded reconnect give-up; request-generation guard + monotonic fetch-commit merge (list + detail) fix SSE-vs-refetch races; My Bids `Stale` status for mismatched stored bids |
| 6     | Bonuses (flags on)                                                                                                                                                                                                                                      |
| 7     | README, PROMPTS.md, polish                                                                                                                                                                                                                              |

### Definition of done (MVP)

All MUST checklist items checked; â‰¥5 tests green; manual verification of 45s SSE reconnect, bots, 409, dedupe.

## 14. Submission artifacts

- Source under `frontend/`
- `backend/server.js` - unchanged except the one-time, user-approved anti-snipe exception (Â§6); every other backend file remains untouched
- `README.md`, `frontend/PROMPTS.md`, test files, `frontend/package.json`

## 15. Decision log

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-17 | React + Vite + TS + PrimeReact + styled-components; `frontend/` folder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-07-17 | Bonuses scaffolded with feature flags; snipe is client-display only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-17 | jotai list + detail `atomFamily` + single `BidStream` SSE provider for atom patches (replaced TanStack Query)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-07-17 | Unit tests under `frontend/tests/` by concern (not under `src/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-17 | Removed unused Vite template assets (`src/assets/*`, `public/icons.svg`, oxlint stub); kept `public/favicon.svg`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-17 | Status/event values as const maps (no magic strings at call sites); Zod for bid/bidder parse+sanitize (`zod@3.25.76`); domain helpers return a single type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-07-17 | Outbid toast only after merge applies amount; `enableSound` reuses/resumes one `AudioContext`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-07-17 | Phase 5 hardening: `BidStreamService` emits `Connected` only from the real `open` handler (fixes cold-start false reconcile) and gives up after `MAX_RECONNECT_ATTEMPTS`; `fetchAuctionsList`/`fetchAuctionDetail` use a per-resource `RequestGenerationGuard` plus a monotonic `mergeFetchedAuctionSummary`/`mergeFetchedAuctionDetail` commit (epoch-aware, bid-history union) to fix SSE-vs-refetch races; background refetch failures keep existing catalog/detail data with an inline warning instead of a full-page error                                                                                                                                                                                                    |
| 2026-07-17 | My Bids: `MyBidStatus.Stale` replaces the unused `Active`; `deriveMyBidStatus` is a pure single-return-type rule (absent-from-`Success`-list or amount-behind-while-active â†’ Stale; Ended never Stale); no automatic delete of stale stored bids; `collectMyBidEntries` inverted to a single pass over `loadMyBids()` against one auction `Map`; `loadMyBids` Zod-validates each entry                                                                                                                                                                                                                                                                                                                                           |
| 2026-07-17 | Review remediation: `auctionsService` REST responses now Zod-validated (`auctionSchemas.ts`) before merge; `bidCount` merge tied to the same `bidAdvanced` branch as `currentBid`; `deriveMyBidStatus` tie edge resolves to Outbid; `BidStreamService` emits `Reconnecting` from one place; `axios` pinned to `1.18.1` (`npm audit` clean); `ConnectionStatusBadge` gained an "Offline"/"Retry" recovery affordance (`useBidStream().retryConnection`); `toSafeErrorMessage` strips internal method/path from `HttpError` text shown in the catalog/detail/bid-fallback UI                                                                                                                                                         |
| 2026-07-18 | My Bids server-reset clear: after a successful validated list fetch (raw GET payload, before monotonic merge), `clearMyBids()` runs iff â‰¥1 stored bid, every `auctionId` exists in that list, and every stored amount is strictly `>` that auctionâ€™s server `currentBid`; missing ids keep Stale behavior; empty storage is a no-write. Authoritative stackable anti-snipe remains a backend `endsAt += 15_000` rule (user+bot, remaining `(0, 10_000)`) carried on existing `new_bid`/POST payloads - **not implemented** (workspace blocks `backend/`); UI keeps â€œ(display only)â€ copy                                                                                                                                    |
| 2026-07-18 | Architecture-only pass (no code changed): finalized the authoritative anti-snipe design under a **one-time, user-granted exception** to touch only `backend/server.js` (one shared helper, two call sites, `endsAt` added to `new_bid`); finalized the matching frontend adaptation (`NewBidEvent.endsAt`, drop additive client math, fix the `mergeFetchedAuctionSnapshot` epoch/reset detector so a legitimate extension is never mistaken for a server restart); verified `shouldClearMyBidsAfterListReconcile` already implements the requested My Bids clear-all semantics exactly as specified (no changes needed). Full write-up in `docs/problems.md` #15. Implementation deferred to a follow-up turn.                    |
| 2026-07-18 | **Authoritative anti-snipe implemented** under the one-time exception: `backend/server.js` gained `SNIPE_WINDOW_MS`/`SNIPE_EXTENSION_MS` constants and `applySnipeExtension(auction, bidTimestamp)` (lines 83â€“99), wired into the bot interval (lines 176â€“195) and `POST /api/bid` with a single `bidTimestamp` reused for history/extension/bid_id/broadcast, plus `endsAt: auction.endsAt` added to both `new_bid` broadcasts - no other backend file touched. Frontend: `NewBidEvent.endsAt` (required); Zod `sseEventSchemas.ts`; `mergeNewBid*` adopt `Math.max(auction.endsAt, event.endsAt)`; client additive snipe math removed; `mergeFetchedAuctionSnapshot` reset = fetched `currentBid` regressed to `startPrice`. |
| 2026-07-18 | Opening copy remains `Bidding starts at $startPrice`; the first valid bid is `startPrice + 1` because the frozen server seeds `currentBid = startPrice` and requires `amount > currentBid`. Feature flags removed; backend Dockerfile pinned to `node:22.17.0-alpine`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
