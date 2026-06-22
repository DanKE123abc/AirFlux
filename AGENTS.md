# AirFlux

Web-based file transfer tool (similar to AirDrop) Deployed on Cloudflare.

## Structure

- `frontend/` — React 19 + Vite + Tailwind CSS 4 SPA. Entry: `src/main.tsx`. Pages: `HomePage`, `SendView`, `ReceiveView`.
- `worker/` — Hono.js Cloudflare Worker. Entry: `src/index.ts`. D1 database binding named `DB`.

Frontend builds to `frontend/dist/` which Cloudflare Workers serves as SPA assets (see `wrangler.toml` `[assets]`).

## Dev Commands

```bash
# Frontend dev server (proxies /api to localhost:8787)
cd frontend && npm run dev

# Worker dev server
cd worker && npm run deploy

# Build frontend (must run before worker deploy)
cd frontend && npm run build

# Database migration
cd worker && npm run db:migrate

# Manually trigger expired code cleanup
curl http://127.0.0.1:8787/api/cleanup
```

Worker cron runs hourly for cleanup (configured in `wrangler.toml` `[triggers]`).

## Key Architecture

- **P2P mode**: WebRTC peer-to-peer transfer via PeerJS. Sender closes tab → code auto-expires via `navigator.sendBeacon`.
- **Timed mode**: Files uploaded to cloud storage (R2). Expires after selected duration.
- **Text mode**: Stores clipboard text content in D1. 1-hour TTL.
- All modes use a 6-digit numeric pickup code stored in D1 `pickup_codes` table.
- Frontend dev proxy at `http://127.0.0.1:8787` for API calls.

## Tech Stack

- TypeScript 5.7 throughout
- React 19, Vite 6, Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- Hono.js on Cloudflare Workers with D1 database
- PeerJS for WebRTC signaling

## Gotchas

- `frontend/dist/` must exist before `wrangler deploy` — worker serves it as assets
- Frontend path alias `@/*` maps to `./src/*` (configured in `frontend/tsconfig.json`)
- Worker uses `hono/jsx` for JSX transforms, not React
- D1 database name is `airflux`, binding is `DB`


