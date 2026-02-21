-- Fix dateCommande for legacy-imported rows
-- The CSV stored French dates like "22 novembre 2023 (6:47)" which
-- HTML date inputs can't display. Overwrite any non-ISO value with
-- the reportedAt date (date_signalement) formatted as YYYY-MM-DD.
UPDATE "Return"
SET "dateCommande" = to_char("reportedAt", 'YYYY-MM-DD')
WHERE "dateCommande" IS NULL
   OR "dateCommande" = 'NULL'
   OR TRIM("dateCommande") = ''
   OR "dateCommande" !~ '^\d{4}-\d{2}-\d{2}$';
