-- Two features come out: weekly check-ins and the session diary.
--
-- Both existed to record something a gym already knows in a form only this
-- product could read. What replaces them is attendance — a member either turned
-- up or did not, which the QR at the door answers by itself.

ALTER TABLE "trainer_notes" DROP CONSTRAINT IF EXISTS "trainer_notes_check_in_id_fkey";
ALTER TABLE "trainer_notes" DROP CONSTRAINT IF EXISTS "trainer_notes_session_id_fkey";
DROP INDEX IF EXISTS "trainer_notes_check_in_id_idx";
ALTER TABLE "trainer_notes" DROP COLUMN IF EXISTS "check_in_id";
ALTER TABLE "trainer_notes" DROP COLUMN IF EXISTS "session_id";

DROP TABLE IF EXISTS "body_measurements";
DROP TABLE IF EXISTS "check_ins";
DROP TABLE IF EXISTS "sessions";

DROP TYPE IF EXISTS "SessionType";
DROP TYPE IF EXISTS "SessionStatus";
