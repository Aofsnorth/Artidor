"use client";

import {
	Cancel01Icon,
	ChartHistogramIcon,
	ColorsIcon,
	Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScopesCard } from "@/components/editor/panels/assets/views/components/scopes";
import { ColorWheelsTab } from "@/components/editor/panels/properties/tabs/color-wheels-tab";
import { DavinciAdjustTab } from "@/components/editor/panels/properties/tabs/davinci-adjust-tab";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import type { VisualElement } from "@/lib/timeline";
import {
	type AdvancedViewerId,
	useEditorUIStore,
} from "@/stores/editor-ui-store";
import { cn } from "@/utils/ui";

interface ViewerDefinition {
	id: AdvancedViewerId;
	label: string;
	icon: typeof ChartHistogramIcon;
}

const ADVANCED_VIEWERS: ViewerDefinition[] = [
	{ id: "scopes", label: "Scopes", icon: ChartHistogramIcon },
	{ id: "color-wheels", label: "Color Wheels", icon: ColorsIcon },
	{ id: "davinci-adjust", label: "DaVinci Adjust", icon: Settings02Icon },
];

export function AdvancedViewersDropdown() {
	const activeViewer = useEditorUIStore((state) => state.activeAdvancedViewer);
	const setActiveViewer = useEditorUIStore(
		(state) => state.setActiveAdvancedViewer,
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"grid size-8 cursor-pointer place-items-center rounded-md border text-white/60 transition",
						activeViewer
							? "border-white/20 bg-white/10 text-white"
							: "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/8 hover:text-white",
					)}
					title="Advanced viewers"
					aria-label="Open advanced viewers"
					aria-pressed={activeViewer !== null}
				>
					<HugeiconsIcon icon={ChartHistogramIcon} className="size-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				{ADVANCED_VIEWERS.map((viewer) => (
					<DropdownMenuItem
						key={viewer.id}
						onClick={() => setActiveViewer(viewer.id)}
						className="flex items-center gap-2.5"
					>
						<HugeiconsIcon icon={viewer.icon} className="size-4" />
						<span className="flex-1 truncate text-sm">{viewer.label}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AdvancedViewerPanel() {
	const activeViewer = useEditorUIStore((state) => state.activeAdvancedViewer);
	const setActiveViewer = useEditorUIStore(
		(state) => state.setActiveAdvancedViewer,
	);
	const { selectedElements } = useElementSelection();
	const timeline = useEditor((editor) => editor.timeline, ["timeline"]);

	if (!activeViewer) {
		return null;
	}

	const elementsWithTracks =
		selectedElements.length === 1
			? timeline.getElementsWithTracks({ elements: selectedElements })
			: [];
	const elementWithTrack = elementsWithTracks.at(0);
	const element = elementWithTrack?.element as VisualElement | undefined;
	const trackId = elementWithTrack?.track.id;
	const activeDefinition = ADVANCED_VIEWERS.find(
		(viewer) => viewer.id === activeViewer,
	);

	return (
		<section className="panel glass-strong flex size-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-background/90">
			<header className="flex min-h-11 items-center gap-2 border-b border-white/10 px-3">
				<div className="min-w-0 flex-1">
					<h2 className="truncate text-sm font-medium text-white">
						{activeDefinition?.label ?? "Advanced viewer"}
					</h2>
				</div>
				<button
					type="button"
					onClick={() => setActiveViewer(null)}
					className="grid size-8 shrink-0 place-items-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
					aria-label="Close advanced viewer"
					title="Close advanced viewer"
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
				</button>
			</header>

			<div
				role="tablist"
				aria-label="Advanced viewer"
				className="scrollbar-hidden flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2"
			>
				{ADVANCED_VIEWERS.map((viewer) => {
					const isActive = viewer.id === activeViewer;
					return (
						<button
							key={viewer.id}
							id={`advanced-viewer-tab-${viewer.id}`}
							type="button"
							role="tab"
							aria-controls="advanced-viewer-panel"
							aria-selected={isActive}
							tabIndex={isActive ? 0 : -1}
							onClick={() => setActiveViewer(viewer.id)}
							onKeyDown={(event) => {
								const currentIndex = ADVANCED_VIEWERS.findIndex(
									(option) => option.id === activeViewer,
								);
								let nextIndex = currentIndex;
								if (event.key === "ArrowRight") {
									nextIndex = (currentIndex + 1) % ADVANCED_VIEWERS.length;
								} else if (event.key === "ArrowLeft") {
									nextIndex =
										(currentIndex - 1 + ADVANCED_VIEWERS.length) %
										ADVANCED_VIEWERS.length;
								} else if (event.key === "Home") {
									nextIndex = 0;
								} else if (event.key === "End") {
									nextIndex = ADVANCED_VIEWERS.length - 1;
								} else {
									return;
								}

								event.preventDefault();
								const nextViewer = ADVANCED_VIEWERS.at(nextIndex);
								if (!nextViewer) return;
								setActiveViewer(nextViewer.id);
								requestAnimationFrame(() => {
									document
										.getElementById(`advanced-viewer-tab-${nextViewer.id}`)
										?.focus();
								});
							}}
							className={cn(
								"flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
								isActive
									? "bg-white/12 text-white"
									: "text-white/55 hover:bg-white/6 hover:text-white/85",
							)}
						>
							<HugeiconsIcon icon={viewer.icon} className="size-3.5" />
							{viewer.label}
						</button>
					);
				})}
			</div>

			<div
				id="advanced-viewer-panel"
				role="tabpanel"
				aria-labelledby={`advanced-viewer-tab-${activeViewer}`}
				className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-3"
			>
				<AdvancedViewerContent
					activeViewer={activeViewer}
					element={element}
					trackId={trackId}
				/>
			</div>
		</section>
	);
}

function AdvancedViewerContent({
	activeViewer,
	element,
	trackId,
}: {
	activeViewer: AdvancedViewerId;
	element: VisualElement | undefined;
	trackId: string | undefined;
}) {
	if (activeViewer === "scopes") {
		return <ScopesCard />;
	}

	if (!element || !trackId) {
		const controlName =
			activeViewer === "color-wheels" ? "color wheels" : "DaVinci adjust";
		return (
			<div className="flex min-h-40 items-center justify-center px-4 text-center">
				<p className="max-w-56 text-sm leading-6 text-white/50">
					Select a single visual element to use {controlName}.
				</p>
			</div>
		);
	}

	if (activeViewer === "color-wheels") {
		return <ColorWheelsTab element={element} trackId={trackId} />;
	}

	return <DavinciAdjustTab element={element} trackId={trackId} />;
}
