"use client";

import { useCallback, useState } from "react";
import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { BasicAdjustTab } from "./basic-adjust-tab";
import {
	AdjustCurvesPanel,
	AdjustHslPanel,
	AdjustWheelsPanel,
} from "../components/adjust-advanced-panels";
import { cn } from "@/utils/ui";

const SUB_TABS = [
	{ id: "basic", label: "Basic" },
	{ id: "wheels", label: "Wheels" },
	{ id: "curves", label: "Curves" },
	{ id: "hsl", label: "HSL" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

/**
 * Adjust tab shell.
 *
 * CapCut's colour panel is tabbed rather than one long list (Basic / HSL /
 * Curves / Colour wheel), and the same split is used here. "Basic" owns the
 * primitive-effect sliders; the other three sub-tabs drive the single
 * `davinci-adjust` effect, which already carries the colour wheels, tone
 * curves and HSL controls as real GPU parameters.
 *
 * Keeping the two storage models apart matters: the Basic sliders stay
 * individually copy/pasteable and individually resettable, while the
 * advanced panels are one coherent grade.
 */
export function AdjustTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const [activeSubTab, setActiveSubTab] = useState<SubTabId>("basic");

	/**
	 * CapCut's "Apply all": push the grade tuned here onto every other
	 * selected clip. Each target needs its own command, so this writes them
	 * one at a time rather than through a single preview.
	 */
	const handleApplyAll = useCallback(() => {
		const selected = editor.selection.getSelectedElements();
		const targets = selected.filter((sel) => sel.elementId !== element.id);
		for (const target of targets) {
			const current = editor.timeline
				.getPreviewTracks()
				?.main?.elements?.find((e) => e.id === target.elementId);
			if (!current) continue;
			editor.timeline.updateElements({
				updates: [
					{
						trackId: target.trackId,
						elementId: target.elementId,
						patch: { effects: current.effects },
					},
				],
			});
		}
	}, [editor, element.id]);

	return (
		<div className="flex h-full flex-col">
			<div
				className="flex shrink-0 gap-1 border-b border-white/8 px-2.5 py-2"
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
							"flex-1 rounded-md border px-2 py-1 text-[0.68rem] transition",
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
				{activeSubTab === "basic" && (
					<BasicAdjustTab
						element={element}
						trackId={trackId}
						onApplyAll={handleApplyAll}
					/>
				)}
				{activeSubTab === "wheels" && (
					<div className="px-3.5 py-3">
						<AdjustWheelsPanel element={element} trackId={trackId} />
					</div>
				)}
				{activeSubTab === "curves" && (
					<div className="px-3.5 py-3">
						<AdjustCurvesPanel element={element} trackId={trackId} />
					</div>
				)}
				{activeSubTab === "hsl" && (
					<div className="px-3.5 py-3">
						<AdjustHslPanel element={element} trackId={trackId} />
					</div>
				)}
			</div>
		</div>
	);
}
