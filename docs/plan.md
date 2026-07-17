# BidBlitz (OpenBid) — Project Plan

## 1. Purpose & scope

BidBlitz is a live auction bidding dashboard for Noa's vintage shop: browse auctions, place bids, watch countdowns, and see winners when timers expire. The **provided mock server** ([`backend/server.js`](../backend/server.js)) is owned by another team — **frontend-only changes** are allowed.

This document is the single source of truth for architecture, requirements, backend workarounds, and delivery phases.

## 2. Stack & repo layout

| Area | Choice |
|------|--------|
| Frontend | React 18, Vite, TypeScript (strict) |
| UI | PrimeReact (Card, DataTable, Toast, Chart, etc.) |
| Styling | styled-components; inline `style` only for ≤2 properties |
| Server state | TanStack Query |
| Real-time | Single `EventSource` to `/api/stream` |
| Tests | Vitest |
| API base | `VITE_API_BASE_URL` (default `http://localhost:3005`) |

```
OpenBid/
  backend/server.js    # Do not modify
  frontend/            # SPA application
    src/               # app code
    tests/             # unit tests (by concern: domain/auction, domain/bid, …)
    public/            # static assets (favicon)
  docs/plan.md         # This file
  README.md            # Run instructions
```

## 3. Requirements — MUST vs BONUS

### MUST (MVP)

- [x] **Catalog** — `GET /api/auctions`: title, emoji, current bid, bidder, mm:ss countdown; green active / red pulse (&lt;30s) / gray ended + winner
- [x] **Detail** — `GET /api/auctions/:id` with full bid history (virtualized table)
- [x] **SSE** — `new_bid`, `auction_ended`; ignore `heartbeat`
- [x] **Place bid** — `POST /api/bid`; client validation; loading during 800–2500ms delay; clear **400** / **409** messages
- [x] **Races** — outbid during delay, auction ended in-flight, duplicate `bid_id` dedupe
- [x] **SSE lifecycle** — auto-reconnect (~45s drops); Connected / Disconnected / Reconnecting; refetch after reconnect
- [x] **Tests** — ≥5 unit tests on pure domain logic (no DOM), under `frontend/tests/`
- [x] **SPA** — no full page reloads
- [x] **Security** — sanitize bidder input; no `dangerouslySetInnerHTML` for API strings
- [x] **Observability** — structured logs for reconnect, dedupe, bid failures; user-visible errors
- [x] **Performance** — patch single auction on SSE; clear timers on end/unmount
- [x] **PROMPTS.md** + README

### BONUS (implemented behind feature flags; MVP ships first)

- [x] **Bid snipe protection** — client-only +15s display when bid arrives with &lt;10s left (server `endsAt` unchanged)
- [x] **Bid history chart** — PrimeReact Chart from merged history
- [x] **Outbid notifications** — Toast + optional sound after user gesture
- [x] **My Bids tracker** — sidebar: winning / outbid / won / lost from local username

## 4. Architecture

### Layers

1. **Presentation** — PrimeReact pages and feature components
2. **Application** — hooks, `BidStreamProvider`, Query cache patches
3. **Domain** — pure TS: merge, dedupe, validate, countdown, status, snipe policy
4. **Infrastructure** — HTTP client, SSE service

### State

- TanStack Query holds REST snapshots (list + detail).
- One SSE connection at app shell; events run through domain merge then `queryClient.setQueryData`.
- Bid submission: local pending state per auction; reconcile with SSE/GET after POST.

### Data flow

```
REST GET ──► Query cache ◄── domain merge ◄── SSE (dedupe, monotonic bids)
POST bid ──► pending UI ──► success/error ──► refetch/patch cache
SSE disconnect ──► reconnect ──► refetch list + open detail
```

