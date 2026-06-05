import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DATABASE_URL: Prisma Accelerate pooled connection — used by the app at runtime.
    // DIRECT_URL: direct (non-pooled) connection — used only by `prisma migrate deploy`
    // because pg_advisory_lock (required by migrations) is incompatible with poolers.
    url: process.env['DATABASE_URL'],
    directUrl: process.env['DIRECT_URL'],
  },
});
