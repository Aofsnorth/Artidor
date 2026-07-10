import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withContentCollections } from "@content-collections/next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Locks the document down to the origins the app
// actually talks to (surveyed from the codebase): Google OAuth/Drive/fonts,
// the AI providers, analytics, and the image hosts already allowlisted for
// next/image. `blob:`/`data:` are required for canvas previews, media object
// URLs and exported buffers.
//
// Notes / honest trade-offs:
// - `'unsafe-inline'` for styles: the editor sets thousands of inline styles
//   (transforms, gradients, animated keyframes) and Tailwind injects a style
//   tag; a nonce pipeline isn't feasible for those, so inline styles stay open.
// - `'unsafe-inline'` for scripts: Next injects inline bootstrap scripts and we
//   don't run a nonce middleware. This is the pragmatic baseline; tightening to
//   nonces is a follow-up. In dev we also allow `'unsafe-eval'` for HMR.
// - `frame-ancestors 'none'` + `object-src 'none'` + `base-uri 'self'` close
//   the high-value clickjacking / base-tag-injection holes regardless.
const cspDirectives: Record<string, string[]> = {
	"default-src": ["'self'"],
	"script-src": [
		"'self'",
		"'unsafe-inline'",
		"'wasm-unsafe-eval'",
		...(isProd ? [] : ["'unsafe-eval'"]),
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
		// MCP servers can be at any URL (localhost, custom domains, etc).
		// The user adds them manually, so we allow all http/https origins.
		"http:",
		"https:",
		// Puter.js SDK uses WebSocket connections for real-time communication.
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

const contentSecurityPolicy = Object.entries(cspDirectives)
	.map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
	.join("; ");

const nextConfig: NextConfig = {
	turbopack: {
		root: path.resolve(__dirname, "../../"),
	},
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	reactStrictMode: true,
	devIndicators: false,
	// Source maps for the (large) client bundle are shipped weight with no
	// end-user benefit; keep them off in production builds.
	productionBrowserSourceMaps: false,
	output: "standalone",
	allowedDevOrigins: ["127.0.0.1"],
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value:
							"camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
					},
					{ key: "Content-Security-Policy", value: contentSecurityPolicy },
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin-allow-popups",
					},
					{ key: "X-DNS-Prefetch-Control", value: "off" },
				],
			},
		];
	},
	experimental: {
		// Trim barrel imports to per-symbol so only the icons/utilities actually
		// used get bundled. @hugeicons/* is imported across ~79 files and is the
		// biggest win here (Next doesn't auto-optimize it like lucide-react).
		optimizePackageImports: [
			"@hugeicons/core-free-icons",
			"@hugeicons/react",
			"lucide-react",
			"culori",
			"radix-ui",
			"@radix-ui/react-dialog",
			"@radix-ui/react-dropdown-menu",
			"@radix-ui/react-select",
			"@radix-ui/react-tooltip",
			"@radix-ui/react-accordion",
			"@radix-ui/react-checkbox",
			"@radix-ui/react-separator",
			"@radix-ui/react-slot",
			"@radix-ui/react-primitive",
			"date-fns",
			"nanoid",
			"zod",
		],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "plus.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.marblecms.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "api.iconify.design",
			},
			{
				protocol: "https",
				hostname: "api.simplesvg.com",
			},
			{
				protocol: "https",
				hostname: "api.unisvg.com",
			},
			{
				protocol: "https",
				hostname: "cdn.brandfetch.io",
			},
		],
	},
};

export default async () => {
	return withContentCollections(withBotId(nextConfig));
};
