"use client";

/**
 * CategoryBar — a horizontal, scrollable row of category chips for filtering
 * an asset panel's grid (effects, text, elements, overlays, audio, motion,
 * adjust, templates). CapCut/Canva-style: an "All" chip plus one chip per
 * category; selecting one filters the grid. Generic — the categories are
 * passed in, so every panel reuses this one component.
 */

import { cn } from "@/utils/ui";

export const ALL_CATEGORY = "All";

export function CategoryBar({
	categories,
	value,
	onChange,
	className,
}: {
	/** Category labels, in display order. "All" is prepended automatically. */
	categories: readonly string[];
	value: string;
	onChange: (category: string) => void;
	className?: string;
}) {
	const items = [ALL_CATEGORY, ...categories];
	return (
		<div
			className={cn(
				"scrollbar-hidden -mx-0.5 flex items-center gap-1.5 overflow-x-auto px-0.5 pb-1",
				className,
			)}
		>
			{items.map((category) => {
				const active = category === value;
				return (
					<button
						key={category}
						type="button"
						onClick={() => onChange(category)}
						className={cn(
							"shrink-0 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium whitespace-nowrap transition-colors",
							active
								? "border-white/15 bg-white/[0.14] text-white"
								: "border-transparent bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/80",
						)}
					>
						{category}
					</button>
				);
			})}
		</div>
	);
}

/**
 * Filters a list of items by a selected category. Items expose their category
 * via `getCategory`; "All" returns everything. Case-insensitive match.
 */
export function filterByCategory<T>({
	items,
	category,
	getCategory,
}: {
	items: T[];
	category: string;
	getCategory: (item: T) => string | undefined;
}): T[] {
	if (category === ALL_CATEGORY) return items;
	const target = category.toLowerCase();
	return items.filter((item) => getCategory(item)?.toLowerCase() === target);
}
