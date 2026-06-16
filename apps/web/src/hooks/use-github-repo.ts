/**
 * useGitHubRepo — fetch the live Artidor repo stats from our own
 * /api/github endpoint, with a two-tier cache:
 *
 *   1. localStorage: persistent across page loads, 30 min TTL.
 *   2. SWR-ish stale-while-revalidate: while the data is in cache
 *      we return it immediately and trigger a background refresh.
 *
 * Returns a stable shape: `data` is undefined until the first fetch
 * resolves, then either the parsed payload or null (on error).
 *
 * The component should render a sensible skeleton while `loading` is
 * true; the `formatted` helpers below turn raw numbers into the
 * "40k+" / "350+" style strings the marketing site already uses.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface GitHubRepo {
	stars: number;
	forks: number;
	openIssues: number;
	watchers: number;
	description: string | null;
	language: string | null;
	license: { spdx_id: string | null; name: string | null } | null;
	defaultBranch: string;
	updatedAt: string;
	htmlUrl: string;
	homepage: string | null;
	topics: string[];
}

interface CacheRecord {
	value: GitHubRepo;
	expiresAt: number;
}

const STORAGE_KEY = "artidor-github-repo";
const TTL_MS = 30 * 60 * 1000;

function readCache(): GitHubRepo | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CacheRecord;
		if (!parsed?.value || !parsed.expiresAt) return null;
		if (parsed.expiresAt < Date.now()) return null;
		return parsed.value;
	} catch {
		return null;
	}
}

function writeCache(value: GitHubRepo): void {
	if (typeof window === "undefined") return;
	try {
		const record: CacheRecord = { value, expiresAt: Date.now() + TTL_MS };
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
	} catch {
		// localStorage might be full or disabled; safe to ignore.
	}
}

function formatCompact(n: number): string {
	if (n >= 1_000_000) {
		return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (n >= 1_000) {
		const k = n / 1_000;
		return `${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
	}
	return String(n);
}

export function useGitHubRepo(): {
	data: GitHubRepo | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	formatCompact: (n: number) => string;
	formatted: {
		stars: string;
		forks: string;
		openIssues: string;
	} | null;
} {
	const [data, setData] = useState<GitHubRepo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchRepo = useCallback(async (mode: "fresh" | "background") => {
		if (mode === "fresh") setLoading(true);
		try {
			const res = await fetch("/api/github", {
				cache: mode === "background" ? "force-cache" : "default",
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const json = (await res.json()) as GitHubRepo;
			if (json && typeof json.stars === "number") {
				setData(json);
				writeCache(json);
				setError(null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			if (mode === "fresh") setLoading(false);
		}
	}, []);

	useEffect(() => {
		// Hydrate from localStorage first.
		const cached = readCache();
		if (cached) setData(cached);
		// Always hit the network once on mount — gives us fresh data
		// without blocking the paint on the cached value.
		void fetchRepo(cached ? "background" : "fresh");
	}, [fetchRepo]);

	const refresh = useCallback(() => fetchRepo("fresh"), [fetchRepo]);

	const formatted = data
		? {
				stars: formatCompact(data.stars),
				forks: formatCompact(data.forks),
				openIssues: formatCompact(data.openIssues),
			}
		: null;

	return { data, loading, error, refresh, formatCompact, formatted };
}
