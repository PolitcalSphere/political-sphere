import type { RedisOptions } from "ioredis";
import Redis from "ioredis";

type RedisLike = Pick<
  Redis,
  "get" | "set" | "setex" | "del" | "scan" | "pipeline" | "quit"
>;

type RedisInput = string | Redis | RedisOptions | RedisLike | undefined;

function isRedisInstance(input: unknown): input is Redis {
  return input instanceof Redis;
}

function isRedisLike(input: unknown): input is RedisLike {
  if (!input || typeof input !== "object") return false;
  const candidate = input as Partial<RedisLike>;
  return (
    typeof candidate.get === "function" &&
    typeof candidate.set === "function" &&
    typeof candidate.setex === "function" &&
    typeof candidate.del === "function" &&
    typeof candidate.scan === "function" &&
    typeof candidate.pipeline === "function" &&
    typeof candidate.quit === "function"
  );
}

export class CacheService {
  private redis: RedisLike;
  private ownsConnection = false;

  constructor(redisInput?: RedisInput) {
    if (isRedisInstance(redisInput)) {
      this.redis = redisInput;
      this.ownsConnection = false;
      return;
    }

    if (isRedisLike(redisInput)) {
      this.redis = redisInput;
      this.ownsConnection = false;
      return;
    }

    if (typeof redisInput === "string") {
      this.redis = new Redis(redisInput);
    } else if (redisInput && typeof redisInput === "object") {
      this.redis = new Redis(redisInput);
    } else {
      const connection = process.env.REDIS_URL || "redis://localhost:6379";
      this.redis = new Redis(connection);
    }

    this.ownsConnection = true;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn("Cache get error:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      if (typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds)) {
        const ttl = Math.max(0, Math.floor(ttlSeconds));
        if (ttl > 0) {
          await this.redis.setex(key, ttl, data);
        } else {
          await this.redis.del(key);
        }
      } else {
        await this.redis.set(key, data);
      }
    } catch (error) {
      console.warn("Cache set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn("Cache del error:", error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          for (const key of keys) {
            pipeline.del(key);
          }
          await pipeline.exec();
        }
        cursor = nextCursor;
      } while (cursor !== "0");
    } catch (error) {
      console.warn("Cache invalidate pattern error:", error);
    }
  }

  async close(): Promise<void> {
    if (this.ownsConnection) {
      await this.redis.quit();
    }
  }
}

// Cache key generators
export const cacheKeys = {
  bill: (id: string) => `bill:${id}`,
  bills: (page?: number, limit?: number) => `bills:${page || 1}:${limit || 10}`,
  billVotes: (billId: string) => `bill:${billId}:votes`,
  user: (id: string) => `user:${id}`,
  userBills: (userId: string) => `user:${userId}:bills`,
  userVotes: (userId: string) => `user:${userId}:votes`,
  userByUsername: (username: string) => `user:username:${username}`,
  userByEmail: (email: string) => `user:email:${email}`,
  vote: (id: string) => `vote:${id}`,
  votesByBill: (billId: string) => `votes:bill:${billId}`,
  votesByUser: (userId: string) => `votes:user:${userId}`,
  party: (id: string) => `party:${id}`,
  partyByName: (name: string) => `party:name:${name}`,
  parties: () => `parties:all`,
};

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  BILL: 300, // 5 minutes
  BILLS_LIST: 60, // 1 minute
  VOTES: 120, // 2 minutes
  USER: 600, // 10 minutes
  PARTY: 300, // 5 minutes
  PARTY_LIST: 120, // 2 minutes
};
