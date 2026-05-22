-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Leader', 'CoLeader', 'Elder', 'Member');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('Staying', 'Warned', 'Left', 'Kicked');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('FullAvailability', 'Limited', 'Vacation', 'Inactive');

-- CreateEnum
CREATE TYPE "WarningReason" AS ENUM ('FailedInitialChallenge', 'MissedWarAttack', 'LowDonations', 'Behavior', 'Other');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('join', 'warning', 'kick', 'promotion', 'note');

-- CreateEnum
CREATE TYPE "WarState" AS ENUM ('preparation', 'battle', 'ended');

-- CreateEnum
CREATE TYPE "WarResult" AS ENUM ('win', 'loss', 'draw');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "townHallLevel" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "donations" INTEGER NOT NULL DEFAULT 0,
    "donationsReceived" INTEGER NOT NULL DEFAULT 0,
    "warStars" INTEGER NOT NULL DEFAULT 0,
    "cwlStars" INTEGER NOT NULL DEFAULT 0,
    "cwlDestruction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cwlAttacksUsed" INTEGER NOT NULL DEFAULT 0,
    "warTotalAttacks" INTEGER NOT NULL DEFAULT 0,
    "warThreeStarRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warAvgDestruction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warMissedAttacks" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "status" "PlayerStatus" NOT NULL DEFAULT 'Staying',
    "availability" "Availability" NOT NULL DEFAULT 'FullAvailability',
    "postedChallenge" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "kickReason" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "troopArmy" TEXT NOT NULL DEFAULT '',
    "troopSpells" TEXT NOT NULL DEFAULT '',
    "troopCc" TEXT NOT NULL DEFAULT '',
    "comfortBases" TEXT[],
    "cwlSlot" INTEGER,
    "cwlExcluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "reason" "WarningReason" NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "warPerfected" BOOLEAN,
    "mirrorCleared" BOOLEAN,
    "thLevelCleared" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ActivityType" NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "ActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClanActivity" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "player" TEXT,
    "summary" TEXT NOT NULL,

    CONSTRAINT "ClanActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "War" (
    "id" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "opponent" TEXT NOT NULL,
    "state" "WarState" NOT NULL,
    "result" "WarResult",
    "phaseEndsAt" TIMESTAMP(3) NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "attacksPerMember" INTEGER NOT NULL,
    "clanStars" INTEGER NOT NULL,
    "opponentStars" INTEGER NOT NULL,
    "clanDestruction" DOUBLE PRECISION NOT NULL,
    "opponentDestruction" DOUBLE PRECISION NOT NULL,
    "clanAttacksUsed" INTEGER NOT NULL,
    "membersPending" TEXT[],
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "War_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL,
    "membersSynced" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_playerTag_key" ON "Player"("playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "Player_cwlSlot_key" ON "Player"("cwlSlot");

-- CreateIndex
CREATE INDEX "Warning_playerId_idx" ON "Warning"("playerId");

-- CreateIndex
CREATE INDEX "ActivityEntry_playerId_idx" ON "ActivityEntry"("playerId");

-- CreateIndex
CREATE INDEX "ClanActivity_date_idx" ON "ClanActivity"("date");

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEntry" ADD CONSTRAINT "ActivityEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
