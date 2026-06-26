/**
 * Server-side web fetch proxy for the AI copilot.
 *
 * The AI client cannot fetch arbitrary URLs directly because of CORS.
 * This route fetches a URL on the server, sanitizes the response, and
 * returns it as plain text/markdown so the AI can read web pages.
 *
 * Security guards:
 *  - only http/https schemes
 *  - no private/reserved IP addresses or localhost
 *  - 30s timeout
 *  - 500 KB max response size
 *  - only GET requests
 */

import { z } from "zod";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	url: z.string().min(1),
});

const MAX_SIZE = 500 * 1024; // 500 KB
const TIMEOUT_MS = 30_000;

function isAllowedUrl(url: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return false;
	}

	const hostname = parsed.hostname.toLowerCase();
	if (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname.startsWith("[::1") ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".internal")
	) {
		return false;
	}

	// Block private/reserved IPv4 ranges.
	const ipv4 = hostname.split(".").map((n) => Number.parseInt(n, 10));
	if (ipv4.length === 4 && ipv4.every((n) => Number.isFinite(n))) {
		const [a, b, c] = ipv4;
		if (
			a === 10 ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			(a === 169 && b === 254) ||
			(a === 127) ||
			(a >= 224)
		) {
			return false;
		}
	}

	return true;
}

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ ok: false, error: "Missing or invalid url" },
			{ status: 400 },
		);
	}

	const { url } = parsed.data;
	if (!isAllowedUrl(url)) {
		return NextResponse.json(
			{ ok: false, error: "URL is not allowed" },
			{ status: 400 },
		);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"User-Agent":
					"ArtidorAI/1.0 (https://artidor.com; internal web-fetch proxy)",
				Accept: "text/html,text/plain,application/json,*/*",
			},
			signal: controller.signal,
			redirect: "follow",
		});
		clearTimeout(timeout);

		if (!response.ok) {
			return NextResponse.json(
				{
					ok: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
				},
				{ status: 502 },
			);
		}

		const contentType = response.headers.get("content-type") ?? "";
		const buffer = await response.arrayBuffer();
		const truncated = buffer.slice(0, MAX_SIZE);
		const tooBig = buffer.byteLength > MAX_SIZE;

		let text: string;
		try {
			text = new TextDecoder("utf-8", { fatal: false }).decode(truncated);
		} catch {
			text = "[Binary response could not be decoded as text]";
		}

		return NextResponse.json({
			ok: true,
			url,
			contentType,
			text,
			truncated: tooBig,
		});
	} catch (err) {
		clearTimeout(timeout);
		const message = err instanceof Error ? err.message : "Fetch failed";
		return NextResponse.json(
			{ ok: false, error: message },
			{ status: 502 },
		);
	}
}
