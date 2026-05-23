# WarRoom by FireNova

Internal dashboard for managing FireNova in Clash of Clans. Tracks the roster, war performance, CWL lineups, warnings, and donation stats, replacing the spreadsheets and Discord threads we used before.

## Stack

- Next.js 16 (App Router) + TypeScript
- tRPC v11 for server/client communication
- Prisma 7 + PostgreSQL (Prisma Postgres, pooled connection)
- Tailwind CSS v4
- next-themes for dark/light mode

## Pages

- **Dashboard** - Overview cards, current war panel (or last completed war when idle), and activity feed
- **Roster** - Full member list with filtering, sorting, and per-player detail sheets
- **CWL Planner** - Drag-and-drop 15-player lineup builder
- **Performance** - Per-player war stats accumulated across all completed wars
- **Warnings** - Chronological audit log of all issued warnings
- **Activity** - Complete clan event log (joins, departures, war results)

## Local Setup

Create `.env.local` with:

```
DATABASE_URL=           # Postgres connection string
COC_API_TOKEN=          # Token from developer.clashofclans.com
COC_CLAN_TAG=           # Your clan tag (e.g. #ABC123)
```

Then:

```bash
pnpm install
pnpm dev
```

App runs at `http://localhost:3000`.

### CoC API note

The default base URL is `https://cocproxy.royaleapi.dev/v1`, a community proxy that removes the IP whitelist restriction on the official API. This is needed for serverless deployments (Vercel) where outbound IPs rotate. If you are on a fixed-IP host, set `COC_API_BASE_URL=https://api.clashofclans.com/v1` in your env to use the official endpoint directly.

## Database

Migrations live in `prisma/migrations/`. Apply locally with:

```bash
pnpm exec prisma migrate dev
```

Vercel runs `prisma migrate deploy` automatically on each deploy via the `build` script.

To seed from live CoC data:

```bash
pnpm exec prisma db seed
```

There are two war data models:

- `War` - Live war state, deleted and recreated on each sync
- `WarRecord` - Permanent archive written when a war ends, with aggregate scores and per-member participation stats

## Sync

Sync runs automatically in the background whenever the app is used. Every tRPC query checks whether the last successful sync is older than 30 minutes. If it is, a sync fires in the background without blocking the response, so the page loads instantly from the database and picks up fresh data on the next request.

To force an immediate sync, call the sync endpoint directly:

```bash
curl https://your-app.vercel.app/api/cron/sync
```

There is no Vercel cron job configured. The Hobby plan only allows one daily job, which is not frequent enough to be useful.

## Tests

```bash
pnpm test
```

Vitest, unit tests only (no DB). 48 tests covering war result mapping, CSV import/export, validation, and roster filtering.
