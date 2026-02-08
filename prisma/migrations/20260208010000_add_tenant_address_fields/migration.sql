-- Add address fields to tenants table
ALTER TABLE "tenants" ADD COLUMN "address" TEXT;
ALTER TABLE "tenants" ADD COLUMN "city" TEXT;
ALTER TABLE "tenants" ADD COLUMN "province" TEXT;
ALTER TABLE "tenants" ADD COLUMN "postal_code" TEXT;
ALTER TABLE "tenants" ADD COLUMN "phone" TEXT;

-- Set Prolab logo to local asset
UPDATE "tenants" SET "logo" = '/prolab-logo.png' WHERE "slug" = 'prolab';

-- Populate address data for existing tenants
UPDATE "tenants" SET
  "address" = '3750, 14e Avenue',
  "city" = 'Saint-Georges',
  "province" = 'QC',
  "postal_code" = 'G5Y 8E3',
  "phone" = '(418) 227-6442 | 1-800-463-0025'
WHERE "slug" = 'sinto';

UPDATE "tenants" SET
  "address" = '4531 Rue Industrielle',
  "city" = 'Thetford Mines',
  "province" = 'QC',
  "postal_code" = 'G6H 1Y6',
  "phone" = '(418) 423-3777 | 1-800-795-2777'
WHERE "slug" = 'prolab';
