-- Rename Sinto's Prextra schema from "public" to "sinto"
UPDATE "tenants" SET "prextra_schema" = 'sinto' WHERE "slug" = 'sinto';
