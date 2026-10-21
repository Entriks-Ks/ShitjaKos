ALTER TABLE "AttributeDefinition" ADD COLUMN "filterDisplay" TEXT NOT NULL DEFAULT 'DROPDOWN';
ALTER TABLE "AttributeDefinition" ADD CONSTRAINT "AttributeDefinition_filterDisplay_check" CHECK ("filterDisplay" IN ('DROPDOWN', 'RADIO', 'CHECKBOX'));
