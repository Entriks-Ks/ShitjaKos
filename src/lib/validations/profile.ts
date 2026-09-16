import { z } from "zod";
import { cities } from "../catalog";

export const profileInput = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(100),
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a seller name (at least 2 characters).")
    .max(100),
  city: z.enum(cities),
  bio: z.string().trim().max(500, "Keep your bio within 500 characters."),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) =>
        !value ||
        (/^\+?[\d\s()-]+$/.test(value) &&
          value.replace(/\D/g, "").length >= 7 &&
          value.replace(/\D/g, "").length <= 15),
      "Enter a valid phone number, or leave it empty.",
    ),
});
export type ProfileInput = z.infer<typeof profileInput>;
