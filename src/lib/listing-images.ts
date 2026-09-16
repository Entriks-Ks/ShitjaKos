import "server-only";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";

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
