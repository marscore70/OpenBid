# OpenBid / BidBlitz — System Summary and Decision Record

## 1. What the project is

OpenBid is a React single-page auction dashboard connected to the provided Node.js mock server.
It supports:

- an auction catalog with live countdowns and visual status;
- auction details and bid history;
- bid placement with client validation and visible failures;
- live Server-Sent Events (SSE);
- reconnect and reconciliation after stream loss;
- duplicate and out-of-order event protection;
- server-authoritative anti-snipe extensions;
- a bid-history chart;
- outbid notifications;
- a local “My Bids” tracker;
- production serving through Docker Compose and nginx.

The assignment source is `docs/BidBlitz_Assignment_Clean.md`. The implementation plan and
historical change log are in `docs/plan.md`. This file explains the final design, why the
important decisions were made, and how the pieces cooperate.

## 2. Repository structure

```text
OpenBid/
  backend/
    server.js                 Mock API and SSE server
    Dockerfile                Pinned Node container
  frontend/
    src/
      app/                    App composition and SSE application layer
      config/                 Environment resolution
      domain/                 Pure business rules
      features/               Catalog, detail, notifications, My Bids
      infrastructure/         Axios API and EventSource adapters
      shared/                 Types, storage, errors, logging, UI helpers
      state/                  Jotai stores and request coordination
    tests/                    Vitest tests organized by concern
    Dockerfile                Production multi-stage image
    nginx.conf                SPA hosting, security headers, API proxy
    PROMPTS.md                Required AI-assistance log
  docs/
    plan.md                   Requirements, architecture, decision history
    problems.md               Remaining limitations and resolved findings
    summery.md                This system explanation
  docker-compose.yml          Backend + frontend production-style stack
```

## 3. Technology decisions

### React + Vite + strict TypeScript

React provides component composition and predictable rendering for live state. Vite gives a
small development/build setup. Strict TypeScript catches invalid states and contract drift
before runtime.

### PrimeReact + styled-components

PrimeReact supplies accessible UI primitives such as cards, messages, tags, dialogs, tables,
toasts, and spinners. styled-components keeps layout and status styling close to the UI while
avoiding a second CSS architecture.

Tradeoff: styled-components requires `style-src 'unsafe-inline'` in the current CSP. Script
execution remains restricted to `'self'`, and API strings are never inserted as raw HTML.

### Jotai rather than a server-cache framework

The application originally considered a query-cache approach, then moved to:

- one list atom;
- one `atomFamily` for detail resources;
- small write functions for single-auction updates;
- explicit request-generation guards.

This fits the event-driven problem better than hiding SSE reconciliation inside query-cache
callbacks. It also makes list/detail race behavior explicit and testable.

### Axios

One shared Axios client centralizes:

- API base URL;
- JSON headers;
- a 30-second timeout;
- conversion of Axios failures into typed `HttpError`.

The timeout is intentionally longer than the mock server’s artificial delays.

### Zod at trust boundaries

TypeScript types disappear at runtime. REST responses, SSE payloads, localStorage values, bid
responses, bidder names, and amounts are external data and therefore untrusted.

Zod is used to:

- reject malformed object shapes;
- reject non-finite or unsafe numbers;
- cap text length;
- transform and sanitize network text;
- avoid copying invalid data into shared state.

Using one validation library is safer and more maintainable than scattered manual checks.

### Exact dependency versions

Dependencies are exact-pinned and Docker uses `npm ci`. This keeps clean builds reproducible
and reduces accidental supply-chain changes between review and deployment.

## 4. Application startup and routing

`frontend/src/main.tsx` mounts `App`.

`frontend/src/app/App.tsx` composes:

1. `PrimeReactProvider`;
2. the shared Jotai `Provider`;
3. one application-level `BidStreamProvider`;
4. `BrowserRouter`;
5. the catalog/detail routes and My Bids sidebar.

Routes:

- `/` — catalog;
- `/auctions/:id` — auction detail;
- unknown routes redirect to `/`.

The app shell warms the catalog even on a detail deep link. This ensures:

- My Bids has list data;
- SSE updates can patch the list immediately;
- returning to the catalog does not require a second cold fetch.

## 5. Environment and API origin

