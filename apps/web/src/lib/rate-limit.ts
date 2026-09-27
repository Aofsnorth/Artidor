import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/lib/env/web";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
	retry: {
		retries: 0,
	},
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

let redisLimitDisabledUntil = 0;
const isDev = process.env.NODE_ENV === "development";
const REDIS_LIMIT_COOLDOWN_MS = isDev ? 5 * 60_000 : 30_000;
const REDIS_LIMIT_TIMEOUT_MS = 1000;
let hasWarnedRedisUnavailable = false;
let hasWarnedRedisCreateUnavailable = false;

/**
 * Remaining budget for one key inside the limiter's current window,
 * as reported by the authoritative limiter.
 */
interface CachedBudget {
	/** The authoritative decision, kept so a denial is served fail-closed. */
	success: boolean;
	/** Requests still allowed in the current window. */
	remaining: number;
	/** Epoch ms at which the authoritative window rolls over. */
	reset: number;
}

/** Cap mirrors the local fallback stores so a flood cannot grow memory. */
const DECISION_CACHE_MAX_ENTRIES = LOCAL_MAX_ENTRIES;

/**
 * Per-key cache of the authoritative limiter's own budget.
 *
 * A collaboration client issues ~11 requests/second (1 Hz state poll +
 * 10 Hz cursor). Each one used to pay a blocking Upstash round-trip just
 * to be told "yes", which made the limiter the single largest source of
 * Redis traffic in the app.
 *
 * This cache does NOT re-decide anything and cannot raise the limit: it
 * stores the `remaining`/`reset` budget that `Ratelimit.limit()`
 * returned and spends it locally, re-consulting Redis only when the
 * budget is exhausted or the window rolls over. The enforced ceiling is
 * therefore still 100 requests/minute per key — a burst is absorbed
 * sooner, never granted more. A denial is cached for the rest of the
 * window, so a client that is being throttled stops hammering Redis too.
 *
 * Keyed on the resolved client IP, never on a request-supplied session,
 * room, or resource id: a caller able to pick its own key could mint
 * unlimited buckets and defeat the limit entirely — the failure mode
 * `clientIpOf` already guards against for `x-forwarded-for`. Nothing here
 * disables limiting, for collab or for any other route.
 */
const decisionCache = new Map<string, CachedBudget>();

function rememberBudget(key: string, budget: CachedBudget): void {
	if (decisionCache.size >= DECISION_CACHE_MAX_ENTRIES) {
		const oldestKey = decisionCache.keys().next().value;
		if (oldestKey !== undefined) decisionCache.delete(oldestKey);
	}
	decisionCache.set(key, budget);
}

export async function checkRateLimit({ request }: { request: Request }) {
	const ip = clientIpOf(request);

	// While Redis is in its unreachable cooldown the local limiter is the
	// authority, so the cache is bypassed entirely rather than spending a
	// Redis-granted budget on top of the local counter.
	if (Date.now() > redisLimitDisabledUntil) {
		// Spend the budget the authoritative limiter already granted, if the
		// window is still open. Unknown, exhausted, or expired entries fall
		// through to Redis, which stays the only source of truth.
		const cached = decisionCache.get(ip);
		if (cached) {
			if (Date.now() >= cached.reset) {
				decisionCache.delete(ip);
			} else if (!cached.success) {
				return { success: false, limited: true };
			} else if (cached.remaining > 0) {
				cached.remaining -= 1;
				return { success: true, limited: false };
			}
		}

		try {
			// `Promise<never>` keeps the union from widening the response
			// type, so `remaining`/`reset` stay available for the cache.
			const { success, remaining, reset } = await Promise.race([
				baseRateLimit.limit(ip),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("RateLimit timeout")),
						REDIS_LIMIT_TIMEOUT_MS,
					),
				),
			]);
			if (Number.isFinite(remaining) && Number.isFinite(reset)) {
				rememberBudget(ip, { success, remaining, reset });
			}
			return { success, limited: !success };
		} catch (err) {
			redisLimitDisabledUntil = Date.now() + REDIS_LIMIT_COOLDOWN_MS;
			if (!hasWarnedRedisUnavailable) {
				hasWarnedRedisUnavailable = true;
				const reason = err instanceof Error ? err.message : String(err);
				console.warn(
					`[rate-limit] Redis unreachable (${reason}), using local fallback.`,
				);
			}
			return checkLocalRateLimit(ip);
		}
	}
	return checkLocalRateLimit(ip);
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
	if (Date.now() > redisLimitDisabledUntil) {
		try {
			const { success } = await Promise.race([
				createResourceRateLimit.limit(ip),
				new Promise<{ success: boolean }>((_, reject) =>
					setTimeout(
						() => reject(new Error("RateLimit create timeout")),
						REDIS_LIMIT_TIMEOUT_MS,
					),
				),
			]);
			return { success, limited: !success };
		} catch (err) {
			redisLimitDisabledUntil = Date.now() + REDIS_LIMIT_COOLDOWN_MS;
			if (!hasWarnedRedisCreateUnavailable) {
				hasWarnedRedisCreateUnavailable = true;
				const reason = err instanceof Error ? err.message : String(err);
				console.warn(
					`[rate-limit] Redis unreachable for create (${reason}), using local fallback.`,
				);
			}
			return checkLocalCreateRateLimit(ip);
		}
	}
	return checkLocalCreateRateLimit(ip);
}
