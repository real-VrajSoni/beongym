-- Sessions become the gym's diary.
--
-- Every session these gyms run happens on their own floor, and there is no
-- member portal any more, so the request workflow and the video-call link have
-- nothing left to serve. What replaces the link is where in the gym it is.

UPDATE "sessions" SET "status" = 'SCHEDULED' WHERE "status" IN ('REQUESTED', 'RESCHEDULE_PROPOSED');
UPDATE "sessions" SET "status" = 'CANCELLED' WHERE "status" = 'DECLINED';

ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_old";
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "SessionStatus" USING ("status"::text::"SessionStatus");
ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
DROP TYPE "SessionStatus_old";

-- Live training was the online one. It is personal training now, in the room.
ALTER TYPE "SessionType" RENAME VALUE 'LIVE_TRAINING' TO 'PERSONAL_TRAINING';

ALTER TABLE "sessions"
  DROP COLUMN "requested_by_member",
  DROP COLUMN "member_note",
  DROP COLUMN "gym_reply";

ALTER TABLE "sessions" RENAME COLUMN "meeting_link" TO "location";
UPDATE "sessions" SET "location" = NULL;
