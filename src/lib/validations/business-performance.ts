import { z } from "zod";

const date = z.iso.date();
export function performanceRange(raw: unknown, now = new Date()) {
  const input = z.object({ from: date.optional(), to: date.optional() }).parse(raw);
  const today = new Date(now.toISOString().slice(0, 10));
  const from = new Date(
    input.from ?? new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const to = new Date(input.to ?? today.toISOString().slice(0, 10));
  if (from > to || to > today || to.getTime() - from.getTime() >= 366 * 86400000) {
    throw new Error("Choose a past date range of at most 366 days.");
  }
  return { from, until: new Date(to.getTime() + 86400000), to };
}

export const performanceViewInput = z.object({
  kind: z.enum(["shop", "listing"]),
  id: z.string().trim().min(1).max(100),
});
