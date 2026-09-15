-- Listing ownership is exclusive: a person OR a business, never both or neither.
ALTER TABLE "Listing" ADD CONSTRAINT "listing_exactly_one_owner"
CHECK (("personalProfileId" IS NOT NULL)::int + ("businessId" IS NOT NULL)::int = 1);
ALTER TABLE "Listing" ADD CONSTRAINT "listing_nonnegative_price"
CHECK ("priceCents" IS NULL OR "priceCents" >= 0);
ALTER TABLE "ListingMedia" ADD CONSTRAINT "media_position_range"
CHECK ("position" >= 0 AND "position" < 12);
ALTER TABLE "User" ADD CONSTRAINT "user_role_valid" CHECK ("role" IN ('USER', 'ADMIN'));
ALTER TABLE "Category" ADD CONSTRAINT "category_not_own_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id");

-- Validate configured attribute type, category ownership, range and option membership
-- at the persistence boundary as well as in the application service.
CREATE FUNCTION validate_listing_attribute() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE definition "AttributeDefinition"%ROWTYPE; listing_category text; kind text;
BEGIN
  SELECT * INTO STRICT definition FROM "AttributeDefinition" WHERE "id" = NEW."attributeId";
  SELECT "categoryId" INTO STRICT listing_category FROM "Listing" WHERE "id" = NEW."listingId";
  IF definition."categoryId" <> listing_category THEN RAISE EXCEPTION 'Attribute belongs to a different category'; END IF;
  kind := jsonb_typeof(NEW."value");
  IF (definition."type" IN ('TEXT', 'SELECT') AND kind <> 'string')
    OR (definition."type" = 'NUMBER' AND kind <> 'number')
    OR (definition."type" = 'BOOLEAN' AND kind <> 'boolean') THEN
    RAISE EXCEPTION 'Attribute value does not match its type';
  END IF;
  IF definition."type" = 'NUMBER' THEN
    IF (definition."min" IS NOT NULL AND (NEW."value" #>> '{}')::numeric < definition."min")
      OR (definition."max" IS NOT NULL AND (NEW."value" #>> '{}')::numeric > definition."max") THEN
      RAISE EXCEPTION 'Attribute outside allowed range';
    END IF;
  END IF;
  IF definition."type" = 'SELECT' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(definition."options") option WHERE option->>'value' = NEW."value" #>> '{}'
  ) THEN RAISE EXCEPTION 'Invalid attribute option'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "validate_attribute" BEFORE INSERT OR UPDATE ON "ListingAttributeValue"
FOR EACH ROW EXECUTE FUNCTION validate_listing_attribute();
