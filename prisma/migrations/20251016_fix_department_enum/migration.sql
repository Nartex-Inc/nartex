-- 1) Make sure the enum value uses the underscore (rename if the old label exists)
DO $$
BEGIN
  -- If the 'Department' type doesn't exist yet, skip this block safely.
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'Department'
  ) THEN
    -- If the old label exists, rename it to the new label
    IF EXISTS (SELECT 1 FROM pg_enum e
               JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'Department' AND enumlabel = 'ADMIN-FINANCE') THEN
      ALTER TYPE "Department" RENAME VALUE 'ADMIN-FINANCE' TO 'ADMIN_FINANCE';
    END IF;
  END IF;
END $$;

-- 2) Ensure the column exists (prod safety). If missing, add it with default.
ALTER TABLE "sharepoint_nodes"
  ADD COLUMN IF NOT EXISTS "department" "Department";

-- 3) Backfill NULLs to ADMIN_FINANCE so reads/filters work.
UPDATE "sharepoint_nodes"
SET    "department" = 'ADMIN_FINANCE'
WHERE  "department" IS NULL;

-- 4) Enforce NOT NULL going forward.
ALTER TABLE "sharepoint_nodes"
  ALTER COLUMN "department" SET NOT NULL;

-- 5) Helpful index for your GET filter (tenantId + department + parentId)
CREATE INDEX IF NOT EXISTS "sharepoint_nodes_tenant_dept_parent_idx"
  ON "sharepoint_nodes" ("tenantId", "department", "parentId");
