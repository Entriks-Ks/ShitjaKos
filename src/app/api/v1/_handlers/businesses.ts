import "server-only";
import { z } from "zod";
import { apiActor } from "@/app/api/v1/_shared/access";
import { createBusiness, updateBusiness, deleteBusiness } from "@/services/businesses";
import {
  getBusinessStaff,
  getMyStaffInvitations,
  changeBusinessStaff,
} from "@/services/business-staff";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { readJson } from "@/app/api/v1/_shared/input";
import { changed } from "@/app/api/v1/_shared/cache";
import * as reads from "@/app/api/v1/_shared/reads";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

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
  const id = await createBusiness(await apiActor(r), await readJson(r));
  changed();
  return json({ id }, 201);
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
