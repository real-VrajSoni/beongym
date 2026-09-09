-- Two weeks of timetable an owner can actually plan: one-off classes, and
-- cancelled occurrences of the recurring ones.

ALTER TABLE "gym_classes" ADD COLUMN "date" DATE;

CREATE TABLE "class_cancellations" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_cancellations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_cancellations_class_id_date_key" ON "class_cancellations"("class_id", "date");
CREATE INDEX "class_cancellations_class_id_idx" ON "class_cancellations"("class_id");

ALTER TABLE "class_cancellations"
  ADD CONSTRAINT "class_cancellations_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "gym_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
