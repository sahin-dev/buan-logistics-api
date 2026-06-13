/*
  Warnings:

  - You are about to drop the column `operating_mode` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `operating_model` on the `business_profiles` table. All the data in the column will be lost.
  - Added the required column `operation_mode` to the `business_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operation_model` to the `business_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OperationMode" AS ENUM ('Offline', 'Online', 'Both');

-- AlterTable
ALTER TABLE "business_profiles" DROP COLUMN "operating_mode",
DROP COLUMN "operating_model",
ADD COLUMN     "operation_mode" "OperationMode" NOT NULL,
ADD COLUMN     "operation_model" TEXT NOT NULL;

-- DropEnum
DROP TYPE "OperatingMode";
