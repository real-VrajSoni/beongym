-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "platform_orders" ADD COLUMN     "email" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;
