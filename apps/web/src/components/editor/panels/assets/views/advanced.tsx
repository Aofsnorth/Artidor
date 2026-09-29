"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon } from "@hugeicons/core-free-icons";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { useI18n } from "@/lib/i18n";
import { AdjustTab } from "@/components/editor/panels/properties/tabs/adjust-tab";
import type { VisualElement } from "@/lib/timeline";
import { cn } from "@/utils/ui";
import { ScopesCard } from "./components/scopes";

type SubTabId = "wheels" | "scopes";

const SUB_TABS: Array<{ id: SubTabId; labelKey: string }> = [
	{ id: "wheels", labelKey: "advanced.wheels" },
	{ id: "scopes", labelKey: "advanced.scopes" },
];

/**
 * DaVinci Resolve + Kdenlive-style colour-correction card,
 * surfaced inside the Adjust tab. Two facets remain:
 *
 *   1. Wheels — the full Artidor grade: Lift / Gamma / Gain colour
 *                wheels, global temp/tint, the primary bars, vignette
 *                and the finishing passes, all at once. Every control
 *                writes a registered, rendering primitive.
 *   2. Scopes — live Waveform / Vectorscope / RGB Parade / histogram,
 *                the wide signal analysis that does not fit in a
 *                narrow inspector column.
 *
 * The HSL, HSL-Curves, Curves and LUT sub-tabs were REMOVED, alongside
 * the earlier Qualifier and Vignette ones, for the same reason: they
 * wrote `hsl`, `hsl-curve`, `curves` and `lut` effects whose definitions
 * declare zero render passes, so every control persisted params the
 * renderer silently skipped — the controls looked live and the picture
 * never moved. Real WGSL passes for them are roadmap work tracked in
 * the project goal; until they exist, no control ships that only moves
 * a number nobody reads.
 */
export function AdvancedView({
	embedded = false,
}: {
	/**
	 * When `true`, the view skips its own `PanelView` chrome (title
	 * bar + bordered wrapper) because it's already mounted inside
	 * another card — e.g. the Adjust sub-tab. When `false` (default)
	 * the view renders the full PanelView, used when the Advanced
	 * tab is mounted at the top of the left rail.
	 */
	embedded?: boolean;
} = {}) {
	const { t } = useI18n();
	const { selectedElements } = useElementSelection();
	const editor = useEditor();
	const [activeSubTab, setActiveSubTab] = useState<SubTabId>("wheels");

	if (selectedElements.length === 0) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.noLayerSelected"),
			body: t("advanced.selectVideoOrImage"),
		});
	}

	if (selectedElements.length > 1) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.multipleLayersSelected"),
			body: t("advanced.pickOneElement", { count: selectedElements.length }),
		});
	}

	const ref = selectedElements[0];
	const track = editor.timeline.getTrackById({ trackId: ref.trackId });
	const element = track?.elements.find((e) => e.id === ref.elementId) as
		| VisualElement
		| undefined;

	if (!element || !isColorableElement(element)) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.pickVideoOrImage"),
			body: t("advanced.colorToolsUnsupported"),
		});
	}

	const content = (
		<>
			<div className="border-b border-white/[0.06] px-2 py-2">
				<div className="scrollbar-hidden flex gap-1 overflow-x-auto">
					{SUB_TABS.map((tab) => {
						const isActive = activeSubTab === tab.id;
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
								{t(tab.labelKey)}
							</button>
						);
					})}
				</div>
			</div>

			<ScrollArea className="flex-1 scrollbar-hidden">
				<div className="flex flex-col gap-3 px-2 py-2">
					{activeSubTab === "wheels" && (
						<AdjustTab
							element={element}
							trackId={ref.trackId}
							layout="stacked"
						/>
					)}
					{activeSubTab === "scopes" && <ScopesCard />}
				</div>
			</ScrollArea>
		</>
	);

	return embedded ? (
		content
	) : (
		<PanelView title={t("advanced.title")}>{content}</PanelView>
	);
}

/**
 * Wrap an empty-state card. When `embedded`, render just the
 * centred text inside the parent card; otherwise wrap it in a
 * standalone PanelView so the user can still see the title.
 */
function wrapEmpty({
	embedded,
	t,
	title,
	body,
}: {
	embedded: boolean;
	t: (key: string, values?: Record<string, string | number>) => string;
	title: string;
	body: string;
}): React.ReactElement {
	const inner = (
		<EmptyState
			icon={<HugeiconsIcon icon={Sun01Icon} className="size-7 text-white/30" />}
			title={title}
			body={body}
		/>
	);
	return embedded ? (
		inner
	) : (
		<PanelView title={t("advanced.title")}>{inner}</PanelView>
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
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "graphic"
	);
}
