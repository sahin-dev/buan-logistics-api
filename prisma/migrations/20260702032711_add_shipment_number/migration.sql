/*
  Warnings:

  - A unique constraint covering the columns `[shipment_number]` on the table `shipments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "shipment_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "shipments"("shipment_number");
