-- Phase 2B: Content retention support. Additive: no table or column is dropped.

-- CreateTable: Blob deletion outbox, filled by the retention job after a Content row
-- is hard-deleted and drained after that transaction commits.
CREATE TABLE "BlobDeletionOutbox" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "claimedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlobDeletionOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlobDeletionOutbox_url_key" ON "BlobDeletionOutbox"("url");

-- CreateIndex
CREATE INDEX "BlobDeletionOutbox_claimedUntil_createdAt_idx" ON "BlobDeletionOutbox"("claimedUntil", "createdAt");

-- CreateIndex: age-ordered retention batches
CREATE INDEX "Content_createdAt_id_idx" ON "Content"("createdAt", "id");

-- CheckIn.sermonId becomes an optional foreign key to Content with cascade delete.
-- Empty strings and IDs with no matching Content become NULL first, so the constraint
-- can be added on any existing data. (Production had 0 CheckIn rows when written.)
ALTER TABLE "CheckIn" ALTER COLUMN "sermonId" DROP NOT NULL;

UPDATE "CheckIn"
SET "sermonId" = NULL
WHERE "sermonId" IS NOT NULL
  AND (
    "sermonId" = ''
    OR NOT EXISTS (SELECT 1 FROM "Content" AS c WHERE c."id" = "CheckIn"."sermonId")
  );

-- CreateIndex
CREATE INDEX "CheckIn_sermonId_idx" ON "CheckIn"("sermonId");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