`frontend/src/config/env.ts` resolves the API base:

- development defaults to `http://localhost:3005`;
- an explicit development override is allowed;
- production requires the build variable to exist;
- an empty production value means same-origin `/api`;
- non-local production HTTP origins are rejected.

The same-origin production mode was chosen to align nginx, CSP, REST, and SSE. The browser
talks to the frontend origin, and nginx proxies `/api` to the backend service.

## 6. REST data flow

### Catalog

`auctionsService.getAll()` fetches `/api/auctions`, then validates the complete payload with
Zod before state sees it.

`fetchAuctionsList()`:

1. records a request generation;
2. fetches and validates data;
3. clears stale My Bids only when a real server reset is proven;
4. merges the fetched snapshot monotonically with newer SSE state;
5. commits only if the request generation is still current.

### Detail

`auctionsService.getById()` URL-encodes the auction id and validates the full detail payload.

Detail state uses `jotai-family` so each auction has independent state. Tracked details are
bounded and evicted when unused. Generation invalidation prevents a late request from
recreating an atom that was already removed.

### Why fetched snapshots are merged

A GET started before an SSE bid can finish after that bid. Replacing state blindly would roll
the price, bidder, history, or deadline backward. The merge functions preserve newer known
state while still accepting evidence of a genuine in-memory server reset.

## 7. Server-Sent Events

### One connection

`BidStreamService` owns one `EventSource`. A single app-level stream avoids:

- one connection per component;
- duplicate events from duplicate subscriptions;
- inconsistent reconnect behavior.

### Parsing and validation

`parseSseMessage.ts`:

- ignores `heartbeat` and the unused named `connected` event;
- catches malformed JSON;
- validates `new_bid` and `auction_ended` using Zod;
- logs a safe warning and drops invalid messages without logging raw payload data.

Connection state comes from the real EventSource `open` event, not from a payload called
`connected`.

### Duplicate events

The server intentionally repeats some `bid_id` values. An LRU cache of seen ids prevents the
same bid from applying twice while keeping memory bounded.

The id is consumed only when relevant cached auction state exists. This prevents an early
event from being permanently discarded before the corresponding auction is loaded.

### Out-of-order events

Bid prices are monotonic. `mergeNewBid` applies only a bid whose amount advances the current
known amount and refuses new bids after an auction is Ended. A delayed lower bid therefore
cannot roll state backward.

Bid history is unioned and sorted independently so list/detail snapshots and SSE can converge.

### Reconnect

On stream failure:

1. EventSource is closed;
2. status becomes Reconnecting;
3. exponential backoff starts at 500 ms and caps at 8 seconds;
4. automatic retries stop after eight failures;
5. the user can manually retry;
6. after a real reconnect, the list and tracked details are refetched.

Refetch is required because SSE has no replay in the mock server; events may be lost during
disconnection.

## 8. Countdown and visual status

Countdowns derive from `endsAt - Date.now()` instead of decrementing a local counter. This
avoids cumulative timer drift and handles server deadline changes.

The displayed value uses `Math.ceil`, so a positive fraction of a second still renders as
`00:01` rather than ending visually too early.

Visual states are pure domain output:

- Active — green;
- Urgent (less than 30 seconds) — red/pulsing;
- Ended — gray.

The countdown interval is cleared when the auction expires or the component unmounts.

## 9. Catalog and auction detail presentation

The catalog renders validated title/image data, current price state, countdown, and status.
Navigation uses React Router, so no full page reload occurs.

Presentation helpers separate business state from copy:

- opening auction — `Bidding starts at $X`;
- active auction with a leader — current bid and leader;
- ended with winner — winner or “You won”;
- ended without bids — yellow `Closed without a sale`.

The bid-history table is a scrollable PrimeReact `DataTable` (not virtualized). The chart uses Chart.js and annotation
lines for starting/sold prices. Chart data is rendered to canvas, not HTML.

## 10. Bid validation

`validateBidAmount.ts` is shared by:

- the submit gate;
- inline validation;
- the actual submit parse;
- the initial/default minimum.

The stock server seeds `currentBid` with `startPrice` and rejects
`amount <= currentBid`. Therefore the frontend minimum is:

```text
max(currentBid, startPrice) + 1
```

