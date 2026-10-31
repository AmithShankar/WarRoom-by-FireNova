-- CreateTable
CREATE TABLE "RaidParticipation" (
    "id" TEXT NOT NULL,
    "seasonStart" TIMESTAMP(3) NOT NULL,
    "seasonEnd" TIMESTAMP(3) NOT NULL,
    "playerTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attacks" INTEGER NOT NULL,
    "attackLimit" INTEGER NOT NULL,
    "looted" INTEGER NOT NULL,

    CONSTRAINT "RaidParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClanGamesSnapshot" (
    "id" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClanGamesSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidParticipation_seasonStart_playerTag_key" ON "RaidParticipation"("seasonStart", "playerTag");

-- CreateIndex
CREATE INDEX "RaidParticipation_playerTag_idx" ON "RaidParticipation"("playerTag");

-- CreateIndex
CREATE INDEX "ClanGamesSnapshot_playerTag_takenAt_idx" ON "ClanGamesSnapshot"("playerTag", "takenAt");
