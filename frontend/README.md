# BidBlitz frontend

React + Vite + TypeScript SPA for the live auction dashboard.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

API base URL defaults to `http://localhost:3005` in development. Override with `VITE_API_BASE_URL`.

Production Docker builds set `VITE_API_BASE_URL=""` (same-origin). nginx proxies `/api` to the `backend` Compose service and CSP allows `connect-src 'self'` only.

## Layout

- `src/` — application code (app, domain, features, infrastructure, shared)
- `tests/` — unit tests, organized by what they cover (e.g. `tests/domain/auction/`)
- `public/` — static assets (`favicon.svg`)
- `Dockerfile` / `nginx.conf` — production static serve on port **8080** (unprivileged nginx)

See the repo root [README.md](../README.md) and [docs/plan.md](../docs/plan.md) for architecture and run instructions.
