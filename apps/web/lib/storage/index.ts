import 'server-only';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

export interface ObjectStore {
  put(key: string, body: Buffer | string, contentType?: string): Promise<{ key: string }>;
  get(key: string): Promise<Buffer | null>;
}

class LocalStore implements ObjectStore {
  constructor(private readonly root: string) {}

  async put(key: string, body: Buffer | string): Promise<{ key: string }> {
    const path = join(this.root, key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, body);
    return { key };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(join(this.root, key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}

class S3CompatibleStore implements ObjectStore {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    endpoint: string | undefined,
    region: string,
    accessKey: string,
    secretKey: string,
  ) {
    this.client = new S3Client({
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  async put(key: string, body: Buffer | string, contentType = 'text/html'): Promise<{ key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const chunks: Uint8Array[] = [];
      // biome-ignore lint/suspicious/noExplicitAny: aws stream is typed loosely
      for await (const chunk of res.Body as any) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (err) {
      if ((err as { Code?: string }).Code === 'NoSuchKey') return null;
      throw err;
    }
  }
}

let cached: ObjectStore | null = null;

export function storage(): ObjectStore {
  if (cached) return cached;
  if (env.STORAGE_DRIVER === 'local') {
    cached = new LocalStore(env.STORAGE_LOCAL_DIR);
    return cached;
  }
  if (!env.STORAGE_S3_ACCESS_KEY || !env.STORAGE_S3_SECRET_KEY) {
    throw new Error('storage: S3-compatible driver selected but credentials are missing');
  }
  cached = new S3CompatibleStore(
    env.STORAGE_S3_BUCKET,
    env.STORAGE_S3_ENDPOINT,
    env.STORAGE_S3_REGION,
    env.STORAGE_S3_ACCESS_KEY,
    env.STORAGE_S3_SECRET_KEY,
  );
  return cached;
}

export function archiveKeyFor(userId: string, articleId: string): string {
  // user-scoped path keeps backups simple to filter.
  return `archive/${userId}/${articleId}.html`;
}
