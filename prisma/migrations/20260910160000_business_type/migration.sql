-- What kind of place a listing is.
--
-- Additive, and every existing row keeps its meaning: they were all created by
-- a product that only spoke about gyms, so GYM is the truthful default rather
-- than a placeholder. Nothing about how a workspace behaves depends on this —
-- it is how a place describes itself on the public map.

CREATE TYPE "BusinessType" AS ENUM (
  'GYM', 'FITNESS_STUDIO', 'YOGA_STUDIO', 'PILATES_STUDIO', 'DANCE_STUDIO',
  'CROSSFIT_BOX', 'MARTIAL_ARTS', 'BOXING_GYM', 'CLIMBING_GYM', 'SWIMMING',
  'SPORTS_CLUB', 'PERSONAL_TRAINING', 'WELLNESS', 'OTHER'
);

ALTER TABLE "gyms" ADD COLUMN "business_type" "BusinessType" NOT NULL DEFAULT 'GYM';
CREATE INDEX "gyms_business_type_idx" ON "gyms"("business_type");
