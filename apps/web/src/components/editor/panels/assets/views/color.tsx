"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon } from "@hugeicons/core-free-icons";
import { PanelView } from "./base-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { BasicAdjustTab } from "@/components/editor/panels/properties/tabs/basic-adjust-tab";
import { DavinciAdjustTab } from "@/components/editor/panels/properties/tabs/davinci-adjust-tab";
import { ColorWheelsTab } from "@/components/editor/panels/properties/tabs/color-wheels-tab";
import { ColorGradingTab } from "@/components/editor/panels/properties/tabs/color-grading-tab";
import { AdjustmentsTab } from "@/components/editor/panels/properties/tabs/adjustments-tab";
import type { VisualElement } from "@/lib/timeline";
import { cn } from "@/utils/ui";

const SUB_TABS = [
	{ id: "basic", label: "Basic" },
	{ id: "manual", label: "Manual" },
	{ id: "wheels", label: "Wheels" },
	{ id: "color", label: "Color" },
	{ id: "adjustments", label: "Adjustments" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

/**
 * Left-bar version of the inspector's "Adjust" category. Mirrors the
 * five sub-tabs (Basic / Manual / Wheels / Color / Adjustments) that
 * used to live on the right inspector so the user can colour-correct
 * a selected element without reaching across the screen.
 *
 * The underlying tab components are reused as-is — they already
 * accept `(element, trackId)` and write through the editor — so the
 * colour tools themselves didn't need to be re-implemented; only the
 * surrounding chrome (sub-tab picker, panel header, empty states)
 * is new here.
 */
export function ColorView() {
	const { selectedElements } = useElementSelection();
	const editor = useEditor();
	const [activeSubTab, setActiveSubTab] = useState<SubTabId>("basic");

	if (selectedElements.length === 0) {
		return (
			<PanelView title="Color">
				<EmptyState
					icon={
						<HugeiconsIcon icon={Sun01Icon} className="size-7 text-white/30" />
					}
					title="No layer selected"
					body="Select a video or image on the timeline to colour-correct it here."
				/>
			</PanelView>
		);
	}

	if (selectedElements.length > 1) {
		return (
			<PanelView title="Color">
				<EmptyState
					icon={
						<HugeiconsIcon icon={Sun01Icon} className="size-7 text-white/30" />
					}
					title="Multiple layers selected"
					body={`Colour tools work on a single layer — pick one element to continue (${selectedElements.length} currently selected).`}
				/>
			</PanelView>
		);
	}

	const ref = selectedElements[0];
	const track = editor.timeline.getTrackById({ trackId: ref.trackId });
	const element = track?.elements.find((e) => e.id === ref.elementId) as
		| VisualElement
		| undefined;

	if (!element || !isColorableElement(element)) {
		return (
			<PanelView title="Color">
				<EmptyState
					icon={
						<HugeiconsIcon icon={Sun01Icon} className="size-7 text-white/30" />
					}
					title="Pick a video or image"
					body="Colour tools work on video, image, and graphic layers. Audio and text layers don't have colour parameters."
				/>
			</PanelView>
		);
	}

	const activeSubTabDef =
		SUB_TABS.find((tab) => tab.id === activeSubTab) ?? SUB_TABS[0];

	return (
		<PanelView title="Color">
			{/* Sub-tab picker — narrow pill row that scrolls horizontally
			    when the panel is too thin to fit all five. Same
			    chip pattern as the inspector's secondary row so the
			    muscle memory carries over. */}
			<div className="border-b border-white/[0.06] px-2 py-2">
				<div
					className="scrollbar-hidden flex gap-1 overflow-x-auto"
					style={{
						maskImage:
							"linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
					}}
				>
					{SUB_TABS.map((tab) => {
						const isActive = activeSubTabDef.id === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveSubTab(tab.id)}
								aria-pressed={isActive}
								className={cn(
									"shrink-0 rounded-md border px-2.5 py-1 text-[0.68rem] font-medium transition",
									isActive
										? "border-white/20 bg-white text-[#09090b] shadow-sm"
										: "border-white/[0.06] bg-white/[0.025] text-white/[0.55] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			<ScrollArea className="flex-1 scrollbar-hidden bg-linear-to-b from-transparent to-black/[0.12]">
				<div className="px-2 py-2">
					{activeSubTabDef.id === "basic" && (
						<BasicAdjustTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTabDef.id === "manual" && (
						<DavinciAdjustTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTabDef.id === "wheels" && (
						<ColorWheelsTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTabDef.id === "color" && (
						<ColorGradingTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTabDef.id === "adjustments" && (
						<AdjustmentsTab element={element} trackId={ref.trackId} />
					)}
				</div>
			</ScrollArea>
		</PanelView>
	);
}

function EmptyState({
	icon,
	title,
	body,
}: {
	icon: React.ReactNode;
	title: string;
	body: string;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
			{icon}
			<p className="text-sm font-medium text-white/80">{title}</p>
			<p className="max-w-[260px] text-xs leading-relaxed text-white/40 text-balance">
				{body}
			</p>
		</div>
	);
}

function isColorableElement(element: VisualElement): element is VisualElement {
	// Colour tools write to the `davinci-adjust` effect + per-effect
	// type params. The renderer and tab components already no-op
	// gracefully for elements that don't have the relevant
	// properties, so the gate is really just about visual sanity:
	// colour-correcting an audio or text layer is meaningless and
	// we don't want to surface confusing controls for it.
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "graphic"
	);
}
