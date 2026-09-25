import { z } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export const apiId = z.string().trim().min(1).max(100);
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3001").origin;
  if (origin && origin !== allowed) throw new ApiError(403, "Origin not allowed.");
  if (!origin && request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "Origin not allowed.");
  }
}
export async function boundedBytes(request: Request, maximum = 64 * 1024) {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new ApiError(413, "Request too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > maximum) {
        await reader.cancel();
        throw new ApiError(413, "Request too large.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new ApiError(415, "Use application/json.");
  }
  const bytes = await boundedBytes(request);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Expected an object.");
  return value as Record<string, unknown>;
}
