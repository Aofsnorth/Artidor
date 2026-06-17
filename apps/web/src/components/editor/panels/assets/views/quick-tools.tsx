"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Teleprompter } from "@/components/editor/teleprompter/teleprompter";
import { useReverseVideo } from "@/hooks/use-reverse-video";
import { useStabilizeVideo } from "@/hooks/use-stabilize-video";
import { useAutoReframe } from "@/hooks/use-auto-reframe";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";

import { useToolModeStore } from "@/stores/tool-mode-store";

type ToolId = "teleprompter" | "reverse" | "stabilize" | "auto-reframe" | null;

export function QuickToolsView() {
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	const { reverse: reverseVideo, isProcessing: reversing } = useReverseVideo();
	const { stabilize, isProcessing: stabilizing } = useStabilizeVideo();
	const { reframe, isProcessing: reframing } = useAutoReframe();
	const editor = useEditor();

	const setToolMode = useToolModeStore((s) => s.setToolMode);
	const toolMode = useToolModeStore((s) => s.toolMode);

	if (activeTool === "teleprompter") {
		return <Teleprompter onClose={() => setActiveTool(null)} />;
	}

	const tools: Array<{
		id: Exclude<ToolId, null> | "freehand" | "vector";
		label: string;
		description: string;
		onClick: () => void;
		busy?: boolean;
		active?: boolean;
	}> = [
		{
			id: "freehand",
			label: "Freehand Draw",
			description: "Draw freehand strokes on the canvas.",
			onClick: () => setToolMode(toolMode === "draw" ? "select" : "draw"),
			active: toolMode === "draw",
		},
		{
			id: "vector",
			label: "Vector Draw",
			description: "Create precise vector paths with anchor points.",
			onClick: () => setToolMode(toolMode === "vector" ? "select" : "vector"),
			active: toolMode === "vector",
		},
		{
			id: "teleprompter",
			label: "Teleprompter",
			description: "Read scripts while recording with auto-scroll text.",
			onClick: () => setActiveTool("teleprompter"),
		},
		{
			id: "reverse",
			label: "Reverse Video",
			description: "Play a video clip backwards (creates a new reversed clip).",
			onClick: () => {
				void reverseVideo();
			},
			busy: reversing,
		},
		{
			id: "stabilize",
			label: "Stabilize",
			description: "Reduce camera shake by applying compensating keyframes.",
			onClick: () => {
				void stabilize();
			},
			busy: stabilizing,
		},
		{
			id: "auto-reframe",
			label: "Auto Reframe",
			description: "Crop and follow the subject for a new aspect ratio.",
			onClick: () => {
				const target = editor.project.getActive().settings.canvasSize;
				void reframe({ targetSize: target });
			},
			busy: reframing,
		},
	];

	return (
		<PanelView title="Quick Tools">
			<div className="flex flex-col gap-2 pb-3">
				<p className="text-muted-foreground text-xs">
					One-tap tools for common operations. Select a video clip first for
					tools that need a source.
				</p>
				{tools.map((tool) => (
					<button
						key={tool.id}
						type="button"
						onClick={tool.onClick}
						disabled={tool.busy}
						className={cn(
							"group bg-accent hover:bg-accent/70 relative flex flex-col items-start gap-1 overflow-hidden rounded-md p-3 text-left transition-colors disabled:opacity-50",
							tool.active &&
								"bg-white/15 hover:bg-white/20 ring-2 ring-cyan-400",
						)}
					>
						<div className="flex items-center gap-2">
							<HugeiconsIcon
								icon={SparklesIcon}
								className="size-3.5 text-muted-foreground"
							/>
							<span className="text-sm font-medium">{tool.label}</span>
						</div>
						<p className="text-xs text-muted-foreground">{tool.description}</p>
					</button>
				))}
			</div>
		</PanelView>
	);
}
