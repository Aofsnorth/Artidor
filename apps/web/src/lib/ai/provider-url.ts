import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
	[0x00000000, 0x00ffffff],
	[0x0a000000, 0x0affffff],
	[0x7f000000, 0x7fffffff],
	[0xa9fe0000, 0xa9feffff],
	[0xac100000, 0xac1fffff],
	[0x64400000, 0x647fffff], // 100.64.0.0/10 — CGNAT / shared address space
	[0xc0a80000, 0xc0a8ffff],
	[0xc0000000, 0xc00000ff],
	[0xc0000200, 0xc00002ff],
	[0xc6120000, 0xc613ffff],
	[0xcb007100, 0xcb0071ff],
	[0xe0000000, 0xffffffff],
];

const BLOCKED_HOSTS = new Set([
	"localhost",
	"metadata",
	"metadata.google.internal",
	"metadata.azure.com",
]);

/**
 * Returns true when `rawHostname` must never be used as an outbound target.
 *
 * Centralises every check so the AI provider routes and the web-fetch proxy
 * cannot drift apart again. Accepts the value returned by `URL.hostname`,
 * including the bracketed IPv6 form (`[::1]`).
 */
export function isBlockedOutboundHost(rawHostname: string): boolean {
	const host = stripIpv6Brackets(rawHostname.toLowerCase());
	if (!host) return true;
	if (BLOCKED_HOSTS.has(host)) return true;
	if (host.endsWith(".local") || host.endsWith(".internal")) return true;
	return isPrivateIp(host);
}

/**
 * Boolean counterpart to `assertSafeProviderBaseUrl` for callers that only
 * need a yes/no answer (e.g. the web-fetch proxy). Only http/https are
 * accepted; local, private, and reserved targets are rejected.
 */
export function isSafeOutboundUrl(rawUrl: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return false;
	}
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		return false;
	}
	return !isBlockedOutboundHost(parsed.hostname);
}

export function assertSafeProviderBaseUrl({
	baseUrl,
	allowLocalhost = process.env.NODE_ENV !== "production",
}: {
	baseUrl: string;
	allowLocalhost?: boolean;
}): URL {
	let parsed: URL;
	try {
		parsed = new URL(baseUrl);
	} catch {
		throw new Error("Invalid provider URL.");
	}

	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Provider URL must use HTTP or HTTPS.");
	}

	// `URL.hostname` keeps the brackets around IPv6 literals (`[::1]`),
	// which makes `isIP()` return 0 if they are not stripped. The shared
	// helper handles brackets, IPv4, IPv6, and the reserved-name list.
	if (!allowLocalhost && isBlockedOutboundHost(parsed.hostname)) {
		throw new Error("Provider URL cannot target local or private networks.");
	}

	return parsed;
}

/**
 * DNS rebinding defense — resolve the hostname and verify that the
 * resolved IP is not private/link-local. Without this, an attacker can
 * register a domain that initially resolves to a public IP (passing the
 * sync check in assertSafeProviderBaseUrl) but then resolves to an
 * internal IP (e.g. 169.254.169.254) by the time fetch() connects.
 *
 * There is an inherent TOCTOU gap between this check and the subsequent
 * fetch(), but this makes DNS rebinding significantly harder — the
 * attacker must flip their DNS response in the millisecond between the
 * check and the fetch's own resolution.
 *
 * Only runs in production (when localhost is not allowed). In dev,
 * localhost/private IPs are permitted for local LLM servers (LM Studio,
 * Ollama, etc.).
 */
export async function assertSafeProviderUrlDns(
	url: URL,
	allowLocalhost: boolean = process.env.NODE_ENV !== "production",
): Promise<void> {
	if (allowLocalhost) return;

	const host = stripIpv6Brackets(url.hostname.toLowerCase());
	// Skip DNS resolution for literal IPs — already checked synchronously.
	if (isIP(host) !== 0) return;

	let addresses: string[];
	try {
		const result = await lookup(host, { all: true });
		addresses = result.map((r) => r.address);
	} catch {
		// DNS resolution failed — let the fetch fail naturally with a
		// network error rather than blocking prematurely.
		return;
	}

	for (const addr of addresses) {
		if (isPrivateIp(addr)) {
			throw new Error(
				"Provider URL resolves to a private or local network address.",
			);
		}
	}
}

/**
 * Normalize a provider base URL so it's safe to pass to the OpenAI
 * provider (which appends `/v1/chat/completions`). Strips trailing
 * slashes, removes a trailing `/v1` or `/chat/completions` if the user
 * already included it, and returns the clean host root.
 *
 * Examples:
 *   https://api.openai.com           → https://api.openai.com
 *   https://api.openai.com/v1        → https://api.openai.com
 *   https://api.openai.com/v1/       → https://api.openai.com
 *   https://api.openai.com/chat/completions → https://api.openai.com
 *   https://api.openai.com/v1/chat/completions → https://api.openai.com
 */
export function normalizeProviderBaseUrl(baseUrl: string): string {
	const safeUrl = assertSafeProviderBaseUrl({ baseUrl });
	const trimmed = safeUrl.toString().replace(/\/+$/, "");
	// Strip /v1/chat/completions first (most specific), then /chat/completions,
	// then /v1 — order matters so we don't leave a dangling path.
	let result = trimmed;
	if (result.endsWith("/v1/chat/completions")) {
		result = result.slice(0, -"/v1/chat/completions".length);
	} else if (result.endsWith("/chat/completions")) {
		result = result.slice(0, -"/chat/completions".length);
	} else if (result.endsWith("/v1")) {
		result = result.slice(0, -"/v1".length);
	}
	return result;
}

/**
 * `URL.hostname` returns IPv6 literals wrapped in brackets (`[::1]`), which
 * `net.isIP()` does not recognize. Strip them before any IP classification.
 */
function stripIpv6Brackets(host: string): string {
	return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * Convert an IPv4-mapped IPv6 address (`::ffff:127.0.0.1`, which WHATWG
 * normalizes to `::ffff:7f00:1`) to its dotted IPv4 form so the normal
 * private-range table applies. Returns null for non-mapped addresses.
 */
function mappedIpv4FromIpv6(host: string): string | null {
	const match = /^::ffff:(.+)$/i.exec(host);
	if (!match) return null;
	const tail = match[1].toLowerCase();
	if (isIP(tail) === 4) return tail;
	const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(tail);
	if (!hex) return null;
	const high = Number.parseInt(hex[1], 16);
	const low = Number.parseInt(hex[2], 16);
	return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function isPrivateIp(host: string): boolean {
	const normalized = stripIpv6Brackets(host);
	const family = isIP(normalized);
	if (family === 4) return isPrivateIpv4(normalized);
	if (family === 6) {
		const mapped = mappedIpv4FromIpv6(normalized);
		if (mapped) return isPrivateIpv4(mapped);
		return (
			normalized === "::1" ||
			normalized === "::" ||
			// fc00::/7 — unique local addresses (fc00:: … fdff::)
			/^f[cd]/.test(normalized) ||
			// fe80::/10 — link-local (fe80:: … febf::)
			/^fe[89ab]/.test(normalized)
		);
	}
	return false;
}

function isPrivateIpv4(host: string): boolean {
	const value =
		host.split(".").reduce((acc, part) => {
			return (acc << 8) + Number.parseInt(part, 10);
		}, 0) >>> 0;
	return PRIVATE_IPV4_RANGES.some(
		([start, end]) => value >= start && value <= end,
	);
}
