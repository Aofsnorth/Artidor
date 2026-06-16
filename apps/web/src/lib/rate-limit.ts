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

export async function checkRateLimit({ request }: { request: Request }) {
	const { success } = await baseRateLimit.limit(clientIpOf(request));
	return { success, limited: !success };
}
