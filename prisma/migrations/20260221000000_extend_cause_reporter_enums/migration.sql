-- Extend the Cause enum with values added to schema.prisma but missing from DB
-- Uses IF NOT EXISTS so this is safe to run even if prisma db push already added them

ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'expert';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'expedition';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'analyse';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'defect';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'surplus_inventaire';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'prise_commande';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'rappel';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'redirection';
ALTER TYPE "public"."Cause" ADD VALUE IF NOT EXISTS 'fournisseur';

-- Extend the Reporter enum (migration only had 3 values; schema has 5)
ALTER TYPE "public"."Reporter" ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE "public"."Reporter" ADD VALUE IF NOT EXISTS 'prise_commande';

-- Backfill dateCommande from reportedAt for legacy-imported rows where it's NULL
UPDATE "Return"
SET "dateCommande" = to_char("reportedAt", 'YYYY-MM-DD')
WHERE "dateCommande" IS NULL;
