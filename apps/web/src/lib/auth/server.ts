import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "@upstash/redis";
import { db } from "@/lib/db";
import { webEnv } from "@/lib/env/web";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	secret: webEnv.BETTER_AUTH_SECRET,
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	rateLimit: {
		storage: "secondary-storage",
		// better-auth 1.7 replaced the { get, set } custom storage contract with
		// an atomic consume(key, rule) => { allowed, retryAfter } shape. Redis
		// INCR + first-write EXPIRE implements the counter; the TTL reset on the
		// first increment per window keeps the window sliding per key.
		customStorage: {
			consume: async (key, rule) => {
				const windowSeconds = rule.window ?? 10;
				const count = await redis.incr(key);
				if (count === 1) {
					await redis.expire(key, windowSeconds);
				}
				if (count > rule.max) {
					return { allowed: false, retryAfter: windowSeconds };
				}
				return { allowed: true, retryAfter: null };
			},
		},
	},
	baseURL: webEnv.NEXT_PUBLIC_SITE_URL,
	appName: "Artidor",
	trustedOrigins: [webEnv.NEXT_PUBLIC_SITE_URL],
});

export type Auth = typeof auth;
