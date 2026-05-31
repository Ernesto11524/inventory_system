"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.cacheDelPattern = cacheDelPattern;
const redis_1 = require("@upstash/redis");
let redis = null;
function getRedis() {
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
        redis = new redis_1.Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return redis;
}
async function cacheGet(key) {
    const client = getRedis();
    if (!client)
        return null;
    try {
        const value = await client.get(key);
        return value;
    }
    catch (err) {
        console.error(`Cache GET error for key ${key}:`, err);
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds) {
    const client = getRedis();
    if (!client)
        return;
    try {
        if (ttlSeconds) {
            await client.set(key, value, { ex: ttlSeconds });
        }
        else {
            await client.set(key, value);
        }
    }
    catch (err) {
        console.error(`Cache SET error for key ${key}:`, err);
    }
}
async function cacheDel(key) {
    const client = getRedis();
    if (!client)
        return;
    try {
        await client.del(key);
    }
    catch (err) {
        console.error(`Cache DEL error for key ${key}:`, err);
    }
}
async function cacheDelPattern(pattern) {
    const client = getRedis();
    if (!client)
        return;
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
    }
    catch (err) {
        console.error(`Cache DEL pattern error for ${pattern}:`, err);
    }
}
//# sourceMappingURL=cache.js.map