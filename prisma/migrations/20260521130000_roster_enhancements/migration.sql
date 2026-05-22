-- AlterTable
ALTER TABLE "Player" DROP COLUMN "availability";

-- AlterTable
ALTER TABLE "Warning" ALTER COLUMN "durationHours" DROP NOT NULL,
ALTER COLUMN "expirationDate" DROP NOT NULL;

-- DropEnum
DROP TYPE "Availability";
