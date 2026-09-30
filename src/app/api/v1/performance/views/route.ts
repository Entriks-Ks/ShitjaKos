import { apiActor } from "@/app/api/v1/_shared/access";
import { endpoint } from "@/app/api/v1/_shared/http";
import { readJson } from "@/app/api/v1/_shared/input";
import { recordBusinessView } from "@/services/business-performance";
export const POST = endpoint(async (request) => {
  await recordBusinessView(await apiActor(request), await readJson(request));
  return { ok: true };
});
