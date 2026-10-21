import { z } from "zod";
import { countries, cities } from "@/lib/catalog";
import {
  attributeFilterEntries,
  attributeFilterKey,
  MAX_ATTRIBUTE_FILTERS,
  parseAttributeFilters,
} from "@/lib/attribute-search";

export const searchFilterKeys = [
  "q",
  "category",
  "city",
  "country",
  "min",
  "max",
  "seller",
  "condition",
  "attribute",
  "value",
  "intent",
] as const;
const amount = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((v) => Number(v) <= 20_000_000);
export const savedSearchFilters = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    category: z.string().min(1).max(100).optional(),
    city: z
      .string()
      .refine((v) => cities.some((city) => city === v), "Choose a valid city.")
      .optional(),
    country: z
      .string()
      .refine(
        (v) => countries.some((country) => country.id === v),
        "Choose a valid country.",
      )
      .optional(),
    min: amount.optional(),
    max: amount.optional(),
    seller: z.enum(["private", "business", "verified"]).optional(),
    condition: z.enum(["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"]).optional(),
    intent: z.enum(["FOR_SALE", "WANTED"]).optional(),
    attribute: z.string().min(1).max(100).optional(),
    value: z.string().min(1).max(200).optional(),
  })
  .catchall(z.string().max(10400))
  .superRefine((v, ctx) => {
    const dynamic = attributeFilterEntries(v);
    const parsed = parseAttributeFilters(v);
    if (
      dynamic.length &&
      (!v.category || !parsed.length || parsed.length > MAX_ATTRIBUTE_FILTERS)
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose a subcategory and valid field filters.",
      });
    for (const key of Object.keys(v)) {
      if (
        !searchFilterKeys.includes(key as (typeof searchFilterKeys)[number]) &&
        !attributeFilterKey(key)
      )
        ctx.addIssue({ code: "custom", message: `Unknown search filter: ${key}.` });
    }
    for (const filter of parsed) {
      if (
        ((filter.choice !== undefined || filter.choices !== undefined) &&
          (filter.from !== undefined || filter.to !== undefined)) ||
        (filter.from !== undefined && filter.to !== undefined && filter.from > filter.to)
      )
        ctx.addIssue({
          code: "custom",
          message: "Check the field filter range and value.",
        });
    }
    if (v.min && v.max && Number(v.min) > Number(v.max))
      ctx.addIssue({ code: "custom", message: "Minimum price exceeds maximum price." });
    if (!!v.attribute !== !!v.value || (v.attribute && !v.category))
      ctx.addIssue({
        code: "custom",
        message: "Choose a category, field and value together.",
      });
  })
  .transform((v) => {
    const normalized = { ...v };
    if (normalized.min) normalized.min = String(Number(normalized.min));
    if (normalized.max) normalized.max = String(Number(normalized.max));
    if (normalized.city) delete normalized.country;
    if (normalized.seller === "verified") normalized.seller = "business";
    return normalized;
  });
export type SavedSearchFilters = z.infer<typeof savedSearchFilters>;
export const savedSearchFrequency = z.enum(["OFF", "INSTANT", "DAILY", "WEEKLY"]);
export const createSavedSearchInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    frequency: savedSearchFrequency,
    filters: savedSearchFilters,
  })
  .strict();
export const updateSavedSearchInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    frequency: savedSearchFrequency,
  })
  .strict();
export const savedSearchId = z.string().min(1).max(100);

export function filtersFromSearchParams(params: Record<string, string | undefined>) {
  return Object.fromEntries([
    ...searchFilterKeys.filter((key) => params[key]).map((key) => [key, params[key]!]),
    ...attributeFilterEntries(params),
  ]);
}
export function nextSavedSearchRun(
  frequency: z.infer<typeof savedSearchFrequency>,
  now: Date,
) {
  return frequency === "OFF"
    ? null
    : new Date(
        now.getTime() +
          (frequency === "INSTANT"
            ? 15_000
            : (frequency === "DAILY" ? 1 : 7) * 86_400_000),
      );
}
