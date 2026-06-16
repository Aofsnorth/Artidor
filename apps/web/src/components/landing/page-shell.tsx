/**
 * Editorial page-level chrome shared by landing, marketing and
 * long-form content pages. Sets the dark luxury atmosphere on top
 * of the global theme.
 *
 * Backdrop: a hand-picked fantasy artwork (a veiled figure
 * holding a sword on a crystalline base against a cosmic sky).
 * We use a plain CSS `background-image` here — not Next.js Image —
 * so the original JPEG renders at its native quality without
 * Next's re-optimisation pipeline re-compressing it (which was
 * showing visible artefacts when the image was scaled up to fill
 * the viewport). `min-h-screen` keeps the image covering at
 * least the viewport even if the page content is short.
 *
 * Note: this wrapper does NOT have `overflow-hidden` because
 * that would break `position: sticky` on the header.
 */

"use client";

import { type ReactNode, useEffect, useState } from "react";

export function PageShell({
	children,
	variant = "default",
}: {
	children: ReactNode;
	variant?: "default" | "marketing" | "docs";
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<div
			className="relative isolate min-h-screen bg-[#0a0a0c] text-white"
			data-page-shell={variant}
		>
			{/* Fantasy artwork backdrop. Plain CSS background so
			   the original 2084×4632 image renders at full quality
			   (no Next.js re-compression). `background-position:
			   center 30%` keeps the figure in the lower-centre of
			   the visible area on wide screens; the dark cosmic
			   fills the top, which doubles as a "sky" for the
			   sticky header. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-20 min-h-screen"
				style={{
					backgroundImage:
						"url(/wallpaper/hero-fantasy-2x.webp)",
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
					backgroundPosition: "center 30%",
				}}
			/>

			{/* Atmospheric overlays — subtle, on top of the artwork
			   but under the page content. Two layers:
			   1. A top-to-bottom vignette so the sticky header
			      stays legible even when it overlays the figure.
			   2. A bottom-to-mid fade so content landing in the
			      lower portion of the page has air underneath.
			   All absolute so they scroll with the artwork. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 min-h-screen"
				style={{
					background:
						"linear-gradient(180deg, rgba(8,8,10,0.55) 0%, rgba(8,8,10,0.20) 18%, rgba(8,8,10,0.10) 50%, rgba(8,8,10,0.35) 80%, rgba(8,8,10,0.65) 100%)",
				}}
			/>

			{/* Subtle film grain — pure CSS, no asset download. Sits
			   above the artwork + vignette, below the page content,
			   so it adds texture without darkening text. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 min-h-screen opacity-[0.04] mix-blend-overlay"
				style={{
					backgroundImage:
						"radial-gradient(rgba(255,255,255,0.5) 0.5px, transparent 0.6px)",
					backgroundSize: "3px 3px",
				}}
			/>

			<div
				className={`relative transition-opacity duration-700 ${
					mounted ? "opacity-100" : "opacity-0"
				}`}
			>
				{children}
			</div>
		</div>
	);
}
