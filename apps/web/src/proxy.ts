/**
 * CSP nonce proxy — generates a per-request nonce and injects it into
 * the Content-Security-Policy header for the editor route only.
 *
 * Why editor-only:
 *  - Next.js requires dynamic rendering when nonces are used (no SSG/ISR).
 *    The editor is already dynamic (per-project, client-state heavy), so
 *    adding a nonce there has no performance cost.
 *  - Landing page, docs, changelog stay statically rendered with the
 *    broader CSP defined in next.config.ts headers().
 *
 * Development keeps `'unsafe-inline'` because Next dev/HMR emits inline
 * bootstrap snippets without the request nonce. Production keeps the nonce
 * path for framework scripts.
 *
 * Next.js auto-attaches the nonce to framework scripts, page bundles,
 * and inline scripts during SSR when it sees `nonce-{value}` in the CSP
 * header — no manual per-script nonce needed.
 *
 * TESTING REQUIREMENT: This proxy was not tested with a live build.
 * Third-party components (BotIdClient, Vercel Analytics, SpeedInsights)
 * that inject their own inline scripts may break under nonce-based CSP.
 * If the editor shows CSP violations in the browser console after
 * deploying, check whether BotIdClient/Analytics inject inline scripts
 * that need nonce support. The fix would be to pass the nonce from
 * `headers()` to those components' script tags, or to self-host them.
 * As a last resort, delete this file to fall back to the broader CSP
 * in next.config.ts (which keeps `'unsafe-inline'` for scripts).
 */
import { type NextRequest, NextResponse } from "next/server";

// Reuse the same directive set as next.config.ts but swap script-src
// to nonce-based. Imported lazily to avoid pulling next.config into the
// proxy bundle (proxy runs on every editor request).
const EDITOR_CSP_NONCE = (nonce: string, isDev: boolean) => {
	const directives: Record<string, string[]> = {
		"default-src": ["'self'"],
		"script-src": [
			"'self'",
			...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : [`'nonce-${nonce}'`]),
			"'wasm-unsafe-eval'",
			// Domain allowlist (no 'strict-dynamic' so these are honored):
			// third-party scripts from these origins run without a nonce.
			// Next.js framework scripts + inline scripts get the nonce
			// automatically during SSR.
			"https://cdn.databuddy.cc",
			"https://cdn.jsdelivr.net",
			"https://va.vercel-scripts.com",
			"https://js.puter.com",
		],
		"style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
		"img-src": [
			"'self'",
			"data:",
			"blob:",
			"https://*.googleusercontent.com",
			"https://*.unsplash.com",
			"https://images.marblecms.com",
			"https://avatars.githubusercontent.com",
			"https://cdn.brandfetch.io",
			"https://api.iconify.design",
			"https://api.simplesvg.com",
			"https://api.unisvg.com",
			"https://drive.google.com",
			"https://drive.usercontent.google.com",
		],
		"font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
		"media-src": [
			"'self'",
			"blob:",
			"data:",
			"https://drive.usercontent.google.com",
		],
		"connect-src": [
			"'self'",
			"blob:",
			"data:",
			"http:",
			"https:",
			"ws:",
			"wss:",
			"https://www.googleapis.com",
			"https://accounts.google.com",
			"https://drive.google.com",
			"https://drive.usercontent.google.com",
			"https://api.openai.com",
			"https://api.anthropic.com",
			"https://fal.ai",
			"https://*.fal.ai",
			"https://api.github.com",
			"https://freesound.org",
			"https://api.marblecms.com",
			"https://cdn.brandfetch.io",
			"https://basket.databuddy.cc",
			"https://cdn.databuddy.cc",
			"https://*.vercel-scripts.com",
			"https://vitals.vercel-insights.com",
			"https://js.puter.com",
			"https://api.puter.com",
			"https://*.puter.com",
		],
		"frame-src": [
			"'self'",
			"https://drive.google.com",
			"https://accounts.google.com",
		],
		"worker-src": ["'self'", "blob:"],
		"frame-ancestors": ["'none'"],
		"object-src": ["'none'"],
		"base-uri": ["'self'"],
		"form-action": ["'self'"],
	};

	return Object.entries(directives)
		.map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
		.join("; ");
};

export function proxy(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
	const isDev = process.env.NODE_ENV === "development";
	const csp = EDITOR_CSP_NONCE(nonce, isDev);

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);
	// Set CSP on the request so Next.js SSR can extract the nonce and
	// auto-attach it to inline scripts during render.
	requestHeaders.set("Content-Security-Policy", csp);

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
	// Also set CSP on the response so the browser enforces it.
	response.headers.set("Content-Security-Policy", csp);
	// Preserve the other security headers from next.config.ts headers().
	response.headers.set(
		"Strict-Transport-Security",
		"max-age=63072000; includeSubDomains; preload",
	);
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
	);
	response.headers.set(
		"Cross-Origin-Opener-Policy",
		"same-origin-allow-popups",
	);
	response.headers.set("X-DNS-Prefetch-Control", "off");

	return response;
}

export const config = {
	// Only run on the editor route — it's already dynamically rendered,
	// so the nonce requirement adds no performance cost. All other routes
	// (landing, docs, changelog, api) keep the broader CSP from
	// next.config.ts headers() and stay statically renderable.
	matcher: [
		{
			source: "/editor/:path*",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
};
