ALTER TABLE "AttributeDefinition" ADD COLUMN "dependsOnId" TEXT;
CREATE INDEX "AttributeDefinition_dependsOnId_idx" ON "AttributeDefinition"("dependsOnId");
ALTER TABLE "AttributeDefinition" ADD CONSTRAINT "AttributeDefinition_dependsOnId_fkey"
FOREIGN KEY ("dependsOnId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
