-- AlterTable: Make cause nullable (remove default)
ALTER TABLE "Return" ALTER COLUMN "cause" DROP NOT NULL;
ALTER TABLE "Return" ALTER COLUMN "cause" DROP DEFAULT;

-- AlterTable: Add updated_at to return_comments
ALTER TABLE "return_comments" ADD COLUMN "updated_at" TIMESTAMP(3);