## 5. Backend API reference

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/auctions` | Summaries, no `bidHistory` |
| GET | `/api/auctions/:id` | Full auction + `bidHistory` |
| POST | `/api/bid` | `{ auctionId, bidder, amount }` |
| GET | `/api/stream` | SSE: `connected`, `new_bid`, `auction_ended`, `heartbeat` |

## 6. Backend limitations & client workarounds

**We cannot change the backend.** All mitigations are client-side.

### Documented quirks (QUIRK 1–7)

| ID | Behavior | Workaround |
|----|----------|------------|
| 1 | POST bid delayed 800–2500ms | Pending UI, no double-submit, reconcile after response |
| 2 | ~20% duplicate SSE (same `bid_id`) | Dedupe by `bid_id` before merge |
| 3 | 409 if auction ended during delay | Ended UX with `winner` / `finalPrice`; never success toast |
| 4 | Out-of-order events (spec) | Apply only if `amount > currentBid`; sort history by `timestamp` |
| 5 | `heartbeat` every 15s | Filter in SSE parser |
| 6 | SSE hard close ~45s, no replay | Reconnect + backoff; refetch REST |
| 7 | List GET +500ms (30%) | Skeletons; generous client timeout |

### Undocumented / buggy behavior

| Issue | Workaround |
|-------|------------|
| Bot bidders every 8–15s | Treat SSE as live truth |
| User bid SSE sets `previousBid === amount` | Derive increment from prior local `currentBid` |
| In-memory server state | Tolerate restart; refetch on load |
| No auth on `bidder` | Sanitize display; username in localStorage is not identity |
| `endsAt` server-authoritative | Countdown from `endsAt - Date.now()`; trust `auction_ended` / 409 |
| Weak server `amount` validation | Client: positive finite integer before POST |

### Bonus vs server

**Snipe protection** only extends **display** time (`displayEndsAt`). When server sends `auction_ended` or 409, **server wins** — show ended even if local timer was extended.

## 7. Feature design

### Catalog

- Fetch list on mount; skeleton while loading (QUIRK 7).
- Per-card countdown via shared tick (1s) from server `endsAt`.
- Visual status from `auctionVisualStatus` (active / urgent / ended).
- Click navigates to detail route (SPA).

### Detail

- Fetch detail by id; merge SSE updates into cache.
- Bid form: name (persisted), amount, validation, submit with loading.
- History: DataTable with virtual scrolling for long lists.

### SSE

- `BidStreamService`: connect, parse, ignore heartbeat, emit domain events.
- On reconnect: set status Reconnecting → refetch auctions (+ detail if open).

## 8. Bonus features

Controlled by [`frontend/src/config/features.ts`](../frontend/src/config/features.ts):

| Flag | Module |
|------|--------|
| `snipeProtection` | `domain/snipe/SnipeExtensionPolicy.ts` |
| `bidHistoryChart` | `features/auction-detail/BidHistoryChart.tsx` |
| `outbidNotifications` | `features/notifications/outbidNotifier.ts` |
| `myBidsTracker` | `features/my-bids/` |

## 9. Security & performance

- Trim and length-limit bidder name; strip control characters.
- React text for all API-driven strings.
- Patch one auction in list cache on SSE; avoid remounting entire catalog.
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

| Test | File |
|------|------|
| Rejects bid ≤ current | `tests/domain/bid/validateBidAmount.test.ts` |
| Dedupes same `bid_id` | `tests/domain/auction/dedupeBidEvent.test.ts` |
| Countdown mm:ss | `tests/domain/auction/computeTimeRemaining.test.ts` |
| &lt;30s urgent | `tests/domain/auction/auctionVisualStatus.test.ts` |
| Ended merge | `tests/domain/auction/mergeAuctionState.test.ts` |

Vitest `include`: `tests/**/*.test.ts`. Integration tests use fake SSE/HTTP where needed; avoid flaky dependence on probabilistic server quirks in CI.

## 12. Do / Avoid

**Do:** domain-first logic, quirk mapping to tests, PrimeReact, phased MVP then bonuses, PROMPTS.md.

**Avoid:** backend edits, trusting user `previousBid` on SSE, POST 200 as sole truth, full list re-render per event, innerHTML for API data, aggressive fetch timeouts, polling `/api/stream`, pretending snipe changes server `endsAt`.

## 13. Phased delivery

| Phase | Focus |
|-------|--------|
| 0 | Scaffold frontend, env, smoke API |
| 1 | Domain + unit tests |
| 2 | Catalog + countdown |
| 3 | SSE + live updates |
| 4 | Detail + bid form |
| 5 | Reconnect + reconciliation |
| 6 | Bonuses (flags on) |
| 7 | README, PROMPTS.md, polish |

### Definition of done (MVP)

All MUST checklist items checked; ≥5 tests green; manual verification of 45s SSE reconnect, bots, 409, dedupe.

## 14. Submission artifacts

- Source under `frontend/`
- Unchanged `backend/server.js`
- `README.md`, `frontend/PROMPTS.md`, test files, `frontend/package.json`

## 15. Decision log

| Date | Decision |
|------|----------|
| 2026-07-17 | React + Vite + TS + PrimeReact + styled-components; `frontend/` folder |
| 2026-07-17 | Bonuses scaffolded with feature flags; snipe is client-display only |
| 2026-07-17 | TanStack Query + single SSE provider for cache patches |
| 2026-07-17 | Unit tests under `frontend/tests/` by concern (not under `src/`) |
| 2026-07-17 | Removed unused Vite template assets (`src/assets/*`, `public/icons.svg`, oxlint stub); kept `public/favicon.svg` |
