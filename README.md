# Robotics & Autonomous Systems Club Management Platform

Start here: [`docs/00_Project_Constitution.md`](./docs/00_Project_Constitution.md).
That document governs everything about how this project is built — read it
before touching code.

## Local Development

```bash
npm install

# Terminal 1 — backend API (Hono on Cloudflare Workers)
npm run dev:backend    # http://localhost:8787

# Terminal 2 — frontend (Next.js, deployed via OpenNext to Cloudflare Workers)
npm run dev:frontend   # http://localhost:3000
```

Visit `http://localhost:3000` — it calls the backend's `/api/health` route
to confirm the two are wired together correctly.

## Structure
- `frontend/` — Next.js app (Cloudflare Workers via OpenNext adapter)
- `backend/` — Hono API (Cloudflare Worker)
- `database/` — Drizzle ORM schema and migrations (Cloudflare D1)
- `workers/` — auxiliary Workers (cron, notifications) — not yet built
- `docs/` — the full engineering handbook (20 documents, see `00_Project_Constitution.md` §5 for the index)
- `tests/` — cross-cutting integration/e2e tests

## Current Status
Module 1 (Project Scaffolding) — skeleton only, no business features yet.
See `docs/17_Feature_Roadmap.md` for what's next.
