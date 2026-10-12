import { z } from "zod";
export const contentReportInput = z.object({
  targetKind: z.enum(["LISTING", "BUSINESS"]),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum(["SCAM", "PROHIBITED", "MISLEADING", "DUPLICATE", "OTHER"]),
  details: z.string().trim().max(1000).default(""),
}).refine(v => v.reason !== "OTHER" || v.details.length >= 10, {
  message: "Please explain the issue in at least 10 characters.", path: ["details"],
});
export const reviewContentReportInput = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
  note: z.string().trim().min(5).max(1000),
  expectedStatus: z.enum(["OPEN", "INVESTIGATING"]),
});
