-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'REPLIED');

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "shipmentType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pickupServices" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "whatWeArePickingUp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shippingType" TEXT NOT NULL,
    "weightOrVolume" TEXT NOT NULL,
    "uploadImage" TEXT,
    "receiverCountry" TEXT NOT NULL,
    "receiverFullName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "receiverEmail" TEXT NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "replyMessage" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
