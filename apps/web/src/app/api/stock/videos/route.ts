/**
 * GET /api/stock/videos?q=<query>&page=<n>&per_page=<n>
 *
 * Searches Pexels for stock videos. Returns a normalized list of
 * video results with preview URLs, duration, and download links.
 *
 * Requires PEXELS_API_KEY env var. Auth-gated: only authenticated
 * users can search (prevents anonymous API key drain).
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { webEnv } from "@/lib/env/web";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PexelsVideoFile {
	id: number;
	quality: string;
	file_type: string;
	width: number;
	height: number;
	fps: number;
	link: string;
}

interface PexelsVideo {
	id: number;
	width: number;
	height: number;
	duration: number;
	user: { name: string };
	video_files: PexelsVideoFile[];
	video_pictures: { id: number; picture: string; nr: number }[];
}

interface PexelsResponse {
	page: number;
	per_page: number;
	total_results: number;
	videos: PexelsVideo[];
}

export async function GET(request: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json({ error: "rate_limited" }, { status: 429 });
	}

	const { searchParams } = new URL(request.url);
	const query = searchParams.get("q") ?? "";
	const page = Math.max(1, Number(searchParams.get("page") ?? 1));
	const perPage = Math.min(30, Math.max(1, Number(searchParams.get("per_page") ?? 15)));

	if (!query.trim()) {
		return NextResponse.json({ results: [], total: 0, page, perPage });
	}

	try {
		const url = new URL("https://api.pexels.com/videos/search");
		url.searchParams.set("query", query);
		url.searchParams.set("page", String(page));
		url.searchParams.set("per_page", String(perPage));
		url.searchParams.set("orientation", "landscape");

		const res = await fetch(url, {
			headers: { Authorization: webEnv.PEXELS_API_KEY },
			signal: AbortSignal.timeout(10_000),
		});

		if (!res.ok) {
			return NextResponse.json(
				{ error: `Pexels API error: ${res.status}` },
				{ status: 502 },
			);
		}

		const data = (await res.json()) as PexelsResponse;

		const results = data.videos.map((v) => {
			const hd = v.video_files.find((f) => f.quality === "hd" && f.width >= 1280);
			const sd = v.video_files.find((f) => f.quality === "sd");
			const thumb = v.video_pictures[0]?.picture;
			return {
				id: v.id,
				title: `Stock video #${v.id}`,
				thumbnail: thumb,
				duration: v.duration,
				width: v.width,
				height: v.height,
				downloadUrl: (hd ?? sd ?? v.video_files[0])?.link ?? "",
				author: v.user.name,
			};
		});

		return NextResponse.json({
			results,
			total: data.total_results,
			page,
			perPage,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Search failed" },
			{ status: 500 },
		);
	}
}
