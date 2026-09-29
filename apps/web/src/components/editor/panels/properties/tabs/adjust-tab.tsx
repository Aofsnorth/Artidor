"use client";

import { type ComponentType, useCallback, useState } from "react";
import { findTrackInSceneTracks, type VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	applyAdjustmentValues,
	readAdjustmentValues,
} from "@/lib/effects/basic-adjust-actions";
import { BasicAdjustTab } from "./basic-adjust-tab";
import {
	AdjustBarsPanel,
	AdjustGlowGrainPanel,
	AdjustSharpenBlurPanel,
	AdjustVignettePanel,
	AdjustWheelsPanel,
} from "../components/adjust-advanced-panels";
import { cn } from "@/utils/ui";

type PanelProps = { element: VisualElement; trackId: string };
type PanelComponent = ComponentType<PanelProps>;

/**
 * The grading suite, in workflow order: shape the image with the wheels, dial
 * the tone bars, then the finishing passes.
 *
 * The Curves, HSL, Qualifier and LUT panels were REMOVED. Their targets
 * (`curves`, `hsl`, `lut`) are registered but declare ZERO render passes, so
 * every control persisted params no GPU pass ever read. There is no registered
 * primitive to rewire them to, and inventing a shader is out of scope, so the
 * honest move is to remove the dead UI rather than leave sliders that only
 * move numbers nobody reads. `bun run audit:effects` is the tool that measures
 * this.
 *
 * This array is the single definition of the suite. `layout="stacked"` renders
 * every entry at once and `layout="tabs"` turns each into a sub-tab, so the
 * two entry points cannot drift apart.
 */
const GRADE_PANELS = [
	{ id: "wheels", label: "Wheels", Panel: AdjustWheelsPanel },
	{ id: "bars", label: "Bars", Panel: AdjustBarsPanel },
	{ id: "vignette", label: "Vignette", Panel: AdjustVignettePanel },
	{ id: "sharpen", label: "Sharpen", Panel: AdjustSharpenBlurPanel },
	{ id: "glow", label: "Glow", Panel: AdjustGlowGrainPanel },
] as const;

const SUB_TABS = [{ id: "basic", label: "Basic" }, ...GRADE_PANELS] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

/**
 * Adjust tab shell — the one home for the colour suite, rendered two ways.
 *
 * CapCut's colour panel is tabbed rather than one long list, and the inspector
 * is narrow, so `layout="tabs"` (the default) gives each panel its own
 * sub-tab behind a wrapping strip. "Basic" owns the primitive-effect sliders;
 * the rest drive registered primitive effects too, so every control in the
 * suite changes the picture.
 *
 * `layout="stacked"` is the Advanced Viewers panel's wide variant: no sub-tab
 * strip, the whole suite in a multi-column grid so a grade can be read and
 * adjusted at a glance.
 *
 * Keeping the two storage models apart matters: the Basic sliders stay
 * individually copy/pasteable and individually resettable, while the advanced
 * panels are one coherent grade.
 */
export function AdjustTab({
	element,
	trackId,
	layout = "tabs",
}: {
	element: VisualElement;
	trackId: string;
	layout?: "tabs" | "stacked";
}) {
	const editor = useEditor();
	// Declared above the layout branch: switching layout keeps the sub-tab you
	// were last on rather than resetting the panel to Basic.
	const [activeSubTab, setActiveSubTab] = useState<SubTabId>("basic");

	/**
	 * CapCut's "Apply all": push the adjustment grade tuned here onto every
	 * other selected clip. The source grade is read from the live (preview-aware)
	 * tracks, so an in-progress drag is included, and the lookup spans every
	 * track bucket — the graded clip can sit on an overlay lane. One command
	 * for all targets (a single undo step) that leaves each target's own
	 * non-adjustment effects intact.
	 */
	const handleApplyAll = useCallback(() => {
		const tracks =
			editor.timeline.getPreviewTracks() ??
			editor.scenes.getActiveSceneOrNull()?.tracks;
		if (!tracks) return;

		const findInTracks = (ref: { trackId: string; elementId: string }) =>
			findTrackInSceneTracks({
				tracks,
				trackId: ref.trackId,
			})?.elements.find((candidate) => candidate.id === ref.elementId);

		const source = findInTracks({ trackId, elementId: element.id }) as
			| VisualElement
			| undefined;
		if (!source) return;
		const values = readAdjustmentValues(source.effects);
		if (Object.keys(values).length === 0) return;

		const updates = editor.selection
			.getSelectedElements()
			.filter((ref) => ref.elementId !== element.id)
			.flatMap((ref) => {
				const target = findInTracks(ref) as VisualElement | undefined;
				if (!target) return [];
				return [
					{
						trackId: ref.trackId,
						elementId: ref.elementId,
						patch: {
							effects: applyAdjustmentValues({
								effects: target.effects,
								values,
							}),
						},
					},
				];
			});
		if (updates.length === 0) return;

		editor.timeline.updateElements({ updates });
	}, [editor, element.id, trackId]);

	const ActivePanel: PanelComponent | undefined = GRADE_PANELS.find(
		(panel) => panel.id === activeSubTab,
	)?.Panel;

	if (layout === "stacked") {
		return (
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden">
					<div className="grid grid-cols-1 gap-3 px-3.5 py-3 xl:grid-cols-2">
						{GRADE_PANELS.map(({ id, Panel: GradePanel }) => (
							<GradePanel key={id} element={element} trackId={trackId} />
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div
				className="flex shrink-0 flex-nowrap gap-1 overflow-x-auto border-b border-white/8 px-2.5 py-2 scrollbar-hidden"
				role="tablist"
				aria-label="Adjust sections"
			>
				{SUB_TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeSubTab === tab.id}
						data-testid={`adjust-subtab-${tab.id}`}
						onClick={() => setActiveSubTab(tab.id)}
						className={cn(
							"shrink-0 rounded-md border px-2 py-1 text-[0.68rem] transition",
							activeSubTab === tab.id
								? "border-white/25 bg-white/12 text-foreground"
								: "border-white/6 bg-white/2.5 text-muted-foreground hover:border-white/15 hover:text-foreground",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden">
				{ActivePanel ? (
					<div className="px-3.5 py-3">
						<ActivePanel element={element} trackId={trackId} />
					</div>
				) : (
					<BasicAdjustTab
						element={element}
						trackId={trackId}
						onApplyAll={handleApplyAll}
					/>
				)}
			</div>
		</div>
	);
}
