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
import { assertSafeProviderUrlDns } from "@/lib/ai/provider-url";
import { getOptionalSession } from "@/lib/auth/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	url: z.string().min(1),
});

const MAX_SIZE = 500 * 1024; // 500 KB
const TIMEOUT_MS = 30_000;

// Hostnames that must never be fetched — they expose cloud metadata or
// resolve to loopback. Kept in sync with the BLOCKED_HOSTS set in
// @/lib/ai/provider-url so both SSRF surfaces share the same denylist.
const BLOCKED_HOSTS = new Set([
	"localhost",
	"metadata.google.internal",
	"metadata",
	"metadata.azure.com", // Azure IMDS
]);

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
	if (BLOCKED_HOSTS.has(hostname)) return false;
	if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
		return false;
	}

	// IPv4 literal — block every private/reserved range, not just a few.
	if (isIpv4Literal(hostname) && isPrivateIpv4(hostname)) return false;

	// IPv6 literal — block loopback, unspecified, ULA (fc00::/7), and
	// link-local (fe80::/10). IPv6 hostnames arrive bracketed in the URL
	// but URL.hostname strips the brackets, so we compare the bare form.
	if (isIpv6Literal(hostname) && isPrivateIpv6(hostname)) return false;

	return true;
}

function isIpv4Literal(host: string): boolean {
	const parts = host.split(".");
	return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p));
}

function isIpv6Literal(host: string): boolean {
	// URL.hostname strips the brackets around IPv6 literals, so a literal
	// contains at least one colon. (Hostnames never contain colons.)
	return host.includes(":");
}

function isPrivateIpv4(host: string): boolean {
	const octets = host.split(".").map((n) => Number.parseInt(n, 10));
	if (octets.length !== 4 || octets.some((n) => !Number.isFinite(n))) {
		return false;
	}
	const [a, b] = octets;
	return (
		a === 0 || // 0.0.0.0/8 — "this network"
		a === 10 || // 10.0.0.0/8 — private
		(a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 — private
		(a === 192 && b === 168) || // 192.168.0.0/16 — private
		(a === 169 && b === 254) || // 169.254.0.0/16 — link-local + cloud metadata
		a === 127 || // 127.0.0.0/8 — loopback
		(a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 — CGNAT
		a >= 224 // 224.0.0.0/4+ — multicast & reserved
	);
}

function isPrivateIpv6(host: string): boolean {
	const h = host.toLowerCase();
	// ::1 loopback, :: unspecified, ::ffff: IPv4-mapped (check embedded v4).
	if (h === "::1" || h === "::") return true;
	// IPv4-mapped IPv6 (::ffff:a.b.c.d) — extract and reuse the IPv4 check.
	const v4mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
	if (v4mapped) return isPrivateIpv4(v4mapped[1]);
	// ULA fc00::/7 (fc* and fd*) and link-local fe80::/10.
	if (h.startsWith("fc") || h.startsWith("fd")) return true;
	if (
		h.startsWith("fe8") ||
		h.startsWith("fe9") ||
		h.startsWith("fea") ||
		h.startsWith("feb")
	) {
		return true;
	}
	return false;
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
	// not private/link-local before fetching. The sync isAllowedUrl check
	// above blocks literal IPs and known-bad hostnames, but a domain can
	// resolve to a private IP at fetch time.
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