For a starting price of 50, the first valid bid is 51. This mirrors the frozen server contract
and prevents the form from offering a value the API will reject.

Amount validation rejects:

- empty values;
- non-numeric input;
- scientific notation;
- zero and negative values;
- `NaN` and infinity;
- values above `Number.MAX_SAFE_INTEGER`;
- bids that do not beat the server floor.

Decimal numeric input is floored because the mock auction domain uses integer bids. The live
input helper permits digits only and caps the number of digits.

### Bidder-name validation

Bidder names are:

- normalized with Unicode NFKC;
- stripped of C0 controls;
- stripped of bidi and zero-width spoofing characters;
- trimmed;
- capped at 64 characters;
- rejected when empty.

React escapes displayed strings, but sanitization still prevents confusing or invisible
identity/display spoofing.

### Self-outbid guard

The current leader cannot submit another bid using the same normalized display identity.
Identity comparison is shared by the bid form, My Bids, winner presentation, and outbid
notifications.

This is a UX guard only. The mock server has no authentication, so display names are not a
secure identity boundary.

## 11. Bid submission and race handling

`usePlaceBid.ts` uses a synchronous `useRef` lock in addition to disabled UI. This blocks
double submission before React has time to render the pending state.

### Success

On a validated success response:

1. record the local bid for My Bids;
2. patch list/detail only if the response advances price;
3. do not invent history timestamps or `endsAt`;
4. do not consume the response `bid_id`;
5. refetch detail.

SSE remains authoritative for history and the anti-snipe deadline.

### Malformed success

If the server returns HTTP 200 with an invalid body, the client does not trust it. The server
may still have accepted the bid, so the client records the attempt and reconciles with GET.

### HTTP 400

The body is validated and sanitized. If it contains a newer `currentBid`, list/detail state is
raised monotonically and the user is told to bid above that amount. This handles being outbid
during the server’s artificial validation delay.

### HTTP 409

The auction is marked Ended using the winner/final-price payload without lowering a newer
cached price. Temporary display timing is cleared and bidding is disabled.

### Safe errors

Internal request methods, paths, raw library messages, and malformed payload details are not
shown directly to users. `toSafeErrorMessage` maps failures to short safe messages; raw
details are available only to development logging.

## 12. Anti-snipe protection

The server is authoritative for auction deadlines. An accepted user or bot bid inside the
final ten seconds extends `endsAt` by fifteen seconds. Repeated qualifying bids stack.

The client does not add time itself. It:

1. accepts the validated `endsAt` carried by `new_bid`;
2. merges it monotonically;
3. notices when it increased;
4. displays a sticky “Time extended” tag.

This avoids double extension and ensures the end sweep, POST 409 behavior, REST, and SSE all
use one deadline.

## 13. Outbid notifications

Notifications are emitted only when:

- the incoming bid actually applied;
- the local normalized identity was the previous leader;
- the incoming bidder is a different normalized identity.

A module-level notifier decouples the SSE path from the React Toast. Sound is enabled only
after a user gesture because browsers block unsolicited audio. One `AudioContext` is reused
and resumed when suspended.

## 14. My Bids

The browser stores:

- the last bidder name;
- locally placed bids by auction.

Stored values are Zod-validated on read. Corrupt entries are dropped instead of being trusted.
Storage failures are logged and degrade safely.

Statuses:

- Winning;
- Outbid;
- Won;
- Lost;
- Stale.

“Stale” covers server resets and inconsistent local records without pretending the bid still
exists. The sidebar subscribes to a storage-version atom so same-tab writes update immediately.

Because there is no authentication, My Bids is a convenience tracker, not proof of ownership.

## 15. Security decisions

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `document.write`.
- API text is rendered as React text.
- REST, SSE, bid bodies, and storage are runtime-validated.
- Bidder/network text is normalized and sanitized.
- Arbitrary errors are not copied to UI.
- Production logging is silent.
- nginx sends CSP, `nosniff`, frame denial, and referrer-policy headers.
- CSP permits connections only to the same origin in Docker mode.
- nginx runs unprivileged on port 8080.
- No frontend secrets are expected: Vite variables are public by design.
- Dependencies and image versions are pinned where practical.

