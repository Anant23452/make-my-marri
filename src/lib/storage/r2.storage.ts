import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getStorageEnv } from "@/lib/validation/env";

export type UploadAuthorization = {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
};

let r2Client: S3Client | undefined;

function getR2() {
  const env = getStorageEnv();

  r2Client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return { bucket: env.R2_BUCKET_NAME, client: r2Client };
}

export const r2Storage = {
  async createUploadUrl({
    objectKey,
    contentType,
    expiresInSeconds = 300,
  }: UploadAuthorization) {
    const { bucket, client } = getR2();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  },

  async createPrivateViewUrl(objectKey: string, expiresInSeconds = 300) {
    const { bucket, client } = getR2();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  },

  async getMetadata(objectKey: string) {
    const { bucket, client } = getR2();
    return client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  },

  async delete(objectKey: string) {
    const { bucket, client } = getR2();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  },
};
