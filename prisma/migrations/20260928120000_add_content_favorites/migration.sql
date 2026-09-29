-- CreateTable
CREATE TABLE "ContentFavorite" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentFavorite_visitorKey_idx" ON "ContentFavorite"("visitorKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContentFavorite_contentId_visitorKey_key" ON "ContentFavorite"("contentId", "visitorKey");

-- AddForeignKey
ALTER TABLE "ContentFavorite" ADD CONSTRAINT "ContentFavorite_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
