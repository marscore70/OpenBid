# docs/chat.md

## 2026-07-17 — Implement BidBlitz plan

**User:** Implement the attached BidBlitz project plan (docs/plan.md, frontend scaffold, domain/SSE/MVP, tests, bonuses); complete all todos without editing the plan file.

**AI:** Added `docs/plan.md`, full `frontend/` React+Vite+TS app with PrimeReact/styled-components, domain merge/dedupe/countdown, SSE reconnect + Query cache patches, catalog/detail/bid UI, bonus features (snipe display, chart, outbid toasts, my-bids sidebar), 10 Vitest tests, README and `frontend/PROMPTS.md`. Downgraded to PrimeReact 10 + Vite 5 for stable builds on Node 20.15.

---

## 2026-07-17 — Tests layout, scaffold cleanup, reviewer + PR

**User:** Move frontend tests under `/frontend/tests` organized by what they test; clean unused Vite create leftovers (keep `/public` scaffolding); re-document everything; call reviewer agent then PR.

**AI:** Relocated 5 unit test files to `frontend/tests/domain/{bid,auction}/`; updated Vitest include path; removed unused template assets (`src/assets/*`, `public/icons.svg`), oxlint stub; kept `public/favicon.svg`; updated plan/README/PROMPTS/chat; ran Bugbot ([Bugbot](aa07cfe5-f6c0-49be-b6c7-9099656e1052)) — 2 findings; pushed `feature/bidblitz-frontend`. `gh` CLI not installed on machine — PR must be opened via GitHub compare URL.

---

## 2026-07-17 — Magic strings, single return types, Zod sanitization

**User:** Avoid magic strings (use enums/consts); fix multi-return-type functions to single types where possible; prioritize Zod for parsing/sanitization (still sanitize so text cannot break UI); search and clean existing cases.

**AI:** Introduced const maps for AuctionStatus, AuctionVisualStatus, MyBidStatus, SseConnectionStatus, SseEventType; replaced call-site string literals; `validateBidAmount`/`parseBidderName` now return single types via Zod (throws on invalid); merge helpers return auction (no `| null`); `deriveMyBidStatus` requires `myLastBid: number`; SSE parser returns `Ignored` instead of null; pinned `zod@3.25.76`. 13 tests green.

---

## 2026-07-17 — Frontend-only senior review

**User:** Act as a senior engineer reviewing the OpenBid FRONTEND codebase only. Find bugs, edge cases, architecture, security, performance, missing tests, magic strings, nested loops/functions, unclean practices. Rank Critical/High/Medium/Low. Do not implement.

**AI:** Structured frontend review (src/ focus: auction/bid/SSE/domain). Critical: shared `seenBidIds` causes summary merge to consume bid_id so detail cache never updates from SSE. High: unvalidated SSE casts, dedupe-before-apply, 409 uses throwaway Map (snipe timing leak), broken sanitizeBidderName test import, N setIntervals. Medium/Low: reconnect false-positive refetch, BidForm stale amount, missing integration tests, magic storage/query keys. No backend review.

---

## 2026-07-17 — Reviews, BidStream split, bid validation

**User:** Review frontend with review.md + security-review.md agents; split BidStreamProvider (SOLID/SoC); verify sanitizeBidderName changes + fix breakages/tests; harden validateBidAmount (empty/null/NaN/Infinity/scientific/whitespace/XSS/emoji etc.) with transform-vs-block policy; constrain PrimeReact inputs.

**AI:** Ran code review ([Frontend code review](e1ec2387-0421-451a-980e-23a92446ae26)) + security review ([Security Review](4d4ce7b1-f67b-4c1a-b70a-8003d0cd25bc)); documented remaining issues in `docs/problems.md`. Split BidStream into `app/bid-stream/*` and fixed shared `seenBidIds` so detail cache updates. Updated `parseBidderName` tests; hardened `validateBidAmount` + BidForm InputText/InputNumber constraints. 25 tests green.

---

## 2026-07-17 — SRP split, axios services, bid normalize, private stream state

**User:** Split mergeAuctionState (SRP); prefer axios service-base + per-resource services over fetch; decouple validateBidAmount normalize (no NaN sentinel for scientific); keep BidStream Maps/Sets private behind accessors.

**AI:** Split merge into DisplayTiming/registry, snipe timing, mergeNewBid, mergeAuctionEnded. Replaced fetch with Axios `apiClient` + `AuctionsService`/`BidService`. Bid strings use dedicated Zod pipe (scientific has its own error). BidStream exposes `getDisplayTiming`/`clearDisplayTiming` only; 409 clears via context. 25 tests green.

