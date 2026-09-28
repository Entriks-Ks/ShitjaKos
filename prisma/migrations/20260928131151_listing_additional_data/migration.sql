-- CreateTable
CREATE TABLE "ListingAdditionalData" (
    "listingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ListingAdditionalData_pkey" PRIMARY KEY ("listingId","position")
);

-- AddForeignKey
ALTER TABLE "ListingAdditionalData" ADD CONSTRAINT "ListingAdditionalData_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
