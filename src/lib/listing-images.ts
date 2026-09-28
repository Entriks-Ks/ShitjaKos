import "server-only";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import sharp from "sharp";
import {
  deleteObjects,
  getObjectByKeys,
  listingObjectKey,
  listingThumbnailKey,
  objectStorage,
  putListingObject,
} from "@/lib/s3";

const uploadDirectory = () => join(process.cwd(), ".uploads");
const uploadPath = (key: string) => join(uploadDirectory(), key);
const thumbnailDirectory = () => join(process.cwd(), ".uploads", "thumbnails");
const pending = new Map<string, Promise<Buffer>>();

function assertSafeKey(key: string) {
  return basename(key) === key && !key.includes("\\");
}

function listingKeys(key: string) {
  return [listingObjectKey(key), key];
}

function listingThumbKeys(key: string) {
  return [listingThumbnailKey(key), `thumbnails/${key}`];
}

function thumbnailBuffer(image: Buffer) {
  return sharp(image)
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
}

async function readLocalImage(key: string) {
  return readFile(uploadPath(key));
}

async function persistLocalThumbnail(key: string, image: Buffer) {
  await mkdir(thumbnailDirectory(), { recursive: true });
  const path = join(thumbnailDirectory(), key);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, image);
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

export async function readListingImage(key: string, thumbnail: boolean) {
  if (!assertSafeKey(key)) throw new Error("Invalid image storage key.");
  if (!thumbnail) {
    return (await getObjectByKeys(listingKeys(key))) ?? readLocalImage(key);
  }

  const stored =
    (await getObjectByKeys(listingThumbKeys(key))) ??
    (await readFile(join(thumbnailDirectory(), key)).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return null;
    }));
  if (stored) return stored;

  let task = pending.get(key);
  if (!task) {
    task = (async () => {
      const full = (await getObjectByKeys(listingKeys(key))) ?? (await readLocalImage(key));
      const image = await thumbnailBuffer(full);
      if (objectStorage()) await putListingObject(listingThumbnailKey(key), image);
      else await persistLocalThumbnail(key, image);
      return image;
    })();
    pending.set(key, task);
  }
  try {
    return await task;
  } finally {
    if (pending.get(key) === task) pending.delete(key);
  }
}

export async function removeListingThumbnail(key: string) {
  if (!assertSafeKey(key)) return;
  await deleteObjects(listingThumbKeys(key));
  await unlink(join(thumbnailDirectory(), key)).catch(() => {});
}

export async function storeListingImage(image: Buffer) {
  const key = `${randomUUID()}.webp`;
  if (objectStorage()) {
    const thumb = await thumbnailBuffer(image);
    try {
      await Promise.all([
        putListingObject(listingObjectKey(key), image),
        putListingObject(listingThumbnailKey(key), thumb),
      ]);
    } catch (error) {
      await deleteObjects([...listingKeys(key), ...listingThumbKeys(key)]);
      throw error;
    }
    return key;
  }
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(uploadPath(key), image);
  return key;
}

export async function removeListingImage(key: string) {
  if (!assertSafeKey(key)) return;
  await deleteObjects(listingKeys(key));
  await unlink(uploadPath(key)).catch(() => {});
  await removeListingThumbnail(key);
}

export async function removeListingImages(keys: string[]) {
  for (const key of keys) {
    if (!assertSafeKey(key)) {
      console.error("Skipped an invalid image storage key.");
      continue;
    }
    try {
      await deleteObjects(listingKeys(key));
      await unlink(uploadPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Could not remove a deleted listing image.", error);
      }
    }
    await removeListingThumbnail(key);
  }
}
