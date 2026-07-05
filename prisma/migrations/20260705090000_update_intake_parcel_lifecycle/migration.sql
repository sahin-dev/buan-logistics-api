ALTER TYPE "IntakeParcelStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PICKUP';
ALTER TYPE "IntakeParcelStatus" ADD VALUE IF NOT EXISTS 'HANDED_OVER';

ALTER TABLE "intake_parcels"
ADD COLUMN "intake_number" TEXT,
ADD COLUMN "handedOverAt" TIMESTAMP(3);

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS row_num
  FROM "intake_parcels"
)
UPDATE "intake_parcels"
SET "intake_number" = 'TRK' || LPAD(numbered.row_num::TEXT, 4, '0')
FROM numbered
WHERE "intake_parcels"."id" = numbered."id";

UPDATE "intake_parcels"
SET "status" = 'AWAITING_PICKUP'
WHERE "status" = 'INTAKED';

ALTER TABLE "intake_parcels"
ALTER COLUMN "intake_number" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AWAITING_PICKUP';

CREATE UNIQUE INDEX "intake_parcels_intake_number_key" ON "intake_parcels"("intake_number");
CREATE INDEX "intake_parcels_intake_number_idx" ON "intake_parcels"("intake_number");
