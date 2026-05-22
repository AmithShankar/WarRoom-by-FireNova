-- CreateTable
CREATE TABLE "WarRecord" (
    "id" TEXT NOT NULL,
    "warKey" TEXT NOT NULL,
    "isCwl" BOOLEAN NOT NULL DEFAULT false,
    "opponent" TEXT NOT NULL,
    "result" "WarResult",
    "endTime" TIMESTAMP(3) NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "attacksPerMember" INTEGER NOT NULL,
    "clanStars" INTEGER NOT NULL,
    "clanDestruction" DOUBLE PRECISION NOT NULL,
    "opponentStars" INTEGER NOT NULL,
    "opponentDestruction" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarParticipation" (
    "id" TEXT NOT NULL,
    "warRecordId" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapPosition" INTEGER NOT NULL,
    "attacksUsed" INTEGER NOT NULL DEFAULT 0,
    "attacksTotal" INTEGER NOT NULL,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "threeStars" INTEGER NOT NULL DEFAULT 0,
    "destruction" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "WarParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarRecord_warKey_key" ON "WarRecord"("warKey");

-- CreateIndex
CREATE INDEX "WarParticipation_playerTag_idx" ON "WarParticipation"("playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "WarParticipation_warRecordId_playerTag_key" ON "WarParticipation"("warRecordId", "playerTag");

-- AddForeignKey
ALTER TABLE "WarParticipation" ADD CONSTRAINT "WarParticipation_warRecordId_fkey" FOREIGN KEY ("warRecordId") REFERENCES "WarRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
