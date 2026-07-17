# docs/chat.md

## 2026-07-17 — Implement BidBlitz plan

**User:** Implement the attached BidBlitz project plan (docs/plan.md, frontend scaffold, domain/SSE/MVP, tests, bonuses); complete all todos without editing the plan file.

**AI:** Added `docs/plan.md`, full `frontend/` React+Vite+TS app with PrimeReact/styled-components, domain merge/dedupe/countdown, SSE reconnect + Query cache patches, catalog/detail/bid UI, bonus features (snipe display, chart, outbid toasts, my-bids sidebar), 10 Vitest tests, README and `frontend/PROMPTS.md`. Downgraded to PrimeReact 10 + Vite 5 for stable builds on Node 20.15.

---

## 2026-07-17 — Tests layout, scaffold cleanup, reviewer + PR

**User:** Move frontend tests under `/frontend/tests` organized by what they test; clean unused Vite create leftovers (keep `/public` scaffolding); re-document everything; call reviewer agent then PR.

**AI:** Relocated 5 unit test files to `frontend/tests/domain/{bid,auction}/`; updated Vitest include path; removed unused template assets (`src/assets/*`, `public/icons.svg`), oxlint stub; kept `public/favicon.svg`; updated plan/README/PROMPTS/chat; invoked reviewer agent and opened PR.

---
