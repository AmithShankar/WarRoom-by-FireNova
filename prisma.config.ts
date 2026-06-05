import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma 7 separates CLI and runtime URLs completely.
    // DIRECT_URL (non-pooled) is used here so `prisma migrate deploy` can acquire
    // pg_advisory_lock — advisory locks are incompatible with connection poolers.
    // The runtime client in src/lib/prisma.ts uses DATABASE_URL (Prisma Accelerate)
    // via PrismaPg adapter independently — this config does not affect it.
    url: process.env['DIRECT_URL'],
  },
});
