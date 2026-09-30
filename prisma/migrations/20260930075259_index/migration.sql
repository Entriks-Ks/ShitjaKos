-- CreateIndex
CREATE INDEX "ConversationReadState_userId_deletedAt_idx" ON "ConversationReadState"("userId", "deletedAt");
