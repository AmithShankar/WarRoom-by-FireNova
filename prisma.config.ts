import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // url and directUrl are declared in prisma/schema.prisma via env("DATABASE_URL") and
  // env("DIRECT_URL"). The directUrl field is not supported in defineConfig (Prisma 7
  // Datasource type only accepts `url` and `shadowDatabaseUrl`), so schema.prisma is
  // the only place it works. directUrl is required for `prisma migrate deploy` because
  // pg_advisory_lock (used for migration locking) is incompatible with connection poolers.
});
