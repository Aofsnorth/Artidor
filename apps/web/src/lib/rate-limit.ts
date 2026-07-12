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
 * In-memory fallback rate limiters used when Upstash Redis is
 * unreachable. This prevents the fail-open vulnerability where an
 * attacker could bypass all rate limits by causing Redis to be
 * unavailable.
 *
 * Both stores are capped at 10,000 entries to prevent unbounded memory
 * growth — oldest entries are evicted when the cap is reached.
 */
const LOCAL_MAX_ENTRIES = 10_000;

const LOCAL_LIMIT = 100; // 100 requests per minute (matches Redis)
const LOCAL_WINDOW_MS = 60_000;
const localStore = new Map<string, { count: number; resetAt: number }>();

function checkLocalRateLimit(ip: string): {
	success: boolean;
	limited: boolean;
} {
	const now = Date.now();
	const entry = localStore.get(ip);
	if (!entry || now > entry.resetAt) {
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
		console.warn("[rate-limit] Redis unreachable, using local fallback:", err);
		return checkLocalRateLimit(ip);
	}
}

/**
 * Stricter limiter for resource-creation endpoints (collab rooms, share
 * links). These are anonymous by design (local-first philosophy), but
 * without a tighter cap an attacker could create unlimited rooms/shares
 * for resource exhaustion or abuse. 10 creates per hour per IP is
 * generous for legitimate use (a user rarely creates more than a few
 * rooms/shares in a session) while making bulk abuse impractical.
 */
export const createResourceRateLimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 creates per hour
	analytics: true,
	prefix: "rate-limit:create",
});

const LOCAL_CREATE_LIMIT = 10; // 10 creates per hour (matches Redis)
const LOCAL_CREATE_WINDOW_MS = 60 * 60_000;
const localCreateStore = new Map<string, { count: number; resetAt: number }>();

function checkLocalCreateRateLimit(ip: string): {
	success: boolean;
	limited: boolean;
} {
	const now = Date.now();
	const entry = localCreateStore.get(ip);
	if (!entry || now > entry.resetAt) {
		if (localCreateStore.size >= LOCAL_MAX_ENTRIES) {
			const oldestKey = localCreateStore.keys().next().value;
			if (oldestKey) localCreateStore.delete(oldestKey);
		}
		localCreateStore.set(ip, {
			count: 1,
			resetAt: now + LOCAL_CREATE_WINDOW_MS,
		});
		return { success: true, limited: false };
	}
	entry.count++;
	if (entry.count > LOCAL_CREATE_LIMIT) {
		return { success: false, limited: true };
	}
	return { success: true, limited: false };
}

/**
 * Stricter rate-limit check for resource-creation endpoints. Falls back
 * to an in-memory hourly limiter if Redis is unreachable (fail-closed,
 * same pattern as the base limiter).
 */
export async function checkCreateResourceRateLimit({
	request,
}: {
	request: Request;
}) {
	const ip = clientIpOf(request);
	try {
		const { success } = await createResourceRateLimit.limit(ip);
		return { success, limited: !success };
	} catch (err) {
		console.warn(
			"[rate-limit] Redis unreachable (create), using local fallback:",
			err,
		);
		return checkLocalCreateRateLimit(ip);
	}
}
