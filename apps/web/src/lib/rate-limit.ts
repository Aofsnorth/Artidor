import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/lib/env/web";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
});

export const baseRateLimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
	analytics: true,
	prefix: "rate-limit",
});

// Resolve the real client IP for rate-limiting. Prefer headers the client
// cannot forge through the platform's proxy: Cloudflare's `cf-connecting-ip`,
// then Vercel's `x-real-ip`, then the *first* `x-forwarded-for` hop. Keying on
// the raw (whole) `x-forwarded-for` string let a caller mint unlimited buckets
// by spoofing the header, which defeated the limit entirely.
export function clientIpOf(request: Request): string {
	return (
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-real-ip") ??
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"anonymous"
	);
}

/**
 * In-memory fallback rate limiter used when Upstash Redis is
 * unreachable. This prevents the fail-open vulnerability where an
 * attacker could bypass all rate limits by causing Redis to be
 * unavailable.
 *
 * Uses a simple Map with per-IP counters that reset every 60s.
 * The Map is capped at 10,000 entries to prevent unbounded memory
 * growth — oldest entries are evicted when the cap is reached.
 */
const LOCAL_LIMIT = 100; // 100 requests per minute (matches Redis)
const LOCAL_WINDOW_MS = 60_000;
const LOCAL_MAX_ENTRIES = 10_000;
const localStore = new Map<string, { count: number; resetAt: number }>();

function checkLocalRateLimit(ip: string): { success: boolean; limited: boolean } {
	const now = Date.now();
	const entry = localStore.get(ip);
	if (!entry || now > entry.resetAt) {
		// Evict oldest entries if we're at capacity.
		if (localStore.size >= LOCAL_MAX_ENTRIES) {
			const oldestKey = localStore.keys().next().value;
			if (oldestKey) localStore.delete(oldestKey);
		}
		localStore.set(ip, { count: 1, resetAt: now + LOCAL_WINDOW_MS });
		return { success: true, limited: false };
	}
	entry.count++;
	if (entry.count > LOCAL_LIMIT) {
		return { success: false, limited: true };
	}
	return { success: true, limited: false };
}

export async function checkRateLimit({ request }: { request: Request }) {
	const ip = clientIpOf(request);
	try {
		const { success } = await baseRateLimit.limit(ip);
		return { success, limited: !success };
	} catch (err) {
		// Fail CLOSED with local fallback instead of failing open.
		// This prevents attackers from bypassing rate limits by
		// causing Redis to be unavailable.
		console.warn("[rate-limit] Redis unreachable, using local fallback:", err);
		return checkLocalRateLimit(ip);
	}
}
