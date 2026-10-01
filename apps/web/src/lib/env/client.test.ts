import { expect, test } from "bun:test";

/**
 * Regression: importing the client env module must never throw, even when
 * server secrets are absent — the browser bundle never sees them.
 *
 * Context: `lib/env/web` validates DATABASE_URL / BETTER_AUTH_SECRET and
 * throws in production when missing. `lib/auth/client` (bundled into the
 * lazily loaded Audio tab) imported it, so opening Audio in a deploy
 * without those client-visible vars crashed the whole editor route
 * ("Editor hit a snag", React error #419).
 */
test("client env never throws without server secrets", async () => {
	const saved = { ...process.env };
	for (const key of Object.keys(process.env)) {
		if (
			key === "DATABASE_URL" ||
			key === "BETTER_AUTH_SECRET" ||
			key === "UPSTASH_REDIS_REST_URL" ||
			key === "UPSTASH_REDIS_REST_TOKEN" ||
			key === "MARBLE_WORKSPACE_KEY" ||
			key === "FREESOUND_CLIENT_ID" ||
			key === "FREESOUND_API_KEY" ||
			key === "PEXELS_API_KEY" ||
			key === "NEXT_PUBLIC_MARBLE_API_URL"
		) {
			delete process.env[key];
		}
	}
	try {
		const mod = await import("./client");
		expect(mod.clientEnv.NEXT_PUBLIC_SITE_URL).toBeTruthy();
	} finally {
		process.env = saved;
	}
});

test("client env exposes no server secrets", async () => {
	const mod = await import("./client");
	const keys = Object.keys(mod.clientEnv);
	for (const secret of [
		"DATABASE_URL",
		"BETTER_AUTH_SECRET",
		"UPSTASH_REDIS_REST_URL",
		"UPSTASH_REDIS_REST_TOKEN",
		"MARBLE_WORKSPACE_KEY",
		"FREESOUND_CLIENT_ID",
		"FREESOUND_API_KEY",
		"PEXELS_API_KEY",
		"NODE_ENV",
	]) {
		expect(keys).not.toContain(secret);
	}
	for (const key of keys) {
		expect(key.startsWith("NEXT_PUBLIC_")).toBe(true);
	}
});
