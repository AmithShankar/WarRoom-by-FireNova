-- AlterTable
ALTER TABLE "WarParticipation" ADD COLUMN     "excuseReason" TEXT,
ADD COLUMN     "excused" BOOLEAN NOT NULL DEFAULT false;
