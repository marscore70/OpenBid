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

---

_Add new entries for each significant AI prompt during development._
