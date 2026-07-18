# OpenBid (BidBlitz)

Live auction bidding dashboard — frontend SPA + provided mock server.

## Prerequisites

- Node.js 22+ (Docker images pin `node:22.17.0-alpine`)
- Mock server (unchanged): [`backend/server.js`](backend/server.js)

## Run locally

Terminal 1 — API & SSE (port **3005**):

```bash
cd backend
npm install
node server.js
```

Terminal 2 — frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (typically `http://localhost:5173`). Optional: set `VITE_API_BASE_URL` in `frontend/.env` if the API is not on `http://localhost:3005`.

## Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080` (nginx, non-root, proxies `/api` → `backend:3005`)
- Backend stays on the Compose network only (not published to the host) so the authless API is not reachable cross-origin from other tabs.
- Production SPA build uses same-origin API (`VITE_API_BASE_URL=""`); CSP `connect-src 'self'` matches the reverse proxy.

## Scripts

| Location    | Command         | Purpose                    |
| ----------- | --------------- | -------------------------- |
| `frontend/` | `npm run dev`   | Dev server                 |
| `frontend/` | `npm run build` | Production build           |
| `frontend/` | `npm test`      | Vitest (`frontend/tests/`) |

## Architecture

See [`docs/plan.md`](docs/plan.md) for requirements, backend quirks (client workarounds only), and layer structure.
See [`docs/summary.md`](docs/summary.md) for the complete system walkthrough and decision rationale.

**Summary:** React + Vite + TypeScript, PrimeReact UI, styled-components layout, jotai (+ `jotai-family`) for REST state, single SSE connection with reconnect + refetch, pure domain modules for merge/dedupe/validation/countdown.

**Tests:** under [`frontend/tests/`](frontend/tests/), organized by domain concern (`tests/domain/auction/`, `tests/domain/bid/`).

## Known limitations

- Mock server is in-memory; restart clears auctions.
- Bid snipe extension is **server-authoritative** (`endsAt += 15s` in the closing window); the UI shows a “Time extended” tag when `endsAt` increases.
- No real authentication; bidder names are client-supplied.
- SSE drops ~every 45s by design — the app reconnects and refetches.
- The stock mock seeds `currentBid` at `startPrice` and requires a strictly higher bid, so the first valid bid is `startPrice + 1`.

## Submission docs

- System walkthrough: [`docs/summary.md`](docs/summary.md)
- AI prompt log (required): [`frontend/PROMPTS.md`](frontend/PROMPTS.md)
- Session notes: [`docs/chat.md`](docs/chat.md)

## Agentic work

Agent prompts and Cursor rules live under [`.cursor/prompts`](.cursor/prompts) and [`.cursor/rules`](.cursor/rules).
