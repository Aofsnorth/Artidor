"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { transitions as presetTransitions } from "@/lib/presets/transitions";
import { transitionsRegistry } from "@/lib/transitions";
import { useEditor } from "@/hooks/use-editor";
import { useTransitions } from "@/hooks/use-transitions";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { getTransitionPalettes } from "./components/procedural-preview";
import type { TransitionDefinition } from "@/lib/transitions";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";

const TRANSITION_CATEGORIES = [
	"Fade",
	"Slide",
	"Push",
	"Zoom",
	"Rotate",
	"Wipe",
	"Morph",
	"Glitch",
	"Liquid",
	"Light",
	"3D",
	"Geometric",
] as const;

const PRESET_TRANSITION_CATEGORY_BY_TYPE = new Map(
	presetTransitions.map((transition) => {
		const category = TRANSITION_CATEGORIES.find((candidate) =>
			transition.keywords.includes(candidate.toLowerCase()),
		);
		return [transition.type, category ?? transition.category];
	}),
);

export function TransitionsView() {
	const transitions = useMemo(() => {
		const existing = transitionsRegistry.getAll();
		const existingTypes = new Set(
			existing.map((transition) => transition.type),
		);
		return [
			...existing,
			...presetTransitions.filter(
				(transition) => !existingTypes.has(transition.type),
			),
		];
	}, []);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: transitions,
				category,
				getCategory: (def) =>
					PRESET_TRANSITION_CATEGORY_BY_TYPE.get(def.type) ?? def.category,
			}),
		[transitions, category],
	);

	return (
		<PanelView
			title="Transitions"
			actions={<PopOutAction id="transitions" title="Transitions" />}
		>
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
				<AssetGrid gap="gap-2">
					{filtered.map((def) => (
						<TransitionItem key={def.type} definition={def} />
					))}
				</AssetGrid>
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
		// biome-ignore lint/a11y/useSemanticElements: card contains nested add button, so outer button would be invalid HTML
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

function getTransitionPhotoUrl(
	_type: string,
	_plate: "A" | "B",
): null {
	// Backwards-compat: older call sites still reach for this. The
	// transition preview now uses pure CSS via `getTransitionPalettes`
	// — no more `source.unsplash.com` fetches.
	return null;
}

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function extractKeyframeName(css: string): string | null {
	return css.match(/@keyframes\s+([^{\s]+)/)?.[1] ?? null;
}

function SceneThumbnail({
	seed,
	variant,
}: {
	seed: number;
	variant: "from" | "to";
}) {
	void seed;
	const isTo = variant === "to";
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div
				className="absolute inset-0"
				style={{
					background: isTo
						? "linear-gradient(180deg, #b9c7d4 0%, #53616f 54%, #17202a 100%)"
						: "linear-gradient(180deg, #d8c4a2 0%, #806a4c 54%, #211912 100%)",
				}}
			/>
			<div className="absolute left-[8%] top-[12%] size-[18%] rounded-full bg-white/70 blur-[1px]" />
			<div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(155deg,transparent_0_28%,rgba(15,23,42,0.92)_29%_58%,transparent_59%),linear-gradient(25deg,transparent_0_38%,rgba(30,41,59,0.88)_39%_70%,transparent_71%)]" />
			<div className="absolute bottom-0 left-0 h-[24%] w-full bg-[linear-gradient(180deg,rgba(20,83,45,0.18),rgba(20,83,45,0.78))]" />
			<div className="absolute bottom-[18%] left-[12%] h-[22%] w-[18%] rounded-t-full bg-black/45" />
			<div className="absolute bottom-[19%] left-[16%] size-[8%] rounded-full bg-black/50" />
			<div className="absolute bottom-[16%] right-[12%] h-[18%] w-[26%] rounded-sm bg-white/18 shadow-[0_0_0_1px_rgba(255,255,255,0.16)]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(0,0,0,0.34)_100%)]" />
		</div>
	);
}

function TransitionPreview({
	definition,
}: {
	definition: TransitionDefinition;
}) {
	const id = useId().replaceAll(":", "");
	const keyframeCss = definition.previewStyle({
		duration: 1000,
		direction: "cross",
	});
	const keyframeName = extractKeyframeName(keyframeCss);
	const scopedName = keyframeName
		? `${keyframeName}-${id}`
		: `transition-preview-${id}`;
	const scopedCss = keyframeName
		? keyframeCss.replaceAll(keyframeName, scopedName)
		: keyframeCss;

	const photoA = getTransitionPhotoUrl(definition.type, "A");
	const photoB = getTransitionPhotoUrl(definition.type, "B");
	void photoA;
	void photoB;
	const { b: paletteB } = getTransitionPalettes(definition.type);
	const seed = hashString(definition.type);
	const usesColorEffect = /glitch|rgb|prism|light|flash|burn|color/i.test(
		`${definition.type} ${definition.name}`,
	);

	return (
		<div
			className="relative mx-auto mt-2 size-full overflow-hidden rounded-sm border border-white/10 bg-zinc-950"
			style={{ width: "80%", height: "80%" }}
		>
			<SceneThumbnail seed={seed} variant="from" />
			<div
				aria-hidden
				className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				style={{
					animation: `${scopedName} 1.35s ${definition.easing} infinite alternate`,
				}}
			>
				<SceneThumbnail seed={seed + 37} variant="to" />
			</div>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-screen transition-opacity duration-200 group-hover:opacity-100"
				style={{
					background: usesColorEffect
						? paletteB.background
						: "linear-gradient(120deg, transparent, rgba(255,255,255,0.18), transparent)",
				}}
			/>
			<div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.2)_45%,transparent_70%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
			<style>{scopedCss}</style>
		</div>
	);
}
