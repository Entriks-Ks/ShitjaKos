ALTER TABLE "ListingAttributeValue" ADD COLUMN "numberValue" DOUBLE PRECISION;

UPDATE "ListingAttributeValue" AS answer
SET "numberValue" = answer."value"::text::double precision
FROM "AttributeDefinition" AS field
WHERE answer."attributeId" = field.id
  AND field.type = 'NUMBER'::"AttributeType"
  AND jsonb_typeof(answer."value") = 'number';

CREATE INDEX "ListingAttributeValue_attributeId_numberValue_idx"
ON "ListingAttributeValue"("attributeId", "numberValue");
