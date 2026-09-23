import { z } from "zod";

export const chatId = z.string().trim().min(1).max(100);
export const sendMessageInput = z.object({
  conversationId: chatId,
  clientId: z.uuid(),
  body: z.string().trim().min(1).max(4000),
});
export const startMessageInput = sendMessageInput.omit({ conversationId: true }).extend({
  listingId: chatId,
});
export const readMessageInput = z.object({
  conversationId: chatId,
  sequence: z.number().int().positive(),
});
export const blockMessageInput = z.object({
  conversationId: chatId,
  blocked: z.boolean(),
});
export const reportMessageInput = z.object({
  conversationId: chatId,
  messageId: chatId,
  reason: z.string().trim().min(5).max(1000),
});
export const messagePageInput = z
  .object({
    conversationId: chatId,
    before: z.coerce.number().int().positive().optional(),
    after: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((value) => value.before === undefined || value.after === undefined, {
    message: "Use before or after, not both.",
  });
