-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('AIR_CARGO', 'SEA_CARGO', 'KG_SHIPMENT');

-- CreateEnum
CREATE TYPE "ShipmentMode" AS ENUM ('AIR_CARGO', 'SEA_CARGO');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "rewardNote" TEXT;

-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "claimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "rewardType" "RewardType";

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "shipmentType" "ShipmentMode";

-- CreateTable
CREATE TABLE "reward_rules" (
    "id" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thresholdCount" INTEGER NOT NULL DEFAULT 0,
    "thresholdWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "freeShipment" BOOLEAN NOT NULL DEFAULT false,
    "freeKgLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reward_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completedWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reward_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_rules_rewardType_key" ON "reward_rules"("rewardType");

-- CreateIndex
CREATE UNIQUE INDEX "user_reward_progress_userId_rewardType_key" ON "user_reward_progress"("userId", "rewardType");

-- AddForeignKey
ALTER TABLE "user_reward_progress" ADD CONSTRAINT "user_reward_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
