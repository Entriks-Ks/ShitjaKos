export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export {
  messagesGet as GET,
  messagesPost as POST,
} from "@/app/api/v1/_handlers/messaging";
