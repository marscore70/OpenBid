# OpenBid (BidBlitz)

Live auction bidding dashboard — frontend SPA + provided mock server.

## Prerequisites

- Node.js 20+
- Mock server (unchanged): [`backend/server.js`](backend/server.js)

## Run locally

Terminal 1 — API & SSE (port **3005**):

```bash
node backend/server.js
```

Terminal 2 — frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (typically `http://localhost:5173`). Optional: set `VITE_API_BASE_URL` in `frontend/.env` if the API is not on `http://localhost:3005`.

## Scripts

| Location   | Command        | Purpose              |
|-----------|----------------|----------------------|
| `frontend/` | `npm run dev`  | Dev server           |
| `frontend/` | `npm run build`| Production build     |
| `frontend/` | `npm test`     | Vitest (`frontend/tests/`) |

## Architecture

See [`docs/plan.md`](docs/plan.md) for requirements, backend quirks (client workarounds only), and layer structure.

**Summary:** React + Vite + TypeScript, PrimeReact UI, styled-components layout, TanStack Query for REST, single SSE connection with reconnect + refetch, pure domain modules for merge/dedupe/validation/countdown.

**Tests:** under [`frontend/tests/`](frontend/tests/), organized by domain concern (`tests/domain/auction/`, `tests/domain/bid/`).

## Known limitations

- Mock server is in-memory; restart clears auctions.
- Bid snipe “extension” is **display-only**; server `endsAt` and `auction_ended` win at close.
- No real authentication; bidder names are client-supplied.
- SSE drops ~every 45s by design — the app reconnects and refetches.

## Submission docs

- [`frontend/PROMPTS.md`](frontend/PROMPTS.md) — AI prompt log (assignment requirement)
