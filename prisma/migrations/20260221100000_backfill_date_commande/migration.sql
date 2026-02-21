-- Backfill dateCommande from reportedAt for legacy-imported rows
-- Handles actual NULL, literal 'NULL' string, and empty strings
UPDATE "Return"
SET "dateCommande" = to_char("reportedAt", 'YYYY-MM-DD')
WHERE "dateCommande" IS NULL
   OR "dateCommande" = 'NULL'
   OR TRIM("dateCommande") = '';
