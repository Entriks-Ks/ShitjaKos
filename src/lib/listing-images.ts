import "server-only";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import sharp from "sharp";

const uploadDirectory = () => join(process.cwd(), ".uploads");
const uploadPath = (key: string) => join(uploadDirectory(), key);
const thumbnailDirectory = () => join(process.cwd(), ".uploads", "thumbnails");
const pending = new Map<string, Promise<Buffer>>();

export async function readListingImage(key: string, thumbnail: boolean) {
  if (!thumbnail) return readFile(join(process.cwd(), ".uploads", key));
  const path = join(thumbnailDirectory(), key);
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // Deduplicate concurrent thumbnail generation; only one fixed size is accepted.
  let task = pending.get(key);
  if (!task) {
    task = (async () => {
      const image = await sharp(join(process.cwd(), ".uploads", key))
        .resize(480, 480, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      await mkdir(thumbnailDirectory(), { recursive: true });
      const temporaryPath = `${path}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryPath, image);
        await rename(temporaryPath, path);
      } finally {
        await unlink(temporaryPath).catch(() => {});
      }
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
  await unlink(join(thumbnailDirectory(), key)).catch(() => {});
}

export async function storeListingImage(image: Buffer) {
  const key = `${randomUUID()}.webp`;
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(uploadPath(key), image);
  return key;
}

export async function removeListingImage(key: string) {
  await unlink(uploadPath(key)).catch(() => {});
  await removeListingThumbnail(key);
}

export async function removeListingImages(keys: string[]) {
  for (const key of keys) {
    // Keys come from the database; one holding a separator would escape .uploads.
    if (basename(key) !== key || key.includes("\\")) {
      console.error("Skipped an invalid image storage key.");
      continue;
    }
    try {
      await unlink(uploadPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Could not remove a deleted listing image.", error);
      }
    }
    await removeListingThumbnail(key);
  }
}
