-- AlterTable
ALTER TABLE "support_ticket_attachments" ADD COLUMN "comment_id" TEXT;

-- CreateIndex
CREATE INDEX "support_ticket_attachments_comment_id_idx" ON "support_ticket_attachments"("comment_id");

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "support_ticket_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
