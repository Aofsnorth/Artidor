import { isIP } from "node:net";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
	[0x00000000, 0x00ffffff],
	[0x0a000000, 0x0affffff],
	[0x7f000000, 0x7fffffff],
	[0xa9fe0000, 0xa9feffff],
	[0xac100000, 0xac1fffff],
	[0xc0a80000, 0xc0a8ffff],
	[0xc0000000, 0xc00000ff],
	[0xc0000200, 0xc00002ff],
	[0xc6120000, 0xc613ffff],
	[0xcb007100, 0xcb0071ff],
	[0xe0000000, 0xffffffff],
];

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

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

	const host = parsed.hostname.toLowerCase();
	if (!allowLocalhost && (BLOCKED_HOSTS.has(host) || isPrivateIp(host))) {
		throw new Error("Provider URL cannot target local or private networks.");
	}

	return parsed;
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

function isPrivateIp(host: string): boolean {
	const family = isIP(host);
	if (family === 4) return isPrivateIpv4(host);
	if (family === 6) {
		return (
			host === "::1" ||
			host === "::" ||
			host.startsWith("fc") ||
			host.startsWith("fd") ||
			host.startsWith("fe80:")
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
