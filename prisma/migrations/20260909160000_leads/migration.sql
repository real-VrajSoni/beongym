-- Enquiries, and the follow-ups against them.

CREATE TYPE "LeadSource" AS ENUM ('WALK_IN', 'CALL', 'WHATSAPP', 'INSTAGRAM', 'REFERRAL', 'WEBSITE', 'MAP', 'OTHER');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'TRIAL_BOOKED', 'JOINED', 'LOST');

CREATE TABLE "leads" (
  "id" TEXT NOT NULL,
  "gym_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "source" "LeadSource" NOT NULL DEFAULT 'WALK_IN',
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "interest" TEXT,
  "notes" TEXT,
  "next_follow_up_at" DATE,
  "joined_at" TIMESTAMP(3),
  "lost_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_gym_id_status_idx" ON "leads"("gym_id", "status");
CREATE INDEX "leads_gym_id_next_follow_up_at_idx" ON "leads"("gym_id", "next_follow_up_at");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_gym_id_fkey"
  FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_activity" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_activity_lead_id_idx" ON "lead_activity"("lead_id");

ALTER TABLE "lead_activity"
  ADD CONSTRAINT "lead_activity_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
