-- AlterTable
ALTER TABLE "War" DROP COLUMN "membersPending";

-- CreateTable
CREATE TABLE "WarMember" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapPosition" INTEGER NOT NULL,
    "attacksUsed" INTEGER NOT NULL DEFAULT 0,
    "attacksTotal" INTEGER NOT NULL,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "destruction" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "WarMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarMember_warId_idx" ON "WarMember"("warId");

-- AddForeignKey
ALTER TABLE "WarMember" ADD CONSTRAINT "WarMember_warId_fkey" FOREIGN KEY ("warId") REFERENCES "War"("id") ON DELETE CASCADE ON UPDATE CASCADE;
