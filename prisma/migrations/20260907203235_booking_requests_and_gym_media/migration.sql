-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "SessionStatus" ADD VALUE 'RESCHEDULE_PROPOSED';
ALTER TYPE "SessionStatus" ADD VALUE 'DECLINED';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "gym_reply" TEXT,
ADD COLUMN     "member_note" TEXT,
ADD COLUMN     "requested_by_member" BOOLEAN NOT NULL DEFAULT false;
