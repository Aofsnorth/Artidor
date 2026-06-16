"use client";

/**
 * GeneratedThumbnail — fallback thumbnail for projects that
 * don't have a real PNG. Renders a soft radial gradient with a
 * monogram centred, the same way Figma renders a file before
 * its cover image loads. Looks designed without ever fetching
 * an asset.
 *
 * Wraps the same `thumbnail-gradient.ts` helper the templates
 * use so every project gets a stable, on-brand colour.
 */

import { thumbnailGradientFor } from "./thumbnail-gradient";

export function GeneratedThumbnail({
	seed,
	className,
}: {
	seed: string;
	className?: string;
}) {
	const gradient = thumbnailGradientFor({ seed });
	return (
		<div
			aria-hidden
			className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
			style={{ background: gradient.background }}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="font-serif text-3xl font-medium italic text-white/80 mix-blend-overlay drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:text-4xl">
					{gradient.monogram}
				</span>
			</div>
			{/* Vignette to lift the centre monogram off the background */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.35)_100%)]" />
		</div>
	);
}
