/*
  Warnings:

  - You are about to drop the column `discount_percent` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `shipment_timelines` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `shipments` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `shipments` table. All the data in the column will be lost.
  - Added the required column `targetTier` to the `UpgradeApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UpgradeApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverAddress` to the `shipments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverName` to the `shipments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverPhone` to the `shipments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `shipments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INSTALLMENT', 'FULL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CASH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipmentStatus" ADD VALUE 'RECEIVED_AT_HUB';
ALTER TYPE "ShipmentStatus" ADD VALUE 'PICKED_UP';
ALTER TYPE "ShipmentStatus" ADD VALUE 'ARRIVED_AT_BRANCH';

-- DropForeignKey
ALTER TABLE "UpgradeApplication" DROP CONSTRAINT "UpgradeApplication_userId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "shipment_timelines" DROP CONSTRAINT "shipment_timelines_shipmentId_fkey";

-- AlterTable
ALTER TABLE "UpgradeApplication" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "targetTier" "Tier" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "discount_percent",
DROP COLUMN "order_id",
ADD COLUMN     "payment_type" "PaymentType" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "remaining_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "issued_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shipment_timelines" DROP COLUMN "order",
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shipments" DROP COLUMN "destination",
DROP COLUMN "origin",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "containerDetails" JSONB,
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "hubId" TEXT,
ADD COLUMN     "packageDetails" JSONB,
ADD COLUMN     "receiverAddress" TEXT NOT NULL,
ADD COLUMN     "receiverName" TEXT NOT NULL,
ADD COLUMN     "receiverPhone" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT NOT NULL,
ALTER COLUMN "tracking_number" DROP NOT NULL,
ALTER COLUMN "shipped_at" DROP NOT NULL,
ALTER COLUMN "current_status" SET DEFAULT 'PENDING',
ALTER COLUMN "type" SET DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "hubProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod" NOT NULL,
    "transactionId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installmentNo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hubs_hubProviderId_key" ON "hubs"("hubProviderId");

-- CreateIndex
CREATE INDEX "payments_id_invoiceId_idx" ON "payments"("id", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_shipmentId_key" ON "rewards"("shipmentId");

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_hubProviderId_fkey" FOREIGN KEY ("hubProviderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_timelines" ADD CONSTRAINT "shipment_timelines_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplication" ADD CONSTRAINT "UpgradeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
