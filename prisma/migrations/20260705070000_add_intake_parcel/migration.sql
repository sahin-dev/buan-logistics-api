CREATE TYPE "IntakeParcelStatus" AS ENUM ('INTAKED', 'ARRIVED_AT_BRANCH');

CREATE TABLE "intake_parcels" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "package_info" TEXT,
    "image_urls" TEXT[],
    "status" "IntakeParcelStatus" NOT NULL DEFAULT 'INTAKED',
    "arrivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_parcels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intake_parcels_hubId_idx" ON "intake_parcels"("hubId");
CREATE INDEX "intake_parcels_status_idx" ON "intake_parcels"("status");
CREATE INDEX "intake_parcels_createdAt_idx" ON "intake_parcels"("createdAt");

ALTER TABLE "intake_parcels"
ADD CONSTRAINT "intake_parcels_hubId_fkey"
FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
