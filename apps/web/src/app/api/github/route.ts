/**
 * GitHub repo metadata endpoint.
 *
 * Used by the marketing site to render real-time data — star count,
 * description, last commit, default branch — so the page never goes
 * stale. The response is cached for 10 minutes on the server; the
 * client additionally memoises in localStorage so a returning user
 * doesn't hit the network at all.
 *
 * Set GITHUB_TOKEN in production to bump the rate limit from 60/hr
 * to 5000/hr.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const repoSchema = z.object({
	full_name: z.string(),
	description: z.string().nullable(),
	stargazers_count: z.number(),
	forks_count: z.number(),
	open_issues_count: z.number(),
	watchers_count: z.number(),
	language: z.string().nullable(),
	license: z
		.object({
			spdx_id: z.string().nullable(),
			name: z.string().nullable(),
		})
		.nullable(),
	default_branch: z.string(),
	updated_at: z.string(),
	html_url: z.string(),
	homepage: z.string().nullable(),
	topics: z.array(z.string()).optional(),
});

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: { value: unknown; expiresAt: number } | null = null;

const OWNER = "Aofsnorth";
const REPO = "Artidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return Response.json({ error: "Too many requests" }, { status: 429 });
	}

	if (cache && cache.expiresAt > Date.now()) {
		return Response.json(cache.value, {
			headers: {
				"Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
			},
		});
	}

	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "artidor-web",
	};
	if (process.env.GITHUB_TOKEN) {
		headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	}

	try {
		const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
			headers,
			next: { revalidate: 600 },
		});
		if (!res.ok) {
			return Response.json(
				{ error: `GitHub returned ${res.status}` },
				{ status: 502 },
			);
		}
		const raw = (await res.json()) as unknown;
		const parsed = repoSchema.safeParse(raw);
		if (!parsed.success) {
			return Response.json(
				{ error: "Unexpected GitHub response shape" },
				{ status: 502 },
			);
		}

		// Compact projection — only what the UI needs.
		const value = {
			stars: parsed.data.stargazers_count,
			forks: parsed.data.forks_count,
			openIssues: parsed.data.open_issues_count,
			watchers: parsed.data.watchers_count,
			description: parsed.data.description,
			language: parsed.data.language,
			license: parsed.data.license,
			defaultBranch: parsed.data.default_branch,
			updatedAt: parsed.data.updated_at,
			htmlUrl: parsed.data.html_url,
			homepage: parsed.data.homepage,
			topics: parsed.data.topics ?? [],
		};
		cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };

		return Response.json(value, {
			headers: {
				"Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
			},
		});
	} catch (err) {
		// Network failure: return a stale cache if we have one.
		if (cache) {
			return Response.json(cache.value, { status: 200 });
		}
		return Response.json(
			{
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
