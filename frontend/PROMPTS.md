# PROMPTS.md — AI usage log (BidBlitz)

This file documents AI assistance used for this assignment, per grading requirements.

## Session: Project planning (2026-07-17)

**Prompt (summary):** Plan entire BidBlitz project from `docs/task_description.pdf`; create `docs/plan.md`; frontend-only; identify backend quirks; architecture agents.

**Expected:** Architecture, MUST vs BONUS scope, workarounds for QUIRK 1–7, stack decisions.

**Received:** Layered frontend design, quirk matrix, React + Vite + TS + PrimeReact recommendation, phased delivery.

**Changed:** Locked stack to React/Vite/TS, PrimeReact, styled-components, `frontend/` folder; bonuses scaffolded with feature flags; snipe documented as client-display only.

## Session: Implementation (2026-07-17)

**Prompt (summary):** Implement plan — docs, scaffold, domain/SSE/MVP, tests, README, bonuses.

**Expected:** Full working dashboard against mock server on port 3005.

**Received:** Generated domain modules, SSE service, Query cache patching, catalog/detail/bid UI, unit tests, README.

**Changed:** Manual review of hook order in detail page; reconnect refetch on SSE resume; outbid toasts wired to Toast + optional Web Audio after user submits bid.

## Session: Test layout + scaffold cleanup + PR (2026-07-17)

**Prompt (summary):** Move frontend tests under `/frontend/tests` organized by what they test; clean unused Vite create leftovers (keep `public/` scaffolding); re-document; call reviewer agent and open a PR.

**Expected:** Tests relocated with clear folders; unused template assets gone; docs updated; reviewer feedback; PR created.

**Received / applied:**

- Tests moved to `tests/domain/bid/` and `tests/domain/auction/`
- Removed unused `src/assets/*`, `public/icons.svg`, orphaned oxlint config/script
- Kept `public/favicon.svg`; retitled page to BidBlitz
- Updated `docs/plan.md`, root README, `frontend/README.md`, this PROMPTS.md, `docs/chat.md`
- Reviewer agent + `gh pr create`

## Reflection

- **Worked well:** Mapping each server QUIRK to a named domain function and test; keeping merge logic pure for Vitest; separating `tests/` from `src/` per project rules.
- **Lessons:** Do not trust `previousBid` on user SSE events; server snipe extension does not exist — UI must not imply server timer changed; Vite template assets/`icons.svg` are unused noise after scaffold.
- **Would iterate:** Add integration test with fake EventSource; tighten TypeScript response parsers for API bodies.

## Session: Magic strings, single returns, Zod (2026-07-17)

**Prompt (summary):** Avoid magic strings; single return types for functions; Zod for parsing/sanitization while still stripping unsafe text.

**Expected:** Const/enum status values; no `| null` Result-style domain APIs where avoidable; Zod-backed bidder/bid validation.

**Received / applied:** Const maps for statuses/SSE events; Zod schemas for bid amount + bidder name; merge/SSE helpers return one type; tests updated (13 passing).

## Session: Implement verified review findings (2026-07-18)

**Prompt (summary):** Act as Principal Software Engineer per `.cursor/prompts/implement.md`; implement verified review findings in `frontend/` only; no backend/git; focused fixes for atom resurrection, timing bump, BidForm amount sync, detail Retry, error sanitize/safe messages, storage logger warns, double catalog fetch, optimistic bid history, SSE parse observability, quote normalization, test audit, docs.

**Expected:** Minimal robust fixes using existing RequestGenerationGuard / clearDisplayTiming / Zod / logger; tests assert behavior/boundaries not fragile copy; `tsc` + `npm test` + `npm audit` clean.

**Received / applied:** Generation invalidate + tracked commit gate on untrack; `clearDisplayTiming` on `auction_ended`; `syncBidAmountTextToMinimum`; detail Retry; place-bid error Zod sanitize/truncate; `toSafeErrorMessage` constants only; storage warn logs; `useAuctionListReader` + Loading guard; optimistic bid without fabricated history; SSE malform warns; quote doubles; deleted tautology helper/test; docs updated.

---

## Session: Block self-outbidding (2026-07-18)

**Prompt (summary):** Use `.cursor/prompts/implement.md` to block a user from outbidding themself.

**Expected:** The current leader cannot submit another bid under the same normalized bidder identity; different bidders and auctions without a leader remain valid.

**Received / applied:** Added a pure identity guard using existing bidder sanitization, wired `currentBidder` into `BidForm`, disabled submission for matching names, and added boundary tests for case/whitespace normalization, different users, no leader, and empty input.

## Session: Production-gate implement (2026-07-18)

**Prompt (summary):** Use `.cursor/prompts/implement.md` to fix production-gate findings (Docker/compose/nginx, env, identity, pins, docs).

**Expected:** Containerized compose works; CSP/API aligned; identity consistent; tests green.

**Received / applied:** Same-origin Docker build (`VITE_API_BASE_URL=""`), nginx `/api` proxy + `connect-src 'self'`, compose on 8080 with healthchecks, unprivileged pinned nginx, shared `isSameBidderIdentity`, Unicode hardening, exact dep pins, README jotai fix, prod env tests. Left auth (#5) and always-on feature flags.

## Session: Opening bid copy + startPrice (2026-07-18)

**Prompt (summary):** No-bids UI should say bidding starts at start price (no empty Leader); allow first bid equal to start price.

**Expected:** Clear opening copy; startPrice valid when no leader; subsequent bids still must outbid.

**Received / applied:** `resolveActiveBidPresentation` + catalog/detail wiring. Bid floor stays `startPrice + 1` to match mock `amount > currentBid` (no backend change).

---

## Session: Final gate review + closed-without-sale (2026-07-18)

**Prompt (summary):** Full requirements/security review then implement; ended no-bids ? Closed without a sale (yellow).

**Received / applied:** Confirmed all MUST+bonuses; no XSS. Copy + duplicate-line fix; safer catalog/detail errorMessage; getBidValidationMessage no longer leaks Error.message.

---

## Session: Opening min=startPrice + remove feature flags (2026-07-18)

**Prompt (summary):** Min bid = startPrice; remove always-true feature flags; no server.js; pin backend Dockerfile OK; then harsh review.

**Received / applied:** validateBidAmount opening floor; deleted features.ts; Dockerfile pin; problems.md #22 server contract gap.

---

## Session: Restore server-aligned minimum + system summary (2026-07-18)

**Prompt (summary):** Restore the opening minimum to `startPrice + 1` and create
`docs/summery.md` explaining the full project, decisions, rationale, and behavior.

**Received / applied:** Bid validation and form defaults again mirror the frozen
server’s strict `amount > currentBid` contract. Added a complete architecture,
runtime-flow, security, testing, Docker, tradeoff, and decision explanation in
`docs/summery.md`; linked it from the root README.

---
