-- One permanent check-in code per gym, so the QR poster can be printed once.

ALTER TABLE "gyms" ADD COLUMN "check_in_code" TEXT;

-- Backfill every existing gym with its own random code. gen_random_uuid() is
-- in core Postgres 13+, so this needs no extension.
UPDATE "gyms" SET "check_in_code" = replace(gen_random_uuid()::text, '-', '') WHERE "check_in_code" IS NULL;

ALTER TABLE "gyms" ALTER COLUMN "check_in_code" SET NOT NULL;
CREATE UNIQUE INDEX "gyms_check_in_code_key" ON "gyms"("check_in_code");