Remaining security limitation: bidder names are client-supplied and can be impersonated. Real
production identity requires backend authentication and server-bound authorization.

## 16. Docker and production serving

### Frontend image

The multi-stage Dockerfile:

1. builds with pinned Node and `npm ci`;
2. sets the production API base to same-origin;
3. copies only `dist` into pinned unprivileged nginx;
4. exposes port 8080;
5. includes a healthcheck.

### nginx

nginx:

- serves Vite’s static output;
- falls back to `index.html` for SPA routes;
- proxies `/api/` to `backend:3005`;
- disables proxy buffering/cache for SSE;
- uses a long read timeout for the stream;
- applies browser security headers.

### Compose

Compose:

- starts the backend;
- waits for its `/api/auctions` healthcheck;
- starts the frontend;
- maps frontend port 8080 and backend port 3005.

## 17. Testing strategy

Tests live under `frontend/tests` and focus on behavior and boundaries rather than mutable UI
copy or third-party error wording.

Coverage includes:

- bidder and amount validation;
- countdown and visual status;
- duplicate detection;
- out-of-order and Ended merges;
- REST/SSE schemas;
- malformed stream data;
- request-generation races;
- server-reset reconciliation;
- storage corruption;
- My Bids status;
- safe error mapping;
- chart model and placeholders;
- reconnect/subscription behavior;
- opening/ended presentation.

Tests are deterministic and do not depend on random bot timing or probabilistic server quirks.

## 18. Important decisions made during implementation

### Domain logic was separated from UI

Validation, status, merge, countdown, dedupe, presentation, and My Bids rules are pure
functions. This makes race rules testable without rendering components.

### TanStack Query was removed

Explicit Jotai atoms and merge functions made SSE/list/detail ownership clearer and avoided
cache-callback complexity.

### Runtime schemas were expanded

Initial TypeScript-only assumptions were replaced with Zod validation for REST, SSE, bid
responses, error bodies, and storage.

### SSE connection state was corrected

“Connected” now comes only from EventSource `open`; reconnect status is emitted in one place;
automatic retries are bounded; manual recovery is available.

### Fetch/SSE races were hardened

Request generations and monotonic snapshot merges prevent stale GET responses from replacing
newer live state or resurrecting evicted detail atoms.

### Optimistic updates were reduced

The client patches only facts confirmed by the HTTP response. It does not fabricate history,
timestamps, bid ids, or deadlines that belong to SSE/server authority.

### Error boundaries were tightened

Raw `Error.message`, request paths, malformed server text, and localStorage failures no longer
silently leak or disappear.

### Unicode identity handling was centralized

One normalized bidder comparison is now used consistently across self-outbid, winner, My Bids,
and notification logic.

### Always-true feature flags were removed

All four bonuses are final shipped features. Runtime branches that could never change were
deleted to reduce dead code and make the actual product shape explicit.

### Containerization changed from development to production semantics

The original compose/Vite-port setup did not match the nginx image. It was replaced by a
same-origin nginx deployment with a backend health dependency and CSP-compatible API proxy.

### Opening bid was aligned to the frozen server

The UI copy says bidding starts at the server’s displayed starting price, but the stock server
uses that value as the existing `currentBid` and requires a strictly higher amount. The form
therefore defaults to `startPrice + 1`.

## 19. Known limitations and tradeoffs

- The server is in-memory; restarting it resets auctions.
- There is no real authentication or authorization.
- My Bids and “You won” are display-name conveniences.
- SSE reconnect cannot replay missed events; REST reconciliation closes the gap.
- `style-src 'unsafe-inline'` remains because of styled-components.
- Some full hook/component integration paths are thinner than the domain test suite.
- The bid-history table is scrollable, not virtualized.
- The anti-snipe bonus required a narrowly scoped server change; normal backend ownership
  remains separate.

## 20. How to run and verify

Local development:

```bash
node backend/server.js
cd frontend
npm install
npm run dev
```

Production-style Compose:

```bash
docker compose up --build
```

Frontend verification:

```bash
cd frontend
npm run build
npm test
npm audit
```

The frontend is available at:

- Vite development: usually `http://localhost:5173`;
- Docker Compose: `http://localhost:8080`.
