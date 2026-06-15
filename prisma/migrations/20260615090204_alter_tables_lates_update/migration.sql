/*
  Warnings:

  - The values [RECEIVED_AT_HUB,PICKED_UP] on the enum `ShipmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `CorporatePartnerProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'SHIPMENT', 'INVOICE', 'REWARD', 'UPGRADE', 'GENERAL');

-- CreateEnum
CREATE TYPE "RewardSource" AS ENUM ('SHIPMENT', 'REFERRAL', 'LOYALTY_BONUS', 'REDEEMED');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('CONSOLIDATED', 'FULL');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('LOADING', 'SEALED', 'IN_TRANSIT', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'DIRECT_DEBIT';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BRANCH';

-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentStatus_new" AS ENUM ('PENDING', 'AT_HUB', 'PICKED', 'ARRIVED_AT_BRANCH', 'CUSTOM_PROCESSING', 'IN_TRANSIT', 'OUT_OF_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."shipments" ALTER COLUMN "current_status" DROP DEFAULT;
ALTER TABLE "shipments" ALTER COLUMN "current_status" TYPE "ShipmentStatus_new" USING ("current_status"::text::"ShipmentStatus_new");
ALTER TABLE "shipment_timelines" ALTER COLUMN "status" TYPE "ShipmentStatus_new" USING ("status"::text::"ShipmentStatus_new");
ALTER TYPE "ShipmentStatus" RENAME TO "ShipmentStatus_old";
ALTER TYPE "ShipmentStatus_new" RENAME TO "ShipmentStatus";
DROP TYPE "public"."ShipmentStatus_old";
ALTER TABLE "shipments" ALTER COLUMN "current_status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipmentType" ADD VALUE 'CONSOLIDATED';
ALTER TYPE "ShipmentType" ADD VALUE 'FULL_CONTAINER';

-- DropForeignKey
ALTER TABLE "CorporatePartnerProfile" DROP CONSTRAINT "CorporatePartnerProfile_userId_fkey";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "commissionPerPackage" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "shipmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "description" TEXT,
ADD COLUMN     "source" "RewardSource" NOT NULL DEFAULT 'SHIPMENT',
ALTER COLUMN "shipmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "containerId" TEXT,
ADD COLUMN     "corporateInvoiceId" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupContactName" TEXT,
ADD COLUMN     "pickupContactPhone" TEXT,
ADD COLUMN     "scheduledPickupDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "CorporatePartnerProfile";

-- CreateTable
CREATE TABLE "hub_commissions" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "type" "ContainerType" NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'LOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_partner_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradingName" TEXT,
    "regNo" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "yearsInOperation" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPosition" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "website" TEXT,
    "businessNature" TEXT[],
    "countriesOperateFrom" TEXT NOT NULL,
    "countriesShipTo" TEXT NOT NULL,
    "cargoTypes" TEXT[],
    "estimatedMonthlyVolume" TEXT NOT NULL,
    "servicesRequired" TEXT NOT NULL,
    "rateCardUrl" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_partner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_partner_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradingName" TEXT,
    "regNo" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "yearsInOperation" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPosition" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "website" TEXT,
    "businessNature" TEXT[],
    "countriesOperateFrom" TEXT NOT NULL,
    "countriesShipTo" TEXT NOT NULL,
    "cargoTypes" TEXT[],
    "estimatedMonthlyVolume" TEXT NOT NULL,
    "servicesRequired" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'Pending',
    "rejectionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardPoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hub_commissions_shipmentId_key" ON "hub_commissions"("shipmentId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "containers_containerNumber_key" ON "containers"("containerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_partner_profiles_userId_key" ON "corporate_partner_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_partner_applications_userId_key" ON "corporate_partner_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralCode_key" ON "referrals"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "shipments_senderId_idx" ON "shipments"("senderId");

-- CreateIndex
CREATE INDEX "shipments_current_status_idx" ON "shipments"("current_status");

-- CreateIndex
CREATE INDEX "shipments_createdAt_idx" ON "shipments"("createdAt");

-- AddForeignKey
ALTER TABLE "hub_commissions" ADD CONSTRAINT "hub_commissions_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_commissions" ADD CONSTRAINT "hub_commissions_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "containers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_corporateInvoiceId_fkey" FOREIGN KEY ("corporateInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_partner_profiles" ADD CONSTRAINT "corporate_partner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_partner_applications" ADD CONSTRAINT "corporate_partner_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
