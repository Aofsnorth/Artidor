import { z } from "zod";

const webEnvSchema = z.object({
	// Node
	NODE_ENV: z.enum(["development", "production", "test"]),
	ANALYZE: z.string().optional(),
	NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

	// Public
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_MARBLE_API_URL: z.url(),
	NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),

	// Server
	DATABASE_URL: z
		.string()
		.refine(
			(url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
			"DATABASE_URL must be a postgres:// or postgresql:// URL",
		),

	BETTER_AUTH_SECRET: z.string(),
	UPSTASH_REDIS_REST_URL: z.url(),
	UPSTASH_REDIS_REST_TOKEN: z.string(),
	MARBLE_WORKSPACE_KEY: z.string(),
	FREESOUND_CLIENT_ID: z.string(),
	FREESOUND_API_KEY: z.string(),
	PEXELS_API_KEY: z.string(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

const parsed = webEnvSchema.safeParse(process.env);

export const isEnvMissing = !parsed.success;
if (isEnvMissing && parsed.error) {
	const isProduction = process.env.NODE_ENV === "production";
	const level = isProduction ? "error" : "warn";
	const message = isProduction
		? "Refusing to boot: missing or invalid environment variables in production. Set them and restart."
		: "Missing or invalid environment variables. Some features may not work properly.";
	console[level](`⚠️  ${message}`);
	for (const issue of parsed.error.issues) {
		console[level](`  - ${issue.path.join(".")}: ${issue.message}`);
	}
	// Fail-hard in production: booting without a real BETTER_AUTH_SECRET or
	// DATABASE_URL is a security risk (forgeable sessions, broken auth).
	if (isProduction) {
		throw new Error(
			"Missing required environment variables in production. See logs above.",
		);
	}
}

export const webEnv = (parsed.success ? parsed.data : process.env) as WebEnv;
