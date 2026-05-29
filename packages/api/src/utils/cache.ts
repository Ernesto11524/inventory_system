import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Fall back to local redis or skip caching
    if (process.env.REDIS_URL) {
      // For local dev, we'll just return null and skip caching
      // In production, use Upstash
      return null;
    }
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (err) {
    console.error(`Cache GET error for key ${key}:`, err);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    if (ttlSeconds) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    console.error(`Cache SET error for key ${key}:`, err);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch (err) {
    console.error(`Cache DEL error for key ${key}:`, err);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error(`Cache DEL pattern error for ${pattern}:`, err);
  }
}