---

## 2026-07-17 — Architecture debug report (RQ→Jotai direction)

**User:** Act as a debugging expert for the OpenBid frontend. Do NOT immediately change code. Identify root causes from architecture direction (SSE, place bid 400/409, reconnect, detail vs list, DisplayTiming, jotai atomFamily); explain; suggest verification; then propose fixes. List remaining issues for docs/problems.md. Never touch git/backend.

**AI:** Read-only debug report. Confirmed Jotai not present yet (still TanStack Query). Highest-confidence bugs: premature SSE Connected → false reconnect reconcile; snipe `timingVersion` only from list cache path; place-bid success invalidates detail only; 400 omits `currentBidder`; dual merge applies snipe twice. Documented new items 16–22 in `docs/problems.md`. Proposed fixes described only (no app code changes).

---

## 2026-07-17 — DisplayTiming readonly + Jotai migration

**User:** Implement DisplayTiming readonly + non-optional get; remove mergeAuctionState facade; migrate auction/bid data from React Query to jotai atoms/services; update SSE/reconcile/outbid; keep HttpError 400/409 + clearDisplayTiming; no backend/git.

**AI:** Made `DisplayTiming` readonly with `get(auctionId, serverEndsAt)` always returning timing; deleted merge barrel + React Query; added jotai `auctionsListAtom` + `auctionDetailAtomFamily` with `AuctionsService`/`BidService`; SSE writes atoms; App uses jotai `Provider`; 28 tests green. Updated `docs/problems.md` (21–24 residual).

---

## 2026-07-17 — Senior frontend PR review (jotai)

**User:** Act as a senior engineer reviewing this pull request / current frontend changes for OpenBid. Do not implement. Only review. Focus on jotai state, Axios services, BidStream SSE, DisplayTiming, RQ removal, place bid paths, tests. Rank Critical/High/Medium/Low. Update docs/problems.md. Never touch git/backend.

**AI:** Strict read-only review of post-jotai frontend. Ranked findings written to docs/problems.md. Top issues: unvalidated SSE/REST payloads (Critical); cold-start false reconnect reconcile; fetch/SSE races; success path + monotonic merge dropping bidCount; incomplete 400 patch; full-list SSE remaps. Confirmed RQ/mergeAuctionState removal and several prior fixes still hold. Testing gaps remain for stream/mutation wiring.

---

## 2026-07-17 — Readonly timing, Jotai API layer, agents

**User:** Make DisplayTiming/registry readonly; getDisplayTiming single return type; AuctionsService+atoms/atomFamily instead of old API style; remove mergeAuctionState facade; run implement.md + debug.md agents; then review.md agent documenting problems in .md.

**AI:** Implement agent migrated to jotai list atom + detail atomFamily with Axios services; DisplayTiming readonly + `get(id, serverEndsAt)`; facade removed. Debug agent reported architecture risks. Review agent rewrote `docs/problems.md`. Follow-ups: Axios 30s timeout; place-bid `bidCount` only when ahead of SSE. 28 tests green.

---

## 2026-07-17 — BidStream callback-ref / apply SRP debug

**User:** Act as a debugging expert for OpenBid frontend. Do NOT immediately change code. Context: migrate jotai atomFamily to jotai-family; replace mutable toast callback ref with event emitter; reduce BidStreamProvider callbacks; split applySseEventToAuctionAtoms by SRP. First identify root causes/risks, reasoning, verification; then propose fixes. List unfixed items for docs/problems.md. Never touch git/backend.

**AI:** Read-only structured debug report. Root risks: toast callback-ref silent drops + no unsubscribe; outbid notify before merge; BidStream callback drilling (status/snipe/outbid); god-apply mixing dedupe/notify/list/detail/snipe; full-list remap; deprecated atomFamily. Verification steps + proposed emitter/atoms/SRP/jotai-family fixes only (no app code). Documented new Medium items 32–36 in docs/problems.md; extended testing gaps.

---

## 2026-07-17 — Implement jotai-family + BidStream SRP

**User:** Principal SE: migrate atomFamily to jotai-family; stable outbid EventEmitter; thin BidStreamProvider (atoms/module registries); split applySseEventToAuctionAtoms; run npm test + tsc; no backend/git.

**AI:** Installed `jotai-family`; module registries + `connectionStatusAtom`/`timingVersionAtom`; singleton `outbidNotifier` with subscribe/emit; Provider only starts SSE; SSE apply split into facade + new-bid/ended handlers using single-id list patch. 28 tests green; `tsc -b` clean. Residual: #33 toast-before-merge, #10 atomFamily retention.

