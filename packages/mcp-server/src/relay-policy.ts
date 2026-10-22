/**
 * Pure policy helpers for the localhost MCP relay.
 *
 * Kept separate from `index.ts` so the security-sensitive decisions
 * (which browsers may connect, which port may be bound) can be unit
 * tested without starting the stdio MCP transport.
 */

export const DEFAULT_RELAY_PORT = 8765;

const PORT_PATTERN = /^\d+$/;

/**
 * Parse `ARTIDOR_MCP_PORT` into a valid TCP port.
 *
 * Rejects NaN, floats, hex/octal strings, negatives, zero and values
 * above 65535 with a message that names the offending value. An unset
 * or empty value falls back to {@link DEFAULT_RELAY_PORT}.
 */
export function parseRelayPort(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === "") return DEFAULT_RELAY_PORT;

	const value = raw.trim();
	if (!PORT_PATTERN.test(value)) {
		throw new Error(
			`Invalid ARTIDOR_MCP_PORT "${raw}": expected an integer between 1 and 65535.`,
		);
	}

	const port = Number(value);
	if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
		throw new Error(
			`Invalid ARTIDOR_MCP_PORT "${raw}": expected an integer between 1 and 65535.`,
		);
	}

	return port;
}

/** Normalize an http(s) URL to its origin, or null when unusable. */
export function normalizeOrigin(value: string | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.origin;
	} catch {
		return null;
	}
}

/**
 * Origins of the hosted Artidor app that may connect to the relay.
 *
 * Read from the same `NEXT_PUBLIC_SITE_URL` the web app uses, plus an
 * explicit `ARTIDOR_APP_ORIGIN` override for deployments that need
 * more than one browser origin.
 */
export function configuredAppOrigins(
	env: NodeJS.ProcessEnv = process.env,
): string[] {
	const candidates = [
		env.NEXT_PUBLIC_SITE_URL,
		env.NEXT_PUBLIC_APP_URL,
		env.ARTIDOR_APP_ORIGIN,
	];
	const origins = new Set<string>();
	for (const candidate of candidates) {
		const origin = normalizeOrigin(candidate);
		if (origin) origins.add(origin);
	}
	return [...origins];
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/**
 * Tauri's production WebView origins (Windows uses http, macOS/Linux tauri:).
 */
const TAURI_HOSTS = new Set(["tauri.localhost"]);

/**
 * Decide whether a WebSocket upgrade `Origin` may impersonate the editor.
 *
 * - Missing/empty Origin is allowed: native MCP clients and non-browser
 *   WebSocket clients do not send one. Browsers always do.
 * - `http://localhost:*`, `http://127.0.0.1:*` and `http://[::1]:*` are
 *   allowed so the local dev app can connect on any port.
 * - The configured `NEXT_PUBLIC_SITE_URL` (and optional
 *   `ARTIDOR_APP_ORIGIN`/`NEXT_PUBLIC_APP_URL`) origin is allowed so the
 *   hosted deployment can connect over https.
 * - Everything else — including the literal `null` origin — is rejected.
 */
export function isAllowedOrigin({
	origin,
	appOrigins = [],
}: {
	origin: string | undefined | null;
	appOrigins?: readonly string[];
}): boolean {
	if (origin === undefined || origin === null || origin === "") return true;

	let parsed: URL;
	try {
		parsed = new URL(origin);
	} catch {
		return false;
	}

	if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname)) {
		return true;
	}

	// The desktop shell loads the same web app from a Tauri origin. It is a
	// native app, not a website, so allow its fixed origins too.
	if (parsed.protocol === "tauri:" && parsed.hostname === "localhost") {
		return true;
	}
	if (
		(parsed.protocol === "http:" || parsed.protocol === "https:") &&
		TAURI_HOSTS.has(parsed.hostname)
	) {
		return true;
	}

	const normalized = parsed.origin;
	return appOrigins.some((allowed) => normalizeOrigin(allowed) === normalized);
}
