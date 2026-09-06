"use client";

import { memo, useMemo, type CSSProperties } from "react";
import { MarqueeText } from "@/components/ui/marquee-text";
import { getSceneImageUrlForId } from "./procedural-preview";

/** Catalog labels share alignment and spacing; MarqueeText owns fitting/motion. */
export function CatalogPreviewTitle({ children }: { children: string }) {
	return (
		<MarqueeText className="text-foreground relative z-10 block w-full min-w-0 shrink-0 px-2 text-center text-[0.7rem] font-medium leading-5">
			{children}
		</MarqueeText>
	);
}

/** Static, memoized original artwork; animate a wrapper, not the SVG contents. */
export const CatalogPreviewScene = memo(function CatalogPreviewScene({
	seed,
	style,
}: {
	seed: string;
	style?: CSSProperties;
}) {
	const source = useMemo(() => getSceneImageUrlForId(seed), [seed]);
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 bg-cover bg-center"
			style={{ backgroundImage: `url("${source}")`, ...style }}
		/>
	);
});
