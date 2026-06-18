import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withContentCollections } from "@content-collections/next";
import path from "node:path";

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

export default withContentCollections(withBotId(nextConfig));
