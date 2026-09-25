import "server-only";
import { apiActor } from "@/app/api/v1/_shared/access";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { readJson, pagination } from "@/app/api/v1/_shared/input";
import * as chat from "@/services/messaging";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

export const conversationsGet = endpoint(async (r) =>
  chat.getChatInbox(await apiActor(r), pagination.parse(query(r)).page),
);
export const conversationsPost = endpoint(async (r) =>
  json(await chat.startListingConversation(await apiActor(r), await readJson(r)), 201),
);
export const messagesGet = endpoint(async (r, c) =>
  chat.getChat(await apiActor(r), {
    ...query(r),
    conversationId: (await paramsOf(c)).id,
  }),
);
export const messagesPost = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  return json(
    await chat.sendChatMessage(actor, { ...(await readJson(r)), conversationId: id }),
    201,
  );
});
export const readPut = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  await chat.markChatRead(actor, { ...(await readJson(r)), conversationId: id });
});
export const blockPut = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  await chat.blockChat(actor, { ...(await readJson(r)), conversationId: id });
});
export const reportPost = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id, messageId } = await paramsOf(c);
  await chat.reportChatMessage(actor, {
    ...(await readJson(r)),
    conversationId: id,
    messageId,
  });
});
