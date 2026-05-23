import { createHash } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../config/env.js";
import { AppError } from "../shared/errors/app-error.js";
import { logger } from "./logger.js";

let s3Client: S3Client | null = null;

export function isS3Configured(): boolean {
  const env = getEnv();
  return Boolean(env.AWS_ACCESS_KEY_ID && env.S3_BUCKET_NAME);
}

export function isMinio(): boolean {
  return Boolean(getEnv().S3_ENDPOINT);
}

function getS3(): S3Client {
  if (!s3Client) {
    const env = getEnv();
    if (!isS3Configured()) {
      throw AppError.badRequest("S3 is not configured");
    }

    const useCustomEndpoint = Boolean(env.S3_ENDPOINT);

    s3Client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE ?? useCustomEndpoint,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return s3Client;
}

/** Create evidence + backup buckets on startup (MinIO / local dev) */
export async function ensureS3Buckets(): Promise<void> {
  if (!isS3Configured()) return;

  const env = getEnv();
  const buckets = [env.S3_BUCKET_NAME, env.S3_BACKUP_BUCKET].filter(
    (b): b is string => Boolean(b)
  );

  const client = getS3();

  for (const bucket of buckets) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        logger.info("S3 bucket created", { bucket, endpoint: env.S3_ENDPOINT ?? "aws" });
      } catch (err) {
        logger.warn("Could not create S3 bucket", { bucket, error: String(err) });
      }
    }
  }
}

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  mimeType: string
): Promise<{ key: string; hash: string; size: number }> {
  const env = getEnv();
  const hash = sha256(body);
  await getS3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: mimeType,
      Metadata: { sha256: hash },
    })
  );
  return { key, hash, size: body.length };
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const env = getEnv();
  const res = await getS3().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: key })
  );
  const body = res.Body;
  if (!body) throw AppError.notFound("Empty object");
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const env = getEnv();
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: key }),
    { expiresIn }
  );
}

export function buildS3Key(rtiId: string, docType: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `cases/${rtiId}/${docType}/${safe}`;
}
