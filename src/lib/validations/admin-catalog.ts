import { z } from "zod";
import { MAX_SELECT_CHOICES } from "@/lib/catalog-limits";

const name = z.string().trim().min(2, "Enter a name of at least two characters.").max(80);
const names = z.object({ sq: name, en: name, de: name });
const choiceName = z.string().trim().min(1).max(80);
const choiceNames = z.object({ sq: choiceName, en: choiceName, de: choiceName });

export const categoryInput = z.object({
  parentId: z.string().trim().max(100).default(""),
  names,
  icon: z.enum([
    "Ticket",
    "House",
    "Store",
    "CarFront",
    "Smartphone",
    "Baby",
    "PawPrint",
    "Tent",
    "Handbag",
    "Clapperboard",
    "Gift",
    "Package",
    "Wrench",
    "Armchair",
    "BriefcaseBusiness",
    "Car",
    "Laptop",
    "Dumbbell",
    "Shirt",
    "BookOpen",
  ]),
});

export const fieldDefinitionInput = z
  .object({
    names,
    type: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN"]),
    required: z.boolean(),
    filterable: z.boolean(),
    filterDisplay: z.enum(["DROPDOWN", "RADIO", "CHECKBOX"]).default("DROPDOWN"),
    unit: z.string().trim().max(20).default(""),
    min: z.number().finite().nullable(),
    max: z.number().finite().nullable(),
    options: z
      .array(choiceNames)
      .max(MAX_SELECT_CHOICES, `Add no more than ${MAX_SELECT_CHOICES} choices.`),
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

export const fieldInput = fieldDefinitionInput.and(
  z.object({ categoryId: z.string().trim().min(1) }),
);

export const fieldEditInput = z.object({
  dependsOnId: z.string().min(1).max(100).nullable().optional(),
  names,
  type: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN"]),
  required: z.boolean(),
  filterable: z.boolean(),
  filterDisplay: z.enum(["DROPDOWN", "RADIO", "CHECKBOX"]).optional(),
  unit: z.string().trim().max(20).default(""),
  min: z.number().finite().nullable(),
  max: z.number().finite().nullable(),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(200).nullable(),
        names: choiceNames,
        parentValues: z.array(z.string().min(1).max(200)).max(100).optional(),
      }),
    )
    .max(MAX_SELECT_CHOICES, `Add no more than ${MAX_SELECT_CHOICES} choices.`),
});

export const fieldBatchInput = z.object({
  categoryId: z.string().trim().min(1),
  fields: z
    .array(fieldDefinitionInput)
    .min(1, "Add at least one field.")
    .max(20, "Add no more than 20 fields at once."),
});
