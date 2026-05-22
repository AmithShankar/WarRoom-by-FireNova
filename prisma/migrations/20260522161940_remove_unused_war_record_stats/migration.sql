/*
  Warnings:

  - You are about to drop the column `attacksPerMember` on the `WarRecord` table. All the data in the column will be lost.
  - You are about to drop the column `clanDestruction` on the `WarRecord` table. All the data in the column will be lost.
  - You are about to drop the column `clanStars` on the `WarRecord` table. All the data in the column will be lost.
  - You are about to drop the column `opponentDestruction` on the `WarRecord` table. All the data in the column will be lost.
  - You are about to drop the column `opponentStars` on the `WarRecord` table. All the data in the column will be lost.
  - You are about to drop the column `teamSize` on the `WarRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WarRecord" DROP COLUMN "attacksPerMember",
DROP COLUMN "clanDestruction",
DROP COLUMN "clanStars",
DROP COLUMN "opponentDestruction",
DROP COLUMN "opponentStars",
DROP COLUMN "teamSize";
