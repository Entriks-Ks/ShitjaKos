-- AlterTable
ALTER TABLE "ConversationReadState" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedThroughSequence" INTEGER NOT NULL DEFAULT 0;
