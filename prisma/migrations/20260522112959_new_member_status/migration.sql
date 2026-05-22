-- AlterEnum
ALTER TYPE "PlayerStatus" ADD VALUE 'New';

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "status" SET DEFAULT 'New';
