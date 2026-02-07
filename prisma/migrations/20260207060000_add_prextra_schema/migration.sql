-- AlterTable: add prextra_schema to tenants
ALTER TABLE "tenants" ADD COLUMN "prextra_schema" TEXT;

-- Seed known schemas
UPDATE "tenants" SET "prextra_schema" = 'public' WHERE "slug" = 'sinto';
UPDATE "tenants" SET "prextra_schema" = 'prolab' WHERE "slug" = 'prolab';
