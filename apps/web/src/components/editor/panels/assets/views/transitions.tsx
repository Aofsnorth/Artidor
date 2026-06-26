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
	const isTo = variant === "to";
	// Pick a scene variant from the seed so each transition shows a
	// different pair of backgrounds. 6 variants × 2 directions = 12
	// distinct looks, so adjacent cards in the grid never repeat.
	const variantIndex = (seed + (isTo ? 37 : 0)) % 6;
	return (
		<div className="absolute inset-0 overflow-hidden">
			<SceneVariant index={variantIndex} />
		</div>
	);
}

/**
 * Six visually distinct scene backgrounds so transition previews don't
 * all look the same. Each variant has a different colour palette and
 * silhouette arrangement — landscape, cityscape, portrait, abstract,
 * ocean, sunset — so the A→B crossfade actually reads as a scene change.
 */
function SceneVariant({ index }: { index: number }) {
	switch (index) {
		case 0:
			// Landscape — warm golden hour
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, #f59e0b 0%, #f97316 30%, #c2410c 60%, #1c1917 100%)",
						}}
					/>
					<div className="absolute left-[15%] top-[18%] size-[16%] rounded-full bg-yellow-200/80 blur-[1px]" />
					<div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(155deg,transparent_0_28%,rgba(28,25,23,0.92)_29%_58%,transparent_59%),linear-gradient(25deg,transparent_0_38%,rgba(67,20,7,0.88)_39%_70%,transparent_71%)]" />
					<div className="absolute bottom-0 left-0 h-[22%] w-full bg-[linear-gradient(180deg,rgba(120,53,15,0.2),rgba(120,53,15,0.7))]" />
					<div className="absolute bottom-[16%] left-[14%] h-[20%] w-[16%] rounded-t-full bg-black/40" />
					<div className="absolute bottom-[15%] right-[16%] h-[18%] w-[22%] rounded-t-full bg-black/35" />
				</div>
			);
		case 1:
			// Cityscape — cool blue night
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, #1e3a8a 0%, #3730a3 35%, #1e293b 65%, #0f172a 100%)",
						}}
					/>
					<div className="absolute left-[70%] top-[10%] size-[12%] rounded-full bg-slate-300/60 blur-[1px]" />
					<div className="absolute bottom-0 left-0 h-[55%] w-full bg-[linear-gradient(180deg,rgba(15,23,42,0.3),rgba(15,23,42,0.9))]" />
					<div className="absolute bottom-[10%] left-[8%] h-[35%] w-[10%] bg-slate-700/80" />
					<div className="absolute bottom-[10%] left-[20%] h-[45%] w-[12%] bg-slate-600/80" />
					<div className="absolute bottom-[10%] left-[34%] h-[30%] w-[14%] bg-slate-700/70" />
					<div className="absolute bottom-[10%] left-[50%] h-[50%] w-[11%] bg-slate-600/80" />
					<div className="absolute bottom-[10%] left-[63%] h-[38%] w-[13%] bg-slate-700/75" />
					<div className="absolute bottom-[10%] left-[78%] h-[42%] w-[12%] bg-slate-600/80" />
					{/* Windows */}
					<div className="absolute bottom-[20%] left-[10%] size-[3%] bg-amber-300/70" />
					<div className="absolute bottom-[30%] left-[22%] size-[3%] bg-amber-300/60" />
					<div className="absolute bottom-[35%] left-[52%] size-[3%] bg-amber-300/70" />
					<div className="absolute bottom-[25%] left-[64%] size-[3%] bg-amber-300/50" />
				</div>
			);
		case 2:
			// Portrait — studio warm/sepia
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, #78350f 0%, #92400e 40%, #451a03 75%, #1c1917 100%)",
						}}
					/>
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.25),transparent_60%)]" />
					<div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 h-[45%] w-[28%] rounded-t-full bg-amber-900/60" />
					<div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 size-[14%] rounded-full bg-amber-800/70" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
				</div>
			);
		case 3:
			// Abstract — vibrant teal/magenta
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(135deg, #0d9488 0%, #0891b2 30%, #7c3aed 65%, #db2777 100%)",
						}}
					/>
					<div className="absolute left-[10%] top-[15%] size-[30%] rounded-full bg-cyan-300/30 blur-[6px]" />
					<div className="absolute right-[10%] bottom-[15%] size-[25%] rounded-full bg-fuchsia-400/30 blur-[6px]" />
					<div className="absolute left-[40%] top-[40%] h-[20%] w-[20%] rotate-45 bg-white/15" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.2)_100%)]" />
				</div>
			);
		case 4:
			// Ocean — deep blue/teal
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, #38bdf8 0%, #0ea5e9 25%, #0c4a6e 60%, #082f49 100%)",
						}}
					/>
					<div className="absolute left-[60%] top-[8%] size-[14%] rounded-full bg-white/80 blur-[1px]" />
					<div className="absolute inset-x-0 top-[45%] h-[2px] bg-white/20" />
					<div className="absolute inset-x-0 top-[52%] h-[1px] bg-white/15" />
					<div className="absolute bottom-0 left-0 h-[40%] w-full bg-[linear-gradient(180deg,rgba(8,47,73,0.3),rgba(8,47,73,0.85))]" />
					<div className="absolute bottom-[8%] left-[20%] h-[12%] w-[60%] rounded-t-full bg-cyan-900/50" />
				</div>
			);
		case 5:
			// Sunset — pink/purple dramatic
			return (
				<div className="absolute inset-0">
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, #fbbf24 0%, #f43f5e 25%, #a855f7 55%, #1e1b4b 100%)",
						}}
					/>
					<div className="absolute left-[20%] top-[30%] size-[35%] rounded-full bg-orange-200/40 blur-[8px]" />
					<div className="absolute inset-x-0 bottom-0 h-[35%] bg-[linear-gradient(180deg,rgba(30,27,75,0.3),rgba(30,27,75,0.8))]" />
					<div className="absolute bottom-[20%] left-[10%] h-[15%] w-[80%] rounded-t-full bg-purple-900/40" />
					<div className="absolute bottom-0 left-0 h-[20%] w-full bg-[linear-gradient(180deg,rgba(30,27,75,0.5),rgba(30,27,75,0.95))]" />
				</div>
			);
		default:
			return null;
	}
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
