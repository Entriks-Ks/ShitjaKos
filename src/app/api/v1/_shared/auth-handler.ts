import { endpoint, paramsOf, json } from "./http";
import { checkOrigin, readJson } from "./input";
import { runMobileAuth } from "@/app/api/v1/_shared/auth";

export const authPost = endpoint(async (request, context) => {
  checkOrigin(request);
  const { action } = await paramsOf(context);
  const headers = new Headers(request.headers);
  if (headers.has("authorization")) headers.delete("cookie");
  const result = await runMobileAuth(action, await readJson(request), headers);
  return json(result, result?.ok === false ? 400 : 200);
});
