import { z } from "zod";
import { cities } from "../catalog";
export const listingInput = z
  .object({
    id: z.string().optional(),
    version: z.coerce.number().int().min(1).default(1),
    categoryId: z.string().min(1),
    owner: z.string().min(1),
    intent: z.enum(["FOR_SALE", "WANTED"]),
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(6000),
    price: z
      .string()
      .regex(/^\d{1,8}(\.\d{1,2})?$/, "Enter a valid price, up to two decimal places.")
      .refine((value) => Number(value) <= 20000000, "Price must not exceed €20,000,000."),
    city: z.enum(cities),
    condition: z.enum(["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"]),
    negotiable: z.boolean(),
    phoneVisible: z.boolean(),
    contactPhone: z.string().trim().max(30),
    attributes: z.record(z.string(), z.unknown()),
  })
  .refine((v) => !v.phoneVisible || /^\+?[\d\s()-]{7,25}$/.test(v.contactPhone), {
    message: "Add a valid contact phone or turn phone visibility off.",
    path: ["contactPhone"],
  });
export type ListingInput = z.infer<typeof listingInput>;
type Definition = {
  id: string;
  key: string;
  type: string;
  required: boolean;
  min: number | null;
  max: number | null;
  options: unknown;
};
export function validateAttributes(
  definitions: Definition[],
  input: Record<string, unknown>,
) {
  const allowed = new Set(definitions.map((d) => d.id));
  for (const key of Object.keys(input))
    if (!allowed.has(key))
      throw new Error("An attribute does not belong to this category.");
  const values: { attributeId: string; value: string | number | boolean }[] = [];
  for (const d of definitions) {
    const raw = input[d.id];
    if (raw === undefined || raw === "" || raw === null) {
      if (d.required) throw new Error(`${d.key} is required.`);
      continue;
    }
    let value: string | number | boolean;
    if (d.type === "NUMBER") {
      if (
        (typeof raw !== "number" && typeof raw !== "string") ||
        (typeof raw === "string" && !raw.trim())
      )
        throw new Error(`${d.key} must be a number.`);
      value = Number(raw);
      if (
        !Number.isFinite(value) ||
        (d.min !== null && value < d.min) ||
        (d.max !== null && value > d.max)
      )
        throw new Error(`${d.key} is outside the allowed range.`);
    } else if (d.type === "BOOLEAN") {
      if (typeof raw !== "boolean") throw new Error(`${d.key} must be yes or no.`);
      value = raw;
    } else {
      if (typeof raw !== "string" || raw.length > 200)
        throw new Error(`${d.key} is invalid.`);
      value = raw.trim();
      if (!value) throw new Error(`${d.key} cannot be blank.`);
      if (
        d.type === "SELECT" &&
        !(d.options as { value: string }[]).some((o) => o.value === value)
      )
        throw new Error(`${d.key} is not a valid option.`);
    }
    values.push({ attributeId: d.id, value });
  }
  return values;
}
