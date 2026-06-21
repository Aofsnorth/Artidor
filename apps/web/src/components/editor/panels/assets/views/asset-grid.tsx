"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/ui";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

/**
 * Shared responsive grid for asset-library views. Every view used to inline
 * the same `repeat(auto-fill, minmax(<size>px, 1fr))` string with slightly
 * different gaps and min-widths; this wrapper makes card sizing/spacing
 * consistent and reads the user's `assetCardSize` preference in one place.
 *
 * `min` floors the column width (templates want a larger floor than the raw
 * card size). `gap` overrides the default spacing for the rare view (e.g.
 * stickers) that needs tighter cells.
 */
export function AssetGrid({
	children,
	min,
	gap = "gap-2.5",
	className,
}: {
	children: ReactNode;
	min?: number;
	gap?: string;
	className?: string;
}) {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const columnMin = min ? Math.max(assetCardSize, min) : assetCardSize;

	return (
		<div
			className={cn("grid", gap, className)}
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${columnMin}px, 1fr))`,
			}}
		>
			{children}
		</div>
	);
}
