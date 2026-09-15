import { z } from "zod";

const name = z.string().trim().min(2, "Enter a name of at least two characters.").max(80);
const names = z.object({ sq: name, en: name, de: name });

export const categoryInput = z.object({
  parentId: z.string().trim().max(100).default(""),
  names,
  icon: z.enum([
    "Armchair",
    "Baby",
    "BookOpen",
    "Dumbbell",
    "Laptop",
    "Wrench",
    "Package",
  ]),
});

export const fieldInput = z
  .object({
    categoryId: z.string().trim().min(1),
    names,
    type: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN"]),
    required: z.boolean(),
    filterable: z.boolean(),
    unit: z.string().trim().max(20).default(""),
    min: z.number().finite().nullable(),
    max: z.number().finite().nullable(),
    options: z.array(names).max(20),
  })
  .superRefine((value, context) => {
    if (value.type === "SELECT" && value.options.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Add at least two choices for a selection field.",
      });
    }
    if (value.type !== "SELECT" && value.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Only selection fields can have choices.",
      });
    }
    if (
      value.type !== "NUMBER" &&
      (value.unit || value.min !== null || value.max !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["type"],
        message: "Units and limits are only available for number fields.",
      });
    }
    if (value.min !== null && value.max !== null && value.min > value.max) {
      context.addIssue({
        code: "custom",
        path: ["max"],
        message: "The maximum must be at least the minimum.",
      });
    }
    if (value.filterable && value.type !== "SELECT") {
      context.addIssue({
        code: "custom",
        path: ["filterable"],
        message: "Search filtering currently supports selection fields only.",
      });
    }
  });
