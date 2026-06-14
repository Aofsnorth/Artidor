import type { Metadata } from "next";
import { SITE_INFO, SITE_URL } from "@/lib/site/brand";

const OG_TITLE = "Artidor \u2014 free, open-source video editor";
const OG_DESCRIPTION =
	"A simple but powerful video editor that gets the job done. In your browser, on your desktop, or on the go. Privacy-first, no paywalls, no upload wait times.";

export const baseMetaData: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: SITE_INFO.title,
		template: `%s \u2014 ${SITE_INFO.title}`,
	},
	description: SITE_INFO.description,
	applicationName: SITE_INFO.title,
	keywords: [
		"video editor",
		"open source",
		"free video editor",
		"browser video editor",
		"privacy",
		"artidor",
		"capcut alternative",
	],
	authors: [{ name: "Artidor" }],
	creator: "Artidor",
	publisher: "Artidor",
	category: "video editing",
	openGraph: {
		type: "website",
		title: OG_TITLE,
		description: OG_DESCRIPTION,
		url: SITE_URL,
		siteName: SITE_INFO.title,
		locale: "en_US",
		determiner: "the",
		images: [
			{
				url: SITE_INFO.openGraphImage,
				width: 1200,
				height: 630,
				type: "image/jpeg",
				alt: "Artidor \u2014 open-source video editor for web and desktop",
				secureUrl: SITE_INFO.openGraphImage,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		site: "@artidorapp",
		creator: "@artidorapp",
		title: OG_TITLE,
		description: OG_DESCRIPTION,
		images: [SITE_INFO.twitterImage],
	},
	pinterest: {
		richPin: false,
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: [{ url: "/favicon.ico" }],
		apple: [
			{ url: "/icons/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
			{ url: "/icons/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
			{ url: "/icons/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
			{ url: "/icons/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
			{
				url: "/icons/apple-icon-114x114.png",
				sizes: "114x114",
				type: "image/png",
			},
			{
				url: "/icons/apple-icon-120x120.png",
				sizes: "120x120",
				type: "image/png",
			},
			{
				url: "/icons/apple-icon-152x152.png",
				sizes: "152x152",
				type: "image/png",
			},
			{
				url: "/icons/apple-icon-180x180.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
	appleWebApp: {
		capable: true,
		title: SITE_INFO.title,
		statusBarStyle: "black-translucent",
	},
	formatDetection: {
		telephone: false,
	},
	manifest: "/manifest.json",
	other: {
		"msapplication-config": "/browserconfig.xml",
		"theme-color": "#0a0a0c",
		"color-scheme": "dark",
		"apple-mobile-web-app-capable": "yes",
		"apple-mobile-web-app-status-bar-style": "black-translucent",
		"apple-mobile-web-app-title": SITE_INFO.title,
		"mobile-web-app-capable": "yes",
	},
};
