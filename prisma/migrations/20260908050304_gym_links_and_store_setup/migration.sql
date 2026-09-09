-- CreateEnum
CREATE TYPE "GymLinkKind" AS ENUM ('WEBSITE', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'WHATSAPP', 'MAPS', 'PHONE', 'EMAIL', 'OTHER');

-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "store_setup_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "show_price" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "gym_links" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "kind" "GymLinkKind" NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_links_gym_id_idx" ON "gym_links"("gym_id");

-- AddForeignKey
ALTER TABLE "gym_links" ADD CONSTRAINT "gym_links_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
