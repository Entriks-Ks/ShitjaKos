import "server-only";
import { z } from "zod";
import { apiActor } from "@/app/api/v1/_shared/access";
import {
  createBusinessWithImages,
  updateBusiness,
  deleteBusiness,
} from "@/services/businesses";
import {
  getBusinessStaff,
  getMyStaffInvitations,
  changeBusinessStaff,
} from "@/services/business-staff";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { ApiError, boundedBytes, readJson } from "@/app/api/v1/_shared/input";
import { changed } from "@/app/api/v1/_shared/cache";
import * as reads from "@/app/api/v1/_shared/reads";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

const BUSINESS_CREATE_BODY_LIMIT = 18 * 1024 * 1024;

async function readBusinessCreateRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.split(";")[0].trim() === "application/json") {
    return {
      values: await readJson(request),
      logo: null,
      background: null,
    };
  }

  if (!contentType.startsWith("multipart/form-data;")) {
    throw new ApiError(415, "Use application/json or multipart/form-data.");
  }

  const bytes = await boundedBytes(request, BUSINESS_CREATE_BODY_LIMIT);
  let form: FormData;

  try {
    form = await new Response(bytes, {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw new ApiError(400, "Invalid multipart body.");
  }

  return {
    values: Object.fromEntries(form),
    logo: form.get("logo"),
    background: form.get("background"),
  };
}

export const shopsGet = endpoint(async (r) => reads.readShops(query(r)));
export const shopGet = endpoint(async (r, c) =>
  reads.readShop((await paramsOf(c)).slug, query(r)),
);
export const businessesGet = endpoint(async (r) =>
  reads.readBusinesses(await apiActor(r), query(r)),
);
export const businessGet = endpoint(async (r, c) =>
  reads.readBusiness(await apiActor(r), (await paramsOf(c)).id),
);
export const businessPost = endpoint(async (r) => {
  const actor = await apiActor(r);
  const input = await readBusinessCreateRequest(r);
  const result = await createBusinessWithImages(actor, input.values, {
    logo: input.logo,
    background: input.background,
  });
  changed();
  return json(result, 201);
});
export const businessPatch = endpoint(async (r, c) => {
  await updateBusiness(await apiActor(r), (await paramsOf(c)).id, await readJson(r));
  changed();
});
export const businessDelete = endpoint(async (r, c) => {
  await deleteBusiness(await apiActor(r), (await paramsOf(c)).id);
  changed();
});
export const staffGet = endpoint(async (r, c) =>
  getBusinessStaff(await apiActor(r), (await paramsOf(c)).id),
);
export const invitationsGet = endpoint(async (r) => ({
  items: await getMyStaffInvitations(await apiActor(r)),
}));
export const staffInvitePost = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  const { email } = await readJson(r);
  const result = await changeBusinessStaff(actor, {
    kind: "invite",
    businessId: id,
    email,
  });
  changed();
  return json(result, 201);
});
export const staffRemoveDelete = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id, userId } = await paramsOf(c);
  const result = await changeBusinessStaff(actor, {
    kind: "remove",
    businessId: id,
    userId,
  });
  changed();
  return result;
});
export const invitationDelete = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id, invitationId } = await paramsOf(c);
  const result = await changeBusinessStaff(actor, {
    kind: "cancel",
    businessId: id,
    invitationId,
  });
  changed();
  return result;
});
export const invitationRespondPost = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id, invitationId } = await paramsOf(c);
  const { decision } = z
    .object({ decision: z.enum(["accept", "decline"]) })
    .parse(await readJson(r));
  const result = await changeBusinessStaff(actor, {
    kind: decision,
    businessId: id,
    invitationId,
  });
  changed();
  return result;
});
