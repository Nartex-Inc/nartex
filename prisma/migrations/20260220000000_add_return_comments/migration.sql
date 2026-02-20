-- CreateTable
CREATE TABLE "return_comments" (
    "id" TEXT NOT NULL,
    "return_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_image" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_comments_return_id_idx" ON "return_comments"("return_id");

-- AddForeignKey
ALTER TABLE "return_comments" ADD CONSTRAINT "return_comments_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;
