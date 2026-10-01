import { z } from "zod";

/**
 * Public (browser-safe) environment.
 *
 * Split from `./web` on purpose: the server schema validates secrets
 * (DATABASE_URL, BETTER_AUTH_SECRET, API keys) and throws in production
 * when they are missing. Importing that module from client code drags the
 * throw into the browser bundle — any lazily loaded view that touches it
 * (auth client → Audio tab) crashes the whole editor route in a deploy
 * where server-only vars are not exposed to the client.
 *
 * This module validates ONLY `NEXT_PUBLIC_*` values, always has safe
 * defaults, and never throws — safe to import from `"use client"` code.
 */
const clientEnvSchema = z.object({
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_MARBLE_API_URL: z.url().optional(),
	NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsed = clientEnvSchema.safeParse(process.env);

if (!parsed.success) {
	console.warn("⚠️  Missing or invalid public environment variables.");
	for (const issue of parsed.error.issues) {
		console.warn(`  - ${issue.path.join(".")}: ${issue.message}`);
	}
}

export const clientEnv: ClientEnv = parsed.success
	? parsed.data
	: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };
