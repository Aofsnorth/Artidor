"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ChartHistogramIcon,
	ColorsIcon,
	MusicNote01Icon,
	Settings02Icon,
} from "@hugeicons/core-free-icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { ScopesCard } from "@/components/editor/panels/assets/views/components/scopes";
import { VerticalAudioMeter } from "@/components/editor/vertical-audio-meter";
import { ColorWheelsTab } from "@/components/editor/panels/properties/tabs/color-wheels-tab";
import { DavinciAdjustTab } from "@/components/editor/panels/properties/tabs/davinci-adjust-tab";
import type { VisualElement } from "@/lib/timeline";
import { cn } from "@/utils/ui";

type ViewerId = "scopes" | "color-wheels" | "davinci-adjust" | "audio-meter";

interface ViewerDef {
	id: ViewerId;
	label: string;
	icon: typeof ChartHistogramIcon;
}

const VIEWERS: ViewerDef[] = [
	{ id: "scopes", label: "Scopes", icon: ChartHistogramIcon },
	{ id: "color-wheels", label: "Color Wheels", icon: ColorsIcon },
	{ id: "davinci-adjust", label: "DaVinci Adjust", icon: Settings02Icon },
	{ id: "audio-meter", label: "Audio Meter", icon: MusicNote01Icon },
];

export function AdvancedViewersDropdown() {
	const [openViewer, setOpenViewer] = useState<ViewerId | null>(null);

	const { selectedElements } = useElementSelection();
	const timeline = useEditor((e) => e.timeline, ["timeline"]);

	const elementsWithTracks =
		selectedElements.length === 1
			? timeline.getElementsWithTracks({ elements: selectedElements })
			: [];
	const elementWithTrack = elementsWithTracks[0];
	const element = elementWithTrack?.element as VisualElement | undefined;
	const trackId = elementWithTrack?.track.id;

	const activeViewer = VIEWERS.find((v) => v.id === openViewer);

	function renderViewer() {
		switch (openViewer) {
			case "scopes":
				return <ScopesCard />;
			case "audio-meter":
				return (
					<div className="flex h-[50vh] justify-center">
						<VerticalAudioMeter width={220} />
					</div>
				);
			case "color-wheels":
				if (!element || !trackId) {
					return (
						<p className="p-6 text-center text-sm text-white/50">
							Select a single visual element to use the color wheels.
						</p>
					);
				}
				return <ColorWheelsTab element={element} trackId={trackId} />;
			case "davinci-adjust":
				if (!element || !trackId) {
					return (
						<p className="p-6 text-center text-sm text-white/50">
							Select a single visual element to use DaVinci adjust.
						</p>
					);
				}
				return <DavinciAdjustTab element={element} trackId={trackId} />;
			default:
				return null;
		}
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="grid size-8 cursor-pointer place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
						title="Advanced viewers"
						aria-label="Open advanced viewers"
					>
						<HugeiconsIcon icon={ChartHistogramIcon} className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					{VIEWERS.map((viewer) => (
						<DropdownMenuItem
							key={viewer.id}
							onClick={() => setOpenViewer(viewer.id)}
							className="flex items-center gap-2.5"
						>
							<HugeiconsIcon icon={viewer.icon} className="size-4" />
							<span className="flex-1 truncate text-sm">{viewer.label}</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={openViewer !== null} onOpenChange={() => setOpenViewer(null)}>
				<DialogContent
					className={cn(
						"max-w-2xl bg-[#09090b]/95 border border-white/10 text-white",
						openViewer === "audio-meter" ? "max-w-md" : "",
					)}
				>
					<DialogHeader>
						<DialogTitle>
							{activeViewer ? activeViewer.label : "Viewer"}
						</DialogTitle>
					</DialogHeader>
					<DialogBody className="overflow-y-auto max-h-[65vh] p-0">
						{renderViewer()}
					</DialogBody>
				</DialogContent>
			</Dialog>
		</>
	);
}
