ALTER TABLE "users" ADD COLUMN "branchId" TEXT;

ALTER TABLE "shipments"
ADD COLUMN "originHubId" TEXT,
ADD COLUMN "deliveryHubId" TEXT;

CREATE INDEX "users_branchId_idx" ON "users"("branchId");
CREATE INDEX "shipments_originHubId_idx" ON "shipments"("originHubId");
CREATE INDEX "shipments_branchId_idx" ON "shipments"("branchId");
CREATE INDEX "shipments_deliveryHubId_idx" ON "shipments"("deliveryHubId");

ALTER TABLE "users"
ADD CONSTRAINT "users_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_originHubId_fkey"
FOREIGN KEY ("originHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_deliveryHubId_fkey"
FOREIGN KEY ("deliveryHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
