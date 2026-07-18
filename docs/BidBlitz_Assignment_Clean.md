# Interview Task #5: Live Auction Bidding Platform — "BidBlitz"

## General Information

| Field | Details |
|---|---|
| **Level** | Senior Frontend Developer |
| **Core Topics** | Event-Driven Architecture, Race Conditions, Countdown Synchronization, Async Bid Validation, Unit Testing |
| **Allowed Tools** | Any AI assistant, any documentation, any npm package. **Document all AI prompts in `PROMPTS.md`.** |
| **Estimated Time** | 4–8 hours |
| **Stack** | Vanilla JavaScript (or any framework) + provided Node.js mock server |

## User Story

Your friend **Noa** runs vintage auctions... Last week two bidders argued over a 1987 Nintendo...

> "I just need something that shows people what's up for auction, lets them bid, and when the timer runs out—boom—we know who won."

## Task

Build a **Live Auction Bidding Dashboard** connected to the provided mock server using **Server-Sent Events (SSE)**.

## Mock Server Setup

Copy the provided `server.js` from the assignment PDF **unchanged** and run:

```bash
node server.js
```

Server runs on:

```text
http://localhost:3005
```

> **Note:** The complete `server.js` source is intentionally omitted here because it should be copied verbatim from the PDF.

## Server Quirks

1. POST `/api/bid` delayed 800–2500 ms.
2. Duplicate SSE events.
3. 409 if auction ends while processing bid.
4. Out-of-order SSE events.
5. Heartbeat every 15 seconds.
6. SSE disconnect every ~45 seconds.
7. `/api/auctions` sometimes delayed 500 ms.

# Requirements

## 1. Auction Catalog

| Requirement | Details |
|---|---|
| Fetch auctions | GET `/api/auctions` |
| Countdown | Live `mm:ss` timer |
| Status | Active=green, <30s=red, Ended=gray |
| Details | GET `/api/auctions/:id` |

## 2. Real-Time Updates

- Connect to GET `/api/stream`
- Handle `new_bid`
- Handle `auction_ended`
- Ignore `heartbeat`

## 3. Place Bid

- Bidder name
- Bid amount
- POST `/api/bid`
- Client validation
- Loading state
- Handle 400 and 409

## 4. Race Conditions

- Outbid during validation delay
- Auction ends during request
- Deduplicate duplicate `bid_id` events

## 5. SSE Connection

- Auto reconnect
- Connection indicator
- Refresh data after reconnect

## 6. Unit Tests

Minimum **5 tests** covering:

- Bid validation
- Duplicate detection
- Countdown calculation
- Auction status transitions

Logic must be separated from UI.

# Bonus

- Bid snipe protection
- Bid history chart
- Notifications
- My bids tracker

# Technical Requirements

- SPA
- `PROMPTS.md`
- Clean architecture
- Visible errors
- Accurate countdown using `endsAt`

# Recommended Order

1. Setup
2. Catalog
3. SSE
4. Bidding
5. Race conditions
6. Reconnect
7. Tests
8. Polish
9. Bonus

# Submission

- Source
- `server.js`
- `README.md`
- `PROMPTS.md`
- Tests
- `package.json`

# Evaluation

- Spec-driven development
- Architecture
- Security
- Performance
- Observability
- Tests
