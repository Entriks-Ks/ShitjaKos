import "server-only";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { getMobileAuth } from "@/lib/mobile-auth";

// Extend the existing mobile configuration only for v1. The website and legacy
// auth configuration are not modified; both use the same session database.
function createV1Auth() {
  const options = getMobileAuth().options;
  // Keep the existing next-cookies integration last.
  return betterAuth({ ...options, plugins: [bearer(), ...(options.plugins ?? [])] });
}
let auth: ReturnType<typeof createV1Auth> | undefined;
export function getV1Auth() {
  return (auth ??= createV1Auth());
}
