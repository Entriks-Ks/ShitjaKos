import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { objectStorageEnvSchema } from "@/lib/validations/env";

const globalForS3 = globalThis as unknown as {
  s3?: S3Client;
  s3Bucket?: string;
};

function configuredVars() {
  return {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  };
}

export function objectStorage() {
  const values = configuredVars();
  const filled = Object.values(values).filter((value) => value && value.length > 0);
  if (filled.length === 0) return null;
  const parsed = objectStorageEnvSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(
      "Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME together.",
    );
  }
  if (!globalForS3.s3 || globalForS3.s3Bucket !== parsed.data.AWS_S3_BUCKET_NAME) {
    globalForS3.s3 = new S3Client({
      region: parsed.data.AWS_REGION,
      credentials: {
        accessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
        secretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
      },
    });
    globalForS3.s3Bucket = parsed.data.AWS_S3_BUCKET_NAME;
  }
  return { client: globalForS3.s3, bucket: parsed.data.AWS_S3_BUCKET_NAME };
}

export function listingObjectKey(fileKey: string) {
  return `listings/${fileKey}`;
}

export function listingThumbnailKey(fileKey: string) {
  return `listings/thumbnails/${fileKey}`;
}

export function shopLogoObjectKey(fileKey: string) {
  return `shops/logo/${fileKey}`;
}

export function shopBackgroundObjectKey(fileKey: string) {
  return `shops/background-image-shop/${fileKey}`;
}

export async function getObjectByKeys(keys: string[]) {
  for (const key of keys) {
    const value = await getListingObject(key);
    if (value) return value;
  }
  return null;
}

export async function deleteObjects(keys: string[]) {
  await Promise.all(keys.map((key) => deleteListingObject(key)));
}

function isMissingObject(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    name === "AccessDenied" ||
    name === "Forbidden" ||
    status === 404 ||
    status === 403
  );
}

async function bodyToBuffer(body: unknown) {
  if (!body) throw new Error("S3 object had no body.");
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putListingObject(key: string, image: Buffer) {
  const storage = objectStorage();
  if (!storage) return;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: image,
      ContentType: "image/webp",
    }),
  );
}

export async function getListingObject(key: string) {
  const storage = objectStorage();
  if (!storage) return null;
  try {
    const result = await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    return bodyToBuffer(result.Body);
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function deleteListingObject(key: string) {
  const storage = objectStorage();
  if (!storage) return;
  try {
    await storage.client.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } catch (error) {
    if (isMissingObject(error)) return;
    throw error;
  }
}
