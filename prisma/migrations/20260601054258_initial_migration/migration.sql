-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('STANDARD', 'EXPRESS', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('T1', 'T2', 'T3');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'CORPORATE_PARTNER', 'HUB_PROIVDER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('Pending', 'Accepted', 'Rejected');

-- CreateEnum
CREATE TYPE "OperatingMode" AS ENUM ('Offline', 'Online', 'Both');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "discount_percent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubprovider_applications" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landmark" TEXT NOT NULL,
    "cityOrState" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cctvAvailable" BOOLEAN NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "prefferedContactMethod" TEXT NOT NULL,
    "operatingDays" TEXT[],
    "email_active_window_from" TIMESTAMP(3) NOT NULL,
    "email_active_window_to" TIMESTAMP(3) NOT NULL,
    "daily_minimum_staff" INTEGER NOT NULL,
    "daily_maximum_staff" INTEGER NOT NULL,
    "daily_foot_traffic" TEXT NOT NULL,
    "handledDeliveryServiceBefore" BOOLEAN NOT NULL,
    "atLeastSixMonthCommitted" BOOLEAN NOT NULL,
    "comments" TEXT,
    "image_urls" TEXT[],
    "status" "ApplicationStatus" NOT NULL,
    "rejected_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejection_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubprovider_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "shipped_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "current_status" "ShipmentStatus" NOT NULL,
    "type" "ShipmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_timelines" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'T1',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "avatar" TEXT,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autorizedPersonFullName" TEXT NOT NULL,
    "authorizedPersonTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradingName" TEXT NOT NULL,
    "Reg_no" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operating_model" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "operating_mode" "OperatingMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporatePartnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CorporatePartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubProviderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "HubProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UpgradeApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_id_invoice_number_idx" ON "invoices"("id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_id_tracking_number_idx" ON "shipments"("id", "tracking_number");

-- CreateIndex
CREATE INDEX "shipment_timelines_id_shipmentId_idx" ON "shipment_timelines"("id", "shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_userId_key" ON "business_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePartnerProfile_userId_key" ON "CorporatePartnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HubProviderProfile_userId_key" ON "HubProviderProfile"("userId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_timelines" ADD CONSTRAINT "shipment_timelines_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporatePartnerProfile" ADD CONSTRAINT "CorporatePartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubProviderProfile" ADD CONSTRAINT "HubProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplication" ADD CONSTRAINT "UpgradeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
