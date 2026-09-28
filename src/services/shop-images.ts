import "server-only";
import sharp from "sharp";
import type { Actor } from "@/lib/permissions";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import { findShopByBusinessId, setShopImageKey } from "@/repositories/shops";
import {
  readShopImage,
  removeShopImage,
  storeShopImage,
  type ShopImageKind,
} from "@/lib/shop-images";

export class ShopImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isOwner(actor: Actor, shop: { business: { memberships: { userId: string; role: string }[] } }) {
  return shop.business.memberships.some((m) => m.userId === actor.id && m.role === "OWNER");
}

export function parseShopImageKind(value: string | null): ShopImageKind {
  if (value === "logo" || value === "background") return value;
  throw new ShopImageError("Choose a shop logo or background image.", 400);
}

async function processedImage(kind: ShopImageKind, file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) {
    throw new ShopImageError("Choose a JPEG, PNG or WebP image under 8 MB.", 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(buffer, { limitInputPixels: 25_000_000 }).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new ShopImageError("Only JPEG, PNG and WebP images are allowed.", 400);
  }
  const resized =
    kind === "logo"
      ? sharp(buffer, { limitInputPixels: 25_000_000 })
          .rotate()
          .resize(512, 512, { fit: "cover" })
          .webp({ quality: 82 })
      : sharp(buffer, { limitInputPixels: 25_000_000 })
          .rotate()
          .resize(1600, 900, { fit: "cover" })
          .webp({ quality: 82 });
  return resized.toBuffer();
}

export async function saveShopImage(
  actor: Actor,
  businessId: string,
  kind: ShopImageKind,
  file: FormDataEntryValue | null,
) {
  if (actor.suspendedAt) throw new ShopImageError("Not allowed.", 403);
  if (!(file instanceof File)) {
    throw new ShopImageError("Choose a JPEG, PNG or WebP image under 8 MB.", 400);
  }
  const shop = await findShopByBusinessId(businessId);
  if (!shop || !isOwner(actor, shop) || shop.business.suspendedAt) {
    throw new ShopImageError("Not allowed.", 403);
  }
  const image = await processedImage(kind, file);
  const fileKey = await storeShopImage(kind, image);
  const previous = kind === "logo" ? shop.logoKey : shop.backgroundKey;
  try {
    await withTransaction(async (tx) => {
      await setShopImageKey(tx, businessId, kind, fileKey);
      await recordAudit(tx, actor.id, `shop.${kind}-updated`, businessId, { fileKey });
    });
  } catch (error) {
    await removeShopImage(kind, fileKey);
    throw error;
  }
  if (previous) await removeShopImage(kind, previous);
  return fileKey;
}

export async function clearShopImage(actor: Actor, businessId: string, kind: ShopImageKind) {
  if (actor.suspendedAt) throw new ShopImageError("Not allowed.", 403);
  const shop = await findShopByBusinessId(businessId);
  if (!shop || !isOwner(actor, shop) || shop.business.suspendedAt) {
    throw new ShopImageError("Not allowed.", 403);
  }
  const previous = kind === "logo" ? shop.logoKey : shop.backgroundKey;
  if (!previous) return;
  await withTransaction(async (tx) => {
    await setShopImageKey(tx, businessId, kind, null);
    await recordAudit(tx, actor.id, `shop.${kind}-deleted`, businessId, {});
  });
  await removeShopImage(kind, previous);
}

export async function readShopImageSrc(kind: ShopImageKind, fileKey: string | null | undefined) {
  if (!fileKey) return null;
  try {
    const data = await readShopImage(kind, fileKey);
    return `data:image/webp;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function shopBrandSrcs(shop: {
  logoKey: string | null | undefined;
  backgroundKey: string | null | undefined;
}) {
  const [logoSrc, backgroundSrc] = await Promise.all([
    readShopImageSrc("logo", shop.logoKey),
    readShopImageSrc("background", shop.backgroundKey),
  ]);
  return { logoSrc, backgroundSrc };
}

export async function shopLogosForMemberships<
  T extends { business: { shop: { logoKey: string | null } | null } },
>(memberships: T[]) {
  return Promise.all(
    memberships.map(async (membership) => ({
      ...membership,
      logoSrc: await readShopImageSrc("logo", membership.business.shop?.logoKey),
    })),
  );
}
