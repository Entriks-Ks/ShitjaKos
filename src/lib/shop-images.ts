import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import {
  deleteListingObject,
  getListingObject,
  objectStorage,
  putListingObject,
  shopBackgroundObjectKey,
  shopLogoObjectKey,
} from "@/lib/s3";

export type ShopImageKind = "logo" | "background";

function assertSafeKey(key: string) {
  return basename(key) === key && !key.includes("\\");
}

function objectKey(kind: ShopImageKind, fileKey: string) {
  return kind === "logo" ? shopLogoObjectKey(fileKey) : shopBackgroundObjectKey(fileKey);
}

function localDirectory(kind: ShopImageKind) {
  return join(
    process.cwd(),
    ".uploads",
    kind === "logo" ? "shops/logo" : "shops/background-image-shop",
  );
}

function localPath(kind: ShopImageKind, fileKey: string) {
  return join(localDirectory(kind), fileKey);
}

export async function storeShopImage(kind: ShopImageKind, image: Buffer) {
  const fileKey = `${randomUUID()}.webp`;
  if (objectStorage()) {
    await putListingObject(objectKey(kind, fileKey), image);
    return fileKey;
  }
  await mkdir(localDirectory(kind), { recursive: true });
  await writeFile(localPath(kind, fileKey), image);
  return fileKey;
}

export async function readShopImage(kind: ShopImageKind, fileKey: string) {
  if (!assertSafeKey(fileKey)) throw new Error("Invalid image storage key.");
  return (
    (await getListingObject(objectKey(kind, fileKey))) ?? readFile(localPath(kind, fileKey))
  );
}

export async function removeShopImage(kind: ShopImageKind, fileKey: string) {
  if (!assertSafeKey(fileKey)) return;
  await deleteListingObject(objectKey(kind, fileKey));
  await unlink(localPath(kind, fileKey)).catch(() => {});
}
