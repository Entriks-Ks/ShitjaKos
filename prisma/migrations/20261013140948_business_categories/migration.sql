-- DropIndex
DROP INDEX "Category_slug_trgm_idx";

-- DropIndex
DROP INDEX "CategoryTranslation_name_trgm_idx";

-- DropIndex
DROP INDEX "Listing_description_trgm_idx";

-- DropIndex
DROP INDEX "Listing_title_trgm_idx";

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("businessId","categoryId")
);

-- CreateIndex
CREATE INDEX "BusinessCategory_categoryId_idx" ON "BusinessCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_businessId_position_key" ON "BusinessCategory"("businessId", "position");

-- AddForeignKey
ALTER TABLE "BusinessCategory" ADD CONSTRAINT "BusinessCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCategory" ADD CONSTRAINT "BusinessCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
