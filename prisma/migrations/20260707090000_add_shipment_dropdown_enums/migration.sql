-- CreateEnum
CREATE TYPE "ShipmentRoute" AS ENUM ('NIGERIA_TO_ABROAD');

-- CreateEnum
CREATE TYPE "ShipmentServiceOption" AS ENUM ('WAREHOUSE', 'DROP_OFF');

-- CreateEnum
CREATE TYPE "PickupType" AS ENUM ('DOORSTEP_DELIVERY', 'WAREHOUSE_PICKUP');

-- Replace the old ShipmentType enum with the merged shipment type values.
ALTER TYPE "ShipmentType" RENAME TO "ShipmentType_old";
CREATE TYPE "ShipmentType" AS ENUM (
  'AIR_CARGO',
  'SEA_CARGO',
  'EXPRESS_SHIPMENT',
  'STANDARD',
  'OVERNIGHT',
  'CONSOLIDATED',
  'FULL_CONTAINER'
);

-- Convert shipmentType from ShipmentMode to the merged ShipmentType.
-- If shipmentType is empty, preserve the old type column value where possible.
ALTER TABLE "shipments" ALTER COLUMN "shipmentType" TYPE "ShipmentType"
USING (
  CASE
    WHEN "shipmentType"::TEXT = 'AIR_CARGO' THEN 'AIR_CARGO'::"ShipmentType"
    WHEN "shipmentType"::TEXT = 'SEA_CARGO' THEN 'SEA_CARGO'::"ShipmentType"
    WHEN "type"::TEXT = 'EXPRESS' THEN 'EXPRESS_SHIPMENT'::"ShipmentType"
    WHEN "type"::TEXT = 'STANDARD' THEN 'STANDARD'::"ShipmentType"
    WHEN "type"::TEXT = 'OVERNIGHT' THEN 'OVERNIGHT'::"ShipmentType"
    WHEN "type"::TEXT = 'CONSOLIDATED' THEN 'CONSOLIDATED'::"ShipmentType"
    WHEN "type"::TEXT = 'FULL_CONTAINER' THEN 'FULL_CONTAINER'::"ShipmentType"
    ELSE NULL
  END
);

-- AlterTable
ALTER TABLE "shipments" ALTER COLUMN "pickupType" TYPE "PickupType"
USING (
  CASE
    WHEN "pickupType" = 'DOORSTEP_DELIVERY' THEN 'DOORSTEP_DELIVERY'::"PickupType"
    WHEN "pickupType" = 'Doorstep delivery' THEN 'DOORSTEP_DELIVERY'::"PickupType"
    WHEN "pickupType" = 'HOME_PICKUP' THEN 'DOORSTEP_DELIVERY'::"PickupType"
    WHEN "pickupType" = 'WAREHOUSE_PICKUP' THEN 'WAREHOUSE_PICKUP'::"PickupType"
    WHEN "pickupType" = 'Warehouse pickup' THEN 'WAREHOUSE_PICKUP'::"PickupType"
    ELSE NULL
  END
);

ALTER TABLE "shipments" DROP COLUMN "type";

DROP TYPE "ShipmentType_old";
DROP TYPE "ShipmentMode";

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "shipmentRoute" "ShipmentRoute" DEFAULT 'NIGERIA_TO_ABROAD';

-- AlterTable
ALTER TABLE "shipments" ALTER COLUMN "shipmentService" TYPE "ShipmentServiceOption"
USING (
  CASE
    WHEN "shipmentService" = 'WAREHOUSE' THEN 'WAREHOUSE'::"ShipmentServiceOption"
    WHEN "shipmentService" = 'DROP_OFF' THEN 'DROP_OFF'::"ShipmentServiceOption"
    ELSE NULL
  END
);
