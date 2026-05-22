# WarRoom — FireNova Clan Management

Internal dashboard for managing the FireNova Clash of Clans clan. Tracks the roster, war performance, CWL lineups, warnings, and donation stats — everything that normally lives in spreadsheets or Discord threads.

## Stack

- Next.js 16 (App Router) + TypeScript
- tRPC for server/client communication
- Prisma 7 + PostgreSQL (Prisma Postgres)
- Tailwind CSS v4

## Local setup

You'll need a `.env.local` with `DATABASE_URL` pointing at a Postgres instance, and `COC_API_TOKEN` + `COC_CLAN_TAG` from the [Clash of Clans developer portal](https://developer.clashofclans.com).

```bash
pnpm install
pnpm dev
```

App runs at `http://localhost:3000`.

## Database

Migrations live in `prisma/migrations/`. Run `pnpm exec prisma migrate dev` to apply locally. Vercel runs migrations automatically on deploy via `prisma migrate deploy`.

Sync pulls live member and war data from the CoC API. Hit the sync button in the app or call the sync endpoint directly.

## Scripts

One-off data scripts in `scripts/` — run with `pnpm exec tsx scripts/<name>.ts`.

## Tests

```bash
pnpm test
```

Vitest, unit tests only (no DB). 42 tests covering performance aggregation, CSV import/export, and roster filtering.
