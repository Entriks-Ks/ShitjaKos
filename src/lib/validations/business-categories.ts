import { z } from "zod";
export const businessCategoryIds = z
  .array(z.string().trim().min(1).max(100))
  .min(1, "Choose a primary category.")
  .max(4, "Choose at most four categories.")
  .refine((ids) => new Set(ids).size === ids.length, "Choose each category only once.");
export const shopFilters = z.object({
  category: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
});
