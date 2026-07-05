ALTER TABLE "users" ADD COLUMN "referralCode" TEXT;

UPDATE "users"
SET "referralCode" = 'REF' || UPPER(SUBSTRING(REPLACE("id", '-', ''), 1, 8))
WHERE "referralCode" IS NULL;

CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

DROP INDEX IF EXISTS "referrals_referralCode_key";
CREATE INDEX IF NOT EXISTS "referrals_referralCode_idx" ON "referrals"("referralCode");
