import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const VISITOR_COOKIE = "sk_performance_visitor";
export function utcDay(now = new Date()) {
  return new Date(now.toISOString().slice(0, 10));
}
export function visitorSignature(value: string, secret: string) {
  return createHmac("sha256", secret).update(`performance-guest:${value}`).digest("hex");
}
export function createVisitorToken(secret: string, now = new Date()) {
  const value = `${utcDay(now).toISOString().slice(0, 10)}.${randomUUID()}`;
  return `${value}.${visitorSignature(value, secret)}`;
}
export function validVisitorToken(
  token: string | undefined,
  secret: string,
  now = new Date(),
) {
  if (!token || !/^\d{4}-\d{2}-\d{2}\.[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token))
    return false;
  const [day, id, signature] = token.split(".");
  if (day !== utcDay(now).toISOString().slice(0, 10)) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(visitorSignature(`${day}.${id}`, secret), "hex"),
  );
}
export function performanceHash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
