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
import { useI18n } from "@/lib/i18n";
import { cn } from "@/utils/ui";

type ToolId = "teleprompter" | "reverse" | "stabilize" | "auto-reframe" | null;

export function QuickToolsView() {
	const { t } = useI18n();
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	const { reverse: reverseVideo, isProcessing: reversing } = useReverseVideo();
	const { stabilize, isProcessing: stabilizing } = useStabilizeVideo();
	const { reframe, isProcessing: reframing } = useAutoReframe();
	const editor = useEditor();

	if (activeTool === "teleprompter") {
		return <Teleprompter onClose={() => setActiveTool(null)} />;
	}

	const tools: Array<{
		id: Exclude<ToolId, null>;
		label: string;
		description: string;
		onClick: () => void;
		busy?: boolean;
	}> = [
		{
			id: "teleprompter",
			label: t("quickTools.teleprompterLabel"),
			description: t("quickTools.teleprompterDescription"),
			onClick: () => setActiveTool("teleprompter"),
		},
		{
			id: "reverse",
			label: t("quickTools.reverseVideoLabel"),
			description: t("quickTools.reverseVideoDescription"),
			onClick: () => {
				void reverseVideo();
			},
			busy: reversing,
		},
		{
			id: "stabilize",
			label: t("quickTools.stabilizeLabel"),
			description: t("quickTools.stabilizeDescription"),
			onClick: () => {
				void stabilize();
			},
			busy: stabilizing,
		},
		{
			id: "auto-reframe",
			label: t("quickTools.autoReframeLabel"),
			description: t("quickTools.autoReframeDescription"),
			onClick: () => {
				const target = editor.project.getActive().settings.canvasSize;
				void reframe({ targetSize: target });
			},
			busy: reframing,
		},
	];

	return (
		<PanelView title={t("quickTools.title")}>
			<div className="flex flex-col gap-2 pb-3">
				<p className="text-muted-foreground text-xs">
					{t("quickTools.description")}
				</p>
				{tools.map((tool) => (
					<button
						key={tool.id}
						type="button"
						onClick={tool.onClick}
						disabled={tool.busy}
						className={cn(
							"group bg-accent hover:bg-accent/70 relative flex flex-col items-start gap-1 overflow-hidden rounded-md p-3 text-left transition-colors disabled:opacity-50",
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
