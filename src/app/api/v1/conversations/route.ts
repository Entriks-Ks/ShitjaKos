export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export {
  conversationsGet as GET,
  conversationsPost as POST,
} from "@/app/api/v1/_handlers/messaging";
