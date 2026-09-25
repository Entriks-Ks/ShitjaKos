export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export {
  listingGet as GET,
  listingPut as PUT,
  listingDelete as DELETE,
} from "@/app/api/v1/_handlers/listings";
