# Known problems / limitations

Final production review of `frontend/` (2026-07-18) against `docs/BidBlitz_Assignment_Clean.md` / assignment PDF quirks. Ranked Critical → Low. Items in **Fixed** are solved — do not reopen unless a regression is found.

Agents: [Frontend code review](92f2da03-316b-4fa0-899e-1718b3007df5), [Frontend security review](87b28c41-af28-48e5-ab14-31731691aea1), plus a dedicated race/requirements exploration pass. Follow-up implement pass (2026-07-18) closed verified Medium/High races from a second review.

**Verdict (updated 2026-07-18 implement pass):** Critical none. Remaining High is assignment-accepted **#5 no auth** only. CSP `connect-src` stays broad as an accepted deployment-origin limitation (cannot pin without a known API origin). Cosmetic quote cleanup applied in the implement pass.

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

_(none open)_

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
- **`atomFamily` → `jotai-family`** — deprecated import removed; retention addressed via untrack/`remove` (#10).
- **Docs plan drift (#22)** — `docs/plan.md` aligned to jotai + Axios + BidStream.
- **Outbid toast only when applied (#24/#33 historical)** — gate is `amountApplied && eligible` at apply site.
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
- **SSE `auction_ended` Zod + sticky-Ended safety (#1)** — `auctionEndedEventSchema` at parser; merge refuses to lower `currentBid` below cached high.
- **`new_bid` after Ended no-op (#8 / #42)** — `mergeNewBid*` returns `applied: false` when `status === Ended`.
- **400 outbid patch monotonic (#4)** — `nextCurrentBidAfterOutbidRejection` via `Math.max`; Zod-parsed error body.
- **`placeBid` success/error Zod (#7 / #21)** — `placeBidSuccessSchema` / `placeBidErrorBodySchema`; `InvalidBidResponseError` reconciles via GET.
- **Network string sanitize (#6)** — Zod transforms strip control chars on REST/SSE bidder/title/winner.
- **Connecting status (#22 / #43)** — cold-start/manual retry emit `Connecting`; Retry only on `Disconnected`.
- **Prod API URL gate (#15 / #16)** — `VITE_API_BASE_URL` required in production; non-local HTTP rejected.
- **Docker/nginx hardening (#16 / #18)** — `npm ci`, `.dockerignore`, CSP/`X-Frame-Options`/`nosniff` via `nginx.conf`.
- **HTTP status consts (#19)** — Axios `HttpStatusCode.BadRequest` / `Conflict` in `usePlaceBid`.
- **Retry clears reconnect timer (#33)** — `start()` clears pending timer + resets attempts.
- **`seenBidIds` LRU prune (#9)** — `lru-cache` (max 500) replaces unbounded `Set`.
- **Dedupe only when auction cached (#19)** — `consume` skipped until list or detail holds the auction.
- **Detail atom retention + reconnect herd (#10)** — untrack + `atomFamily.remove` on detail unmount; cap 20 tracked ids.
- **Outbid previous-leader heuristic (#11)** — notify only when pre-merge `currentBidder === username`.
- **My Bids storage subscription (#12)** — `bidderStorageVersionAtom` bumped on write; sidebar subscribes.
- **Countdown interval stop (#13)** — `useCountdownTick` clears interval once expired.
- **Visual Ended disables bid form (#14)** — `biddingDisabled` includes `AuctionVisualStatus.Ended`.
- **Place-bid optimistic detail (#15)** — success patches `currentBid`/`currentBidder` only; GET/SSE own history/`endsAt`; HTTP `bid_id` not consumed.
- **Catalog error Retry (#16)** — error branch wires `refetch`.
- **`useBidStream` split subscriptions (#17)** — `useBidStreamConnectionStatus` / `useBidStreamTimingVersion`; module fns for sound/timing/clear.
- **Deep-link catalog warm (#18)** — `AppShell` always calls `useAuctionList`; catalog/sidebar use `useAuctionListReader` (no second idle fetch).
- **Prod logger silence (#20)** — `logger` no-ops in `import.meta.env.PROD`.
- **Fallback title (#24)** — missing title uses `auctionId`, not `"Auction"`.
- **`isPlaceBidHttpError` removed (#25L)** — callers use `isHttpError`.
- **Empty detail id (#26)** — missing route id uses idle atom (no `atomFamily("")`).
- **Double-submit lock (#28)** — `useRef` in-flight guard in `usePlaceBid`.
- **Ended timing clear ungated (#29)** — `applyAuctionEndedEvent` always clears display timing.
- **Duplicate outbid guards (#30)** — `notifyOutbid` is side-effect only; gate lives in `shouldNotifyOutbid`.
- **Unused `connected` SSE (#31 / #35)** — named `connected` parsed as `Ignored`; connection from EventSource `open`.
- **`loadBidderName` Zod (#32)** — `networkBidderSchema` on read.
- **Partial-second countdown (#34)** — `Math.ceil` so active remainder shows ≥ `00:01`.
- **atomFamily resurrection race** — `untrack`/`evict` bumps `RequestGenerationGuard` + tracked-membership commit gate so late success cannot recreate orphan Success.
- **`auction_ended` timing bump** — `applyAuctionEndedEvent` uses `clearDisplayTiming` (clear + `bumpTimingVersion`).
- **BidForm stale amount** — `syncBidAmountTextToMinimum` raises field only when below new min.
- **Detail error Retry** — PrimeReact Retry wires `useAuctionDetail.refetch`.
- **placeBid error body sanitize** — Zod `sanitizeNetworkText` + max length on `error` field.
- **`toSafeErrorMessage` trust boundary** — never surfaces arbitrary `Error.message`; exported safe constants only.
- **localStorage write/remove warnings** — `logger.warn` on failure; safe fallback preserved.
- **Double catalog idle fetch** — Loading sync guard + `useAuctionListReader` for catalog/sidebar.
- **Malformed SSE observability** — dev `logger.warn` on JSON/schema failure without raw payloads.
- **Quote style (#27L)** — formatter-owned single quotes normalized to double quotes in frontend TS/TSX.
- **Malformed REST response errors** — `AuctionsService` delegates validation failures to Zod; tests assert `ZodError` type instead of mutable message copy.
- **Fragile/tautological tests** — removed boolean-helper and constructor-name tests; UI tests assert roles/state/outcomes instead of mutable labels and error text.
- **CSP `connect-src` cannot be pinned safely** — `nginx.conf` changed to use CSP
- **Self-outbidding guard** — `BidForm` blocks the current leader from bidding again under the same normalized bidder identity.

---

## Requirements coverage (final review)

| Requirement                                            | Status                                     |
| ------------------------------------------------------ | ------------------------------------------ |
| Catalog `GET /api/auctions` + Zod                      | Pass                                       |
| Live `mm:ss` countdown from `endsAt`                   | Pass                                       |
| Active green / &lt;30s red / Ended gray                | Pass                                       |
| Detail `GET /api/auctions/:id`                         | Pass                                       |
| SSE `new_bid` / `auction_ended` / ignore heartbeat     | Pass                                       |
| Place bid: name, amount, validation, loading, 400, 409 | Pass (400 raises bid only; leader via SSE) |
| Dedupe duplicate `bid_id`                              | Pass                                       |
| Out-of-order lower amount rejected                     | Pass                                       |
| Out-of-order `new_bid` after Ended                     | Pass                                       |
| Auto-reconnect + indicator + refresh after reconnect   | Pass                                       |
| ≥5 unit-test categories; logic separated from UI       | Pass (well beyond minimum)                 |
| Bonus: snipe / chart / notifications / my bids         | Pass                                       |
| SPA + `PROMPTS.md` + `README.md` + visible errors      | Pass                                       |

Server quirks: POST delay, duplicate SSE, 409-on-end, out-of-order amounts, heartbeat, ~45s disconnect, delayed auctions list — all handled.

---

## Testing gaps (still open)

Still thin or missing:

- `applySseEventToAuctionAtoms` / `applyNewBidEvent` integration (dual list+detail, dedupe-once, snipe bump) beyond ended-timing bump
- Full `usePlaceBid` hook integration (success / 400 / 409 paths)
- `BidForm` disabled / pending / visual-ended UX
- `useBidStream` subscription surface (who re-renders)

Covered in the 2026-07-18 implement pass: detail untrack late-response race, `auction_ended` timing bump, bid amount min sync, safe error boundary, place-bid error sanitize/truncate.

---

## Security review notes (2026-07-18)

- **No Critical XSS/RCE** found: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `javascript:` hrefs, open redirects, or prototype-pollution sinks (immutable field spreads only). React text rendering is sufficient; DOMPurify not added.
- **`npm audit`:** 0 vulnerabilities (reaffirms axios pin + `lru-cache` add).
- **#17 / #41:** still Fixed and holding; `toSafeErrorMessage` no longer passes through `Error.message`.
- **CSP:** left broad on purpose (see Low **16L**); do not pin `connect-src` without a configured API origin.

---

## Suggested fix order (remaining)

1. **#5** — auth (backend decision; accepted for mock).
