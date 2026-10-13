CREATE INDEX IF NOT EXISTS "Listing_title_trgm_idx"
ON "Listing" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Listing_description_trgm_idx"
ON "Listing" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Category_slug_trgm_idx"
ON "Category" USING GIN ("slug" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CategoryTranslation_name_trgm_idx"
ON "CategoryTranslation" USING GIN ("name" gin_trgm_ops);