---

## 2026-07-17 — Senior review (jotai-family / BidStream SRP)

**User:** Act as a senior engineer reviewing this PR / current frontend. Focus: jotai-family, outbidNotifier, thinned BidStreamProvider, apply SSE split, display timing atoms/registries. Do not implement. Rank Critical/High/Medium/Low. Update docs/problems.md. Never touch git/backend.

**AI:** Read-only review. Recent refactors are directionally correct (emitter, thin provider, SRP apply, jotai-family). Open Critical #1 unvalidated payloads; High #2 cold-start reconcile, #3 fetch races, #4 incomplete 400. New Medium #34 useBidStream over-subscribe, #35 AudioContext recreate, #36 deep-link list gap. Updated docs/problems.md as source of truth.

---

## 2026-07-17 — Phases 0–1 fixes (plan docs + domain notify + sound)

**User:** Implement plan phases 0–1 only: align docs/plan.md with jotai/Axios/BidStream; fix outbid toast-before-merge (notify only when amount applied); unit tests; enableSound AudioContext reuse; update problems/chat; npm test + tsc; no phase 2–5 / backend / git.

**AI:** Updated plan stack/architecture/decision log. Merge helpers return `{ auction, applied }`; apply path notifies only via `shouldNotifyOutbidWhenApplied`. enableSound creates/resumes one AudioContext. Marked problems #22/#33/#35 fixed. 37 tests green; tsc clean. Later: cold-start Connected, Zod SSE, atomFamily GC, CSP, etc.

---

## 2026-07-17 — BidForm lock, history scroll, refresh Q

**User:** BidForm allows huge amounts (breaks UI) and under-min Enter clamps to min — both should lock send preemptively via schema. Hide BidHistoryTable scroll without CSS. Why does catalog Refresh list button exist (plan.md / task.pdf)? Implement via implement.md; review via review.md/security-review.md.

**AI:** Replaced InputNumber with digit-capped InputText; Zod `isBidAmountValid` / `getBidAmountErrorMessage` lock submit + show hint (no min/max clamp). Removed DataTable scrollable/virtual scroller (page scroll; no CSS). Refresh button is not in plan MUST/BONUS or extractable task.pdf text — ad-hoc convenience (problems.md #20 notes retry only on success). Self-review: Medium — lost virtualization vs plan detail requirement; Low — empty bidder still unlocked until submit.

---

## 2026-07-17 — Detail layout, invisible scrolls, My Bids dialog

**User:** Fix bid detail page: left = bid form + info + chart; right = bid history with invisible working scroll; timestamps dd.mm.yy + 24h; My Bids must not cover history; invisible scroll on My Bids + View all Dialog; remove Refresh list. Use implement.md.

**AI:** 50/50 DetailLayout; restored virtualized history with styled invisible scrollbars; `formatBidTimestamp`; sticky capped My Bids + Dialog; removed catalog Refresh. Tests for timestamp format; tsc clean.

---

## 2026-07-17 — date-fns, form row, no page scroll

**User:** Use a library for formatBidTimestamp; put BidForm name/amount side by side; cleaner detail page; no page scroll — only table scroll.

**AI:** Switched to date-fns `format`; BidForm FieldsRow; viewport-locked shell (html/body/PageShell overflow hidden); detail flex layout with scrollHeight=flex on history only; capped chart; cleaned hero.

---

## 2026-07-17 — Empty placeholders, table fix, review loop

**User:** Empty chart/table placeholders; fix missing history table; amount under name; taller chart; implement.md then review.md agent; fix logical review findings.

**AI:** Restored viewport height chain + flex `scrollHeight` table; empty chart always mounts; stacked BidForm; taller chart (280–420px). Review agent ([Review detail page fixes](6db68175-b359-4f03-a849-ab144362b083)): fixed viewport-calc scroll, mobile overflow, invalid timestamps, empty-state tests, shared sort, catalog-owned scroll, chart section gating. 48 tests green.

---

## 2026-07-17 — History table visible, no sort, shared UI primitives

**User:** Fix history table to appear (incl. empty); remove history sorting; no global styles; clean files; move reusable styled-components to shared location; implement.md; only suggest My Bids after server reset.

**AI:** Concrete table height + skip virtualScroller when empty; removed sortBidHistory; shared `layoutPrimitives` + feature `auctionDetailLayout`; no global styles. 46 tests green. Suggested (not implemented) My Bids reconcile options after mock server reset.

---
