CREATE INDEX IF NOT EXISTS "Listing_title_trgm_idx"
ON "Listing" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Listing_description_trgm_idx"
ON "Listing" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Category_slug_trgm_idx"
ON "Category" USING GIN ("slug" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CategoryTranslation_name_trgm_idx"
ON "CategoryTranslation" USING GIN ("name" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "SearchEvent" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "resultCount" INTEGER NOT NULL,
  "hasFilters" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "SearchEvent_query_createdAt_idx" ON "SearchEvent"("query", "createdAt");
