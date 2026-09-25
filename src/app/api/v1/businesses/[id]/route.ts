export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export {
  businessGet as GET,
  businessPatch as PATCH,
  businessDelete as DELETE,
} from "@/app/api/v1/_handlers/businesses";
