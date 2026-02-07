-- Add multi-tenancy columns to tenants table
ALTER TABLE "tenants" ADD COLUMN "slug" TEXT;
ALTER TABLE "tenants" ADD COLUMN "plan" TEXT;
ALTER TABLE "tenants" ADD COLUMN "logo" TEXT;
ALTER TABLE "tenants" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill slug for any existing tenant rows (generate from name)
UPDATE "tenants" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL;

-- Make slug NOT NULL and unique
ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- Add tenant_id to Return table (nullable first for backfill)
ALTER TABLE "Return" ADD COLUMN "tenant_id" TEXT;

-- Ensure a default SINTO tenant exists for backfill
INSERT INTO "tenants" ("id", "name", "slug", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'SINTO', 'sinto', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "tenants" WHERE "slug" = 'sinto');

-- Backfill all existing returns to SINTO tenant
UPDATE "Return" SET "tenant_id" = (
  SELECT "id" FROM "tenants" WHERE "slug" = 'sinto' LIMIT 1
) WHERE "tenant_id" IS NULL;

-- Now make tenant_id NOT NULL and add FK
ALTER TABLE "Return" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Return" ADD CONSTRAINT "Return_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for tenant-scoped queries
CREATE INDEX "Return_tenant_id_idx" ON "Return"("tenant_id");
CREATE INDEX "Return_tenant_id_reportedAt_idx" ON "Return"("tenant_id", "reportedAt");
