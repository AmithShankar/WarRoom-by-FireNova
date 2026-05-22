import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { Prisma, PrismaClient } from '../../generated/prisma/client';
export type {
  Role, PlayerStatus, WarningReason, ActivityType, WarState, WarResult, SyncStatus,
  Player, Warning, ActivityEntry, ClanActivity, War, WarMember, SyncLog,
  WarRecord, WarParticipation,
} from '../../generated/prisma/client';
