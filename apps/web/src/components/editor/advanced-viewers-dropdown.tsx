"use client";

import { ChartHistogramIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { cn } from "@/utils/ui";

/** Header toggle for the docked viewer panel; deliberately not a popup. */
export function AdvancedViewersDropdown() {
	const isOpen = useUiOverlayStore((state) => state.isAdvancedViewersOpen);
	const toggle = useUiOverlayStore((state) => state.toggleAdvancedViewers);

	return (
		<button
			id="advanced-viewers-toggle"
			type="button"
			onClick={toggle}
			aria-label="Advanced viewers"
			aria-controls={isOpen ? "advanced-viewers-panel" : undefined}
			aria-expanded={isOpen}
			aria-pressed={isOpen}
			title={isOpen ? "Hide advanced viewers" : "Show advanced viewers"}
			className={cn(
				"grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:size-11",
				isOpen
					? "border-secondary-border bg-secondary text-foreground"
					: "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			<HugeiconsIcon
				icon={ChartHistogramIcon}
				className="size-4"
				aria-hidden="true"
			/>
		</button>
	);
}
