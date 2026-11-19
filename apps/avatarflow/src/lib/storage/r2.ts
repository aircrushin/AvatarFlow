import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from '@/lib/config';
import type { StorageAdapter, StoredObject } from './types';

function client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

function publicUrl(key: string): string {
  const base = config.r2.publicUrl.replace(/\/$/, '');
  return `${base}/${key}`;
}

export const r2Storage: StorageAdapter = {
  async put({ key, body, contentType }): Promise<StoredObject> {
    await client().send(
      new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: publicUrl(key) };
  },
  async get(url) {
    const base = `${config.r2.publicUrl.replace(/\/$/, '')}/`;
    if (!url.startsWith(base)) return null;
    const res = await client().send(
      new GetObjectCommand({ Bucket: config.r2.bucket, Key: url.slice(base.length) }),
    );
    if (!res.Body) return null;
    return Buffer.from(await res.Body.transformToByteArray());
  },
  async remove(key) {
    await client().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  },
};
