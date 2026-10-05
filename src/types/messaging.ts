export type ChatMessage = {
  id: string;
  sequence: number;
  clientId: string;
  body: string;
  mine: boolean;
  side: "BUYER" | "SELLER";
  createdAt: string;
};

export type ChatView = {
  id: string;
  title: string;
  otherName: string;
  listingId: string | null;
  listingPhoto: { id: string; altText: string } | null;
  side: "BUYER" | "SELLER";
  canSend: boolean;
  blockedByMe: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
};

export type ChatInboxItem = {
  id: string;
  title: string;
  otherName: string;
  preview: string;
  unread: number;
};

export type ChatInbox = {
  items: ChatInboxItem[];
  hasMore: boolean;
};

export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: string };
