"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";

function ViewerLoading() {
	return <p className="p-3 text-xs text-muted-foreground">Loading viewer…</p>;
}

const ScopesCard = dynamic(
	() =>
		import("./panels/assets/views/components/scopes").then((m) => m.ScopesCard),
	{ ssr: false, loading: ViewerLoading },
);

/**
 * Advanced viewers — diagnostics only.
 *
 * This panel used to host an "Artidor Adjust" grading surface alongside the
 * scopes, which duplicated the inspector's Adjust tab control for control:
 * the same panels, the same effects, in a second place, free to drift out of
 * sync. Grading lives in the inspector, where it is one tab among the other
 * per-element tools; what is genuinely useful HERE is the layer you cannot
 * fit into a narrow inspector column — full-width signal analysis.
 *
 * The scope card carries waveform, vectorscope, RGB parade and histogram,
 * all fed by the same downsampled preview frame.
 */
export function AdvancedViewersPanel() {
	const setOpen = useUiOverlayStore((state) => state.setAdvancedViewersOpen);
	const close = () => {
		setOpen(false);
		document.getElementById("advanced-viewers-toggle")?.focus();
	};

	return (
		<section
			id="advanced-viewers-panel"
			aria-labelledby="advanced-viewers-heading"
			className="panel glass-strong flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/90 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
		>
			<header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-linear-to-b from-white/4.5 to-transparent px-3.5 py-2.5">
				<h2
					id="advanced-viewers-heading"
					className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85"
				>
					Advanced viewers
				</h2>
				<button
					type="button"
					onClick={close}
					aria-label="Close advanced viewers"
					className="grid size-7 shrink-0 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 motion-reduce:transition-none pointer-coarse:size-11"
				>
					<HugeiconsIcon
						icon={Cancel01Icon}
						className="size-4"
						aria-hidden="true"
					/>
				</button>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-linear-to-b from-transparent to-black/12 p-3">
				<ScopesCard />
			</div>
		</section>
	);
}
