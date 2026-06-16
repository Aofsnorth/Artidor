"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { transitionsRegistry } from "@/lib/transitions";
import { useEditor } from "@/hooks/use-editor";
import { useTransitions } from "@/hooks/use-transitions";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import type { TransitionDefinition } from "@/lib/transitions";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const TRANSITION_CATEGORIES = [
	"Fade",
	"Slide",
	"Zoom",
	"Wipe",
	"Glitch",
] as const;

export function TransitionsView() {
	const transitions = transitionsRegistry.getAll();
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: transitions,
				category,
				getCategory: (def) => def.category,
			}),
		[transitions, category],
	);

	return (
		<PanelView title="Transitions">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Add a transition between two adjacent clips. Select two clips on the
					same track, then choose a transition.
				</p>
				<CategoryBar
					categories={TRANSITION_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
					}}
				>
					{filtered.map((def) => (
						<TransitionItem key={def.type} definition={def} />
					))}
				</div>
			</div>
		</PanelView>
	);
}

function TransitionItem({ definition }: { definition: TransitionDefinition }) {
	const editor = useEditor();
	const { addTransition } = useTransitions();
	const [busy, setBusy] = useState(false);

	const handleAdd = useCallback(async () => {
		setBusy(true);
		try {
			const selected = editor.selection.getSelectedElements();
			if (selected.length < 2) {
				toast.error("Select two adjacent clips first", {
					description: "Hold Shift and click on each clip on the timeline.",
				});
				return;
			}

			const sorted = [...selected].sort((a, b) => {
				const aTrack = editor.timeline.getTrackById({ trackId: a.trackId });
				const bTrack = editor.timeline.getTrackById({ trackId: b.trackId });
				const aEl = aTrack?.elements.find((e) => e.id === a.elementId);
				const bEl = bTrack?.elements.find((e) => e.id === b.elementId);
				return (aEl?.startTime ?? 0) - (bEl?.startTime ?? 0);
			});

			if (sorted.length < 2) {
				toast.error("Could not find selected clips");
				return;
			}

			const first = sorted[0];
			const second = sorted[1];
			if (!first || !second) {
				toast.error("Select two clips");
				return;
			}

			const firstTrack = editor.timeline.getTrackById({
				trackId: first.trackId,
			});
			const firstEl = firstTrack?.elements.find(
				(e) => e.id === first.elementId,
			);
			if (!firstEl) {
				toast.error("First clip not found");
				return;
			}

			const startTime = firstEl.startTime + firstEl.duration;
			const duration = Math.min(
				definition.defaultDuration,
				Math.max(definition.minDuration, TICKS_PER_SECOND),
			);

			addTransition({
				transitionType: definition.type,
				fromTrackId: first.trackId,
				fromElementId: first.elementId,
				toTrackId: second.trackId,
				toElementId: second.elementId,
				startTime,
				duration,
			});

			toast.success(`${definition.name} added`, {
				description: "Transition inserted between the two clips.",
			});
		} catch (error) {
			toast.error("Failed to add transition", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setBusy(false);
		}
	}, [definition, editor, addTransition]);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleAdd}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleAdd();
				}
			}}
			className={`asset-preview-container group ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
		>
			<div className="asset-preview-overlay" />

			<TransitionPreview definition={definition} />
			<span className="text-foreground z-10 w-full truncate px-2 text-[0.7rem] font-medium drop-shadow-md">
				{definition.name}
			</span>
			<div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					size="icon"
					variant="secondary"
					className="size-5 bg-black/50 hover:bg-black/80 border border-white/10"
					aria-label={`Add ${definition.name}`}
					onClick={(e) => {
						e.stopPropagation();
						handleAdd();
					}}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3 text-cyan-400" />
				</Button>
			</div>
		</div>
	);
}

function TransitionPreview({
	definition,
}: {
	definition: TransitionDefinition;
}) {
	return (
		<div
			className="relative size-full overflow-hidden rounded-sm mx-auto mt-2"
			style={{ width: "80%", height: "80%" }}
		>
			<div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-indigo-500/80 to-purple-500/80" />
			<div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-tl from-cyan-400/80 to-blue-500/80" />
			<div
				className="absolute inset-0 z-10"
				style={{
					animation: `preview-${definition.type} 2s ease-in-out infinite alternate`,
				}}
			/>
			<style>
				{definition.previewStyle({ duration: 1000, direction: "cross" })}
			</style>
		</div>
	);
}
