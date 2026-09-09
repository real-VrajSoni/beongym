-- Reminders a gym sends its members: expiry, dues, birthdays and welcomes.
--
-- The rule holds the owner's template; the log holds the rendered text, so the
-- record of what went out survives an edit to the template it came from.

CREATE TYPE "MessageKind" AS ENUM ('EXPIRY_REMINDER', 'DUES_CHASE', 'BIRTHDAY', 'WELCOME');
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'SKIPPED', 'FAILED');

CREATE TABLE "message_rules" (
  "id" TEXT NOT NULL,
  "gym_id" TEXT NOT NULL,
  "kind" "MessageKind" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "days_before" INTEGER,
  "template" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_rules_gym_id_kind_key" ON "message_rules"("gym_id", "kind");

ALTER TABLE "message_rules"
  ADD CONSTRAINT "message_rules_gym_id_fkey"
  FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "message_logs" (
  "id" TEXT NOT NULL,
  "gym_id" TEXT NOT NULL,
  "client_id" TEXT,
  "rule_id" TEXT,
  "kind" "MessageKind" NOT NULL,
  "phone" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "due_on" DATE NOT NULL,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_logs_client_id_kind_due_on_key"
  ON "message_logs"("client_id", "kind", "due_on");
CREATE INDEX "message_logs_gym_id_status_idx" ON "message_logs"("gym_id", "status");
CREATE INDEX "message_logs_gym_id_due_on_idx" ON "message_logs"("gym_id", "due_on");

ALTER TABLE "message_logs"
  ADD CONSTRAINT "message_logs_gym_id_fkey"
  FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_logs"
  ADD CONSTRAINT "message_logs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_logs"
  ADD CONSTRAINT "message_logs_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "message_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
