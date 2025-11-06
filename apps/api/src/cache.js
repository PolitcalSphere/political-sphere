import Redis from "ioredis";

function isRedisInstance(input) {
	return input instanceof Redis;
}

function isRedisLike(input) {
	if (!input || typeof input !== "object") {
		return false;
	}

	const candidate = input;
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

class CacheService {
	constructor(redisInput) {
		this.ownsConnection = false;

		if (isRedisInstance(redisInput)) {
			this.redis = redisInput;
			return;
		}

		if (isRedisLike(redisInput)) {
			this.redis = redisInput;
			return;
		}

		if (typeof redisInput === "string") {
			this.redis = new Redis(redisInput);
			this.ownsConnection = true;
			return;
		}

		if (redisInput && typeof redisInput === "object") {
			this.redis = new Redis(redisInput);
			this.ownsConnection = true;
			return;
		}

		const connection = process.env.REDIS_URL || "redis://localhost:6379";
		this.redis = new Redis(connection);
		this.ownsConnection = true;
	}

	async get(key) {
		try {
			const data = await this.redis.get(key);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			console.warn("Cache get error:", error);
			return null;
		}
	}

	async set(key, value, ttlSeconds) {
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

	async del(key) {
		try {
			await this.redis.del(key);
		} catch (error) {
			console.warn("Cache del error:", error);
		}
	}

	async invalidatePattern(pattern) {
		try {
			let cursor = "0";
			do {
				const [nextCursor, keys] = await this.redis.scan(
					cursor,
					"MATCH",
					pattern,
					"COUNT",
					100,
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

	async close() {
		if (this.ownsConnection) {
			await this.redis.quit();
		}
	}
}

const cacheKeys = {
	bill: (id) => `bill:${id}`,
	bills: (page = 1, limit = 10) => `bills:${page}:${limit}`,
	billVotes: (billId) => `bill:${billId}:votes`,
	user: (id) => `user:${id}`,
	userBills: (userId) => `user:${userId}:bills`,
	userVotes: (userId) => `user:${userId}:votes`,
	userByUsername: (username) => `user:username:${username}`,
	userByEmail: (email) => `user:email:${email}`,
	vote: (id) => `vote:${id}`,
	votesByBill: (billId) => `votes:bill:${billId}`,
	votesByUser: (userId) => `votes:user:${userId}`,
	party: (id) => `party:${id}`,
	partyByName: (name) => `party:name:${name}`,
	parties: () => "parties:all",
};

const CACHE_TTL = {
	BILL: 300, // 5 minutes
	BILLS_LIST: 60, // 1 minute
	VOTES: 120, // 2 minutes
	USER: 600, // 10 minutes
	PARTY: 300, // 5 minutes
	PARTY_LIST: 120, // 2 minutes
};

export { CacheService, cacheKeys, CACHE_TTL };
