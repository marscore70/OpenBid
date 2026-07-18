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

---
