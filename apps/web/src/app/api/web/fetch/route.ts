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
 *  - 30s timeout (headers and body read)
 *  - 500 KB max response size, enforced while streaming (413 on overflow)
 *  - only GET requests
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import {
	assertSafeProviderUrlDns,
	isSafeOutboundUrl,
} from "@/lib/ai/provider-url";
import { getOptionalSession } from "@/lib/auth/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	url: z.string().min(1),
});

const MAX_SIZE = 500 * 1024; // 500 KB
const TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

/**
 * Fetches `startUrl` while re-validating every redirect hop.
 *
 * Native `redirect: "follow"` would let an allowed public URL bounce the
 * server to a private address (e.g. cloud metadata) *after* the initial
 * check, so redirects are followed manually and each target is re-checked.
 */
async function fetchWithValidatedRedirects(
	startUrl: string,
	init: Omit<RequestInit, "redirect">,
): Promise<Response> {
	let currentUrl = startUrl;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!isSafeOutboundUrl(currentUrl)) {
			throw new Error("Redirect target is not allowed");
		}
		await assertSafeProviderUrlDns(new URL(currentUrl));
		const response = await fetch(currentUrl, {
			...init,
			redirect: "manual",
		});
		if (response.status < 300 || response.status >= 400) return response;
		const location = response.headers.get("location");
		if (!location) return response;
		currentUrl = new URL(location, currentUrl).toString();
	}
	throw new Error("Too many redirects");
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
	if (!isSafeOutboundUrl(url)) {
		return NextResponse.json(
			{ ok: false, error: "URL is not allowed" },
			{ status: 400 },
		);
	}

	// Auth check — the web-fetch proxy must not be usable anonymously.
	const session = await getOptionalSession();
	if (!session) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	// Rate limit — this route downloads up to 500 KB per request; without
	// a cap, an authenticated caller could spam it to exhaust server
	// bandwidth and outbound connections.
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json(
			{ ok: false, error: "Too many requests" },
			{ status: 429 },
		);
	}

	// DNS rebinding defense — resolve the hostname and verify the IP is
	// not private/link-local before fetching. The sync isSafeOutboundUrl
	// check above blocks literal IPs and known-bad hostnames, but a domain
	// can resolve to a private IP at fetch time.
	try {
		await assertSafeProviderUrlDns(new URL(url));
	} catch {
		return NextResponse.json(
			{ ok: false, error: "URL resolves to a blocked address" },
			{ status: 400 },
		);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetchWithValidatedRedirects(url, {
			method: "GET",
			headers: {
				"User-Agent":
					"ArtidorAI/1.0 (https://artidor.com; internal web-fetch proxy)",
				Accept: "text/html,text/plain,application/json,*/*",
			},
			signal: controller.signal,
		});

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
		const declaredLength = Number.parseInt(
			response.headers.get("content-length") ?? "",
			10,
		);
		// Reject an oversized body before a single byte of it is read.
		if (Number.isFinite(declaredLength) && declaredLength > MAX_SIZE) {
			return NextResponse.json(
				{
					ok: false,
					error: `Response is larger than the ${MAX_SIZE / 1024} KB limit.`,
				},
				{ status: 413 },
			);
		}

		// Read the body through the reader and stop the moment it crosses
		// the cap. `arrayBuffer()` would buffer the ENTIRE upstream response
		// first and only then slice, so a 500 MB page cost 500 MB of server
		// memory and 500 MB of egress to return 500 KB — and a lying
		// `content-length` could make that arbitrarily large. Oversized
		// bodies are now refused outright (413) instead of answered with a
		// silently truncated document.
		const reader = response.body?.getReader();
		if (!reader) {
			return NextResponse.json(
				{ ok: true, url, contentType, text: "" },
				{ status: 200 },
			);
		}
		const chunks: Uint8Array[] = [];
		let received = 0;
		let tooBig = false;
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				if (!value) continue;
				received += value.byteLength;
				if (received > MAX_SIZE) {
					tooBig = true;
					break;
				}
				chunks.push(value);
			}
		} finally {
			// Releases the upstream connection; a no-op once fully drained.
			await reader.cancel().catch(() => {});
		}
		if (tooBig) {
			return NextResponse.json(
				{
					ok: false,
					error: `Response exceeded the ${MAX_SIZE / 1024} KB limit.`,
				},
				{ status: 413 },
			);
		}

		let text: string;
		try {
			// `{ stream: true }` keeps a multi-byte character that straddles
			// two chunks intact, so the bytes never need a concatenated copy.
			const decoder = new TextDecoder("utf-8", { fatal: false });
			text = "";
			for (const chunk of chunks) {
				text += decoder.decode(chunk, { stream: true });
			}
			text += decoder.decode();
		} catch {
			text = "[Binary response could not be decoded as text]";
		}

		return NextResponse.json({
			ok: true,
			url,
			contentType,
			text,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Fetch failed";
		return NextResponse.json({ ok: false, error: message }, { status: 502 });
	} finally {
		// The deadline now covers the streamed body read as well as the
		// response headers, so a slow upstream cannot hold the route open.
		clearTimeout(timeout);
	}
}
