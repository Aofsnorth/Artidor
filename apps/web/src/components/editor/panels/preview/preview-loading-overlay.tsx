"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/ui";

/**
 * Non-blocking loading overlay for the preview canvas. Appears when the
 * render loop is taking longer than the configured threshold (slow video
 * decode, first-seek on a large file, compositor warm-up). Purely visual
 * — `pointer-events: none` so it never blocks interaction, playback, or
 * audio. The 150 ms opacity transition ensures sub-threshold renders
 * never flash the overlay.
 */
export function PreviewLoadingOverlay({ isVisible }: { isVisible: boolean }) {
	return (
		<div
			aria-hidden={!isVisible}
			className={cn(
				"pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-150",
				isVisible ? "opacity-100" : "opacity-0",
			)}
		>
			<div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
				<Spinner className="size-3.5 text-white/80" />
				<span className="text-[0.7rem] font-medium text-white/80">
					Rendering…
				</span>
			</div>
		</div>
	);
}
