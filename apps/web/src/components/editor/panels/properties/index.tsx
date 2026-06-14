"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { usePropertiesStore } from "./stores/properties-store";
import { getPropertiesConfig, type PropertiesTabDef } from "./registry";
import { cn } from "@/utils/ui";
import { EmptyView } from "./empty-view";
import type { MediaAsset } from "@/lib/media/types";
import type { TimelineElement } from "@/lib/timeline";
import Image from "next/image";

export function PropertiesPanel() {
	return (
		<div className="panel glass-strong flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/90 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
			<InspectorView />
		</div>
	);
}

function InspectorView() {
	const editor = useEditor();
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	useEditor((e) => e.media.getAssets());
	const { selectedElements } = useElementSelection();
	const { activeTabPerType, setActiveTab } = usePropertiesStore();

	if (selectedElements.length === 0) {
		return (
			<>
				<InspectorHeader disabled />
				<div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
					<EmptyView />
				</div>
			</>
		);
	}

	if (selectedElements.length > 1) {
		return (
			<>
				<InspectorHeader disabled />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground text-sm">
						{selectedElements.length} elements selected.
					</p>
				</div>
			</>
		);
	}

	const mediaAssets = editor.media.getAssets();

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});
	const elementWithTrack = elementsWithTracks[0];

	if (!elementWithTrack) return null;

	const { element, track } = elementWithTrack;
	const config = getPropertiesConfig({ element, mediaAssets });
	const visibleTabs = config.tabs;

	if (visibleTabs.length === 0) {
		return (
			<>
				<InspectorHeader disabled />
				<div className="flex flex-1 items-center justify-center px-4 text-center">
					<p className="text-muted-foreground text-sm">
						No controls available for this element.
					</p>
				</div>
			</>
		);
	}

	const storedTabId = activeTabPerType[element.type];
	const isStoredTabVisible = visibleTabs.some((t) => t.id === storedTabId);
	const fallbackTabId = visibleTabs.some((t) => t.id === config.defaultTab)
		? config.defaultTab
		: visibleTabs[0]?.id;
	const activeTabId = isStoredTabVisible ? storedTabId : fallbackTabId;
	const activeTab =
		visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0];

	if (!activeTab) return null;

	const primaryTabs = buildPrimaryInspectorTabs({
		visibleTabs,
		activeTabId: activeTab.id,
	});

	return (
		<>
			<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
				<div className="flex items-center justify-between">
					<div className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
						Inspector
					</div>
					<button
						type="button"
						className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[0.65rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
						onClick={() => setActiveTab(element.type, config.defaultTab)}
					>
						Reset all
					</button>
				</div>
				<div className="mt-3 grid grid-cols-5 gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1 text-[0.68rem]">
					{primaryTabs.map((tab) => (
						<button
							key={tab.label}
							type="button"
							disabled={!tab.target}
							className={cn(
								"relative rounded-md px-1.5 py-1.5 text-center font-medium text-white/50 transition hover:bg-white/[0.06] hover:text-white focus:outline-none",
								tab.isActive && "bg-white/[0.12] text-white shadow-sm",
								!tab.target &&
									"cursor-not-allowed opacity-30 hover:bg-transparent hover:text-white/50",
							)}
							onClick={() => {
								if (tab.target) setActiveTab(element.type, tab.target.id);
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			<SelectedElementSummary element={element} mediaAssets={mediaAssets} />

			<div className="border-b border-white/10 px-3.5 py-3">
				<div className="mb-2.5 flex items-center justify-between">
					<div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/38">
						Advanced controls
					</div>
					<div className="h-px flex-1 bg-white/[0.06] ml-3" />
				</div>
				<div className="scrollbar-hidden flex shrink-0 gap-1 overflow-x-auto">
					{visibleTabs.map((tab) => (
						<TooltipProvider key={tab.id} delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={tab.id === activeTab.id ? "secondary" : "ghost"}
										size="sm"
										onClick={() => setActiveTab(element.type, tab.id)}
										aria-label={tab.label}
										className={cn(
											"h-7 shrink-0 rounded-md border px-2 text-[0.68rem]",
											tab.id === activeTab.id
												? "border-white/20 bg-white text-black hover:bg-white/90"
												: "border-white/[0.06] bg-white/[0.025] text-white/[0.5] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
										)}
									>
										<span className="mr-1.5 opacity-70">{tab.icon}</span>
										{tab.label}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom">{tab.label}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1 scrollbar-hidden bg-linear-to-b from-transparent to-black/[0.12]">
				{activeTab.content({ trackId: track.id })}
			</ScrollArea>
		</>
	);
}

function InspectorHeader({ disabled }: { disabled?: boolean }) {
	return (
		<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
			<div className="flex items-center justify-between">
				<div className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
					Inspector
				</div>
				<button
					type="button"
					disabled={disabled}
					className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[0.65rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
				>
					Reset all
				</button>
			</div>
			<div className="mt-3 grid grid-cols-5 gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1 text-[0.68rem]">
				{PRIMARY_INSPECTOR_TABS.map((tab) => (
					<span
						key={tab.label}
						className="relative rounded-md px-1.5 py-1.5 text-center font-medium text-white/30"
					>
						{tab.label}
					</span>
				))}
			</div>
		</div>
	);
}

const PRIMARY_INSPECTOR_TABS = [
	{
		label: "Video",
		ids: ["transform", "text", "graphic", "blending", "parenting", "camera"],
	},
	{ label: "Audio", ids: ["audio", "audio-effects"] },
	{ label: "Effects", ids: ["effects", "color", "adjustments", "masks"] },
	{ label: "Animation", ids: ["animations"] },
	{ label: "AI", ids: ["speed-ramp"] },
] as const;

function buildPrimaryInspectorTabs({
	visibleTabs,
	activeTabId,
}: {
	visibleTabs: PropertiesTabDef[];
	activeTabId: string;
}) {
	return PRIMARY_INSPECTOR_TABS.map((primaryTab) => {
		const target = primaryTab.ids
			.map((id) => visibleTabs.find((tab) => tab.id === id))
			.find((tab): tab is PropertiesTabDef => Boolean(tab));

		return {
			label: primaryTab.label,
			target,
			isActive: primaryTab.ids.some((id) => id === activeTabId),
		};
	});
}

function SelectedElementSummary({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}) {
	const mediaId = "mediaId" in element ? element.mediaId : undefined;
	const media = mediaAssets.find((asset) => asset.id === mediaId);
	const thumbnail = media?.thumbnailUrl ?? media?.url;

	return (
		<div className="mx-3.5 mt-3 flex shrink-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 shadow-inner shadow-white/[0.02]">
			<div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
				{thumbnail ? (
					<Image
						src={thumbnail}
						alt=""
						fill
						sizes="48px"
						className="object-cover"
						unoptimized
					/>
				) : (
					<span className="text-[0.65rem] uppercase text-white/[0.35]">
						{element.type}
					</span>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium text-white/[0.92]">
					{media?.name ?? element.name}
				</div>
				<div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[0.65rem] text-white/42">
					<span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 uppercase tracking-[0.12em]">
						{element.type}
					</span>
					{"sourceDuration" in element && element.sourceDuration ? (
						<span>{Math.round(element.sourceDuration / 120000)}s</span>
					) : (
						""
					)}
				</div>
			</div>
			<button
				type="button"
				className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-base leading-none text-white/[0.42] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
			>
				☆
			</button>
		</div>
	);
}
