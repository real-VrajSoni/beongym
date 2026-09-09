-- The timetable: recurring weekly slots, and the bookings against a given date.

CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'WAITLIST', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "gym_classes" (
  "id" TEXT NOT NULL,
  "gym_id" TEXT NOT NULL,
  "coach_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "day_of_week" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL DEFAULT 45,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gym_classes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_classes_gym_id_day_of_week_idx" ON "gym_classes"("gym_id", "day_of_week");

ALTER TABLE "gym_classes"
  ADD CONSTRAINT "gym_classes_gym_id_fkey"
  FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_classes"
  ADD CONSTRAINT "gym_classes_coach_id_fkey"
  FOREIGN KEY ("coach_id") REFERENCES "trainer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "class_bookings" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_bookings_class_id_member_id_date_key"
  ON "class_bookings"("class_id", "member_id", "date");
CREATE INDEX "class_bookings_class_id_date_idx" ON "class_bookings"("class_id", "date");
CREATE INDEX "class_bookings_member_id_idx" ON "class_bookings"("member_id");

ALTER TABLE "class_bookings"
  ADD CONSTRAINT "class_bookings_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "gym_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_bookings"
  ADD CONSTRAINT "class_bookings_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
