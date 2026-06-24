import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { BotIdClient } from "botid/client";
import { isEnvMissing, webEnv } from "@/lib/env/web";
import { EnvWarningModal } from "@/components/env-warning-modal";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteFont = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

const serifFont = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-serif",
	style: ["normal", "italic"],
});

export const metadata = baseMetaData;

const protectedRoutes = [
	{
		path: "/none",
		method: "GET",
	},
];

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<BotIdClient protect={protectedRoutes} />
			</head>
			<body
				className={`${siteFont.variable} ${serifFont.variable} font-sans antialiased`}
				suppressHydrationWarning
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					// Light mode is wired through the CSS variables in
					// globals.css (`:root` + `.dark` overrides) so the
					// theme toggle actually works. The editor still has
					// a few hand-tuned surfaces (timeline ruler tint,
					// property cards, dialog backdrops) that look best
					// in dark — those will catch up in a follow-up.
					disableTransitionOnChange={true}
				>
					<TooltipProvider>
						<Toaster />
						<Script
							src="https://cdn.databuddy.cc/databuddy.js"
							strategy="afterInteractive"
							async
							data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
							data-disabled={webEnv.NODE_ENV === "development"}
							data-track-attributes={false}
							data-track-errors={true}
							data-track-outgoing-links={false}
							data-track-web-vitals={false}
							data-track-sessions={false}
						/>
						<EnvWarningModal isMissing={isEnvMissing} />
						{children}
						<Analytics />
						<SpeedInsights />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
