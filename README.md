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
DATABASE_URL=                         # Postgres connection string
COC_API_TOKEN=                        # Token from developer.clashofclans.com
COC_CLAN_TAG=                         # Your clan tag (e.g. #ABC123)
CRON_SECRET=                          # Must match the cron-job.org Authorization header
NEXT_PUBLIC_VAPID_PUBLIC_KEY=         # From: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=                    # From: npx web-push generate-vapid-keys
VAPID_EMAIL=                          # mailto:your-email@example.com
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

Apply to production with `pnpm run migrate` (`prisma migrate deploy`) against the direct database URL. The build does not run migrations.

To seed from live CoC data:

```bash
pnpm exec prisma db seed
```

There are two war data models:

- `War` - Live war state, deleted and recreated on each sync
- `WarRecord` - Permanent archive written when a war ends, with aggregate scores and per-member participation stats

## Sync

A scheduled job calls the sync endpoint every 30 minutes so data stays fresh and push notifications fire on time even when nobody has the app open. See [Scheduled sync](#scheduled-sync).

To force an immediate sync (or to trigger a sync locally during development):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/sync
```

## Scheduled sync

The sync runs on cron-job.org (free). Create a job with:

- URL: `https://<your-deployment-url>/api/cron/sync`
- Method: GET
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: every 30 minutes
- Notifications: enable failure notifications

Migrations are not applied on deploy. Run `pnpm run migrate` against the direct (non pooled) database URL before deploying a change that includes a new migration.

## Push Notifications

Warning expiry notifications are sent to all subscribed devices at the end of each sync. Generate VAPID keys once:

```bash
npx web-push generate-vapid-keys
```

Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_EMAIL` to both `.env.local` and Vercel. Add `CRON_SECRET` to your Vercel environment and use the same value in the cron-job.org job (see [Scheduled sync](#scheduled-sync)).

Users enable notifications by clicking the bell icon in the top bar. iOS users must install the app first (Add to Home Screen) before the permission prompt is available.

## Tests

```bash
pnpm test
```

Vitest, unit tests only (no DB). The test suite covers war result mapping, CSV import/export, validation, roster filtering, and push notification payload building.
