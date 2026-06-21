"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import { formatTimecode, type FrameRate } from "artidor-wasm";
import { invokeAction } from "@/lib/actions";
import { EditableTimecode } from "@/components/editable-timecode";
import { Button } from "@/components/ui/button";
import { MiniAudioVisualizer } from "@/components/editor/audio-visualizer";
import {
	FullScreenIcon,
	PauseIcon,
	PlayIcon,
	Backward01Icon,
	Forward01Icon,
	PreviousIcon,
	NextIcon,
	RepeatIcon,
	PencilEdit01Icon,
	PenToolIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getGuideById } from "@/lib/guides";
import { usePreviewStore } from "@/stores/preview-store";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import {
	getNextBookmarkTimeWithin,
	getPreviousBookmarkTimeWithin,
} from "@/lib/timeline";
import { useToolModeStore } from "@/stores/tool-mode-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
	PREVIEW_QUALITIES,
	PREVIEW_QUALITY_LABELS,
} from "@/lib/perf/preview-quality";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/ui";
import { getElementKeyframes } from "@/lib/animation";

/**
 * The Rust `formatTimecode` API only accepts integer ticks (MediaTime is i64).
 * The JS bridge rejects floats with "invalid type: floating point, expected
 * i64". Callers sometimes end up with fractional values (e.g. when summing
 * `startTime + duration`). This helper makes the call defensive.
 */
function safeFormatTimecode({
	time,
	format,
	rate,
}: {
	time: number;
	format: "MM:SS" | "HH:MM:SS" | "HH:MM:SS:CS" | "HH:MM:SS:FF";
	rate: FrameRate;
}): string {
	return (
		formatTimecode({
			time: Math.round(time),
			format,
			rate,
		}) ?? ""
	);
}

export function PreviewToolbar({
	onToggleFullscreen,
}: {
	onToggleFullscreen: () => void;
}) {
	const activeGuide = usePreviewStore((state) => state.activeGuide);
	const _activeGuideDefinition = getGuideById(activeGuide);

	return (
		<div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center border-t border-white/10 bg-transparent px-3">
			<TimecodeDisplay />
			<TransportControls />
			<div className="flex items-center gap-1 justify-self-end">
				{/* v0.4.0 */}
				{/* <GridPopover>
					<Button
						variant={activeGuideDefinition ? "secondary" : "text"}
						size="icon"
					>
						{activeGuideDefinition ? (
							activeGuideDefinition.renderTriggerIcon()
						) : (
							<HugeiconsIcon icon={GridTableIcon} />
						)}
					</Button>
				</GridPopover> */}
				<LoopButton />
				<DrawToolButtons />
				<QualityMenu />
				<Button variant="text" onClick={onToggleFullscreen}>
					<HugeiconsIcon icon={FullScreenIcon} />
				</Button>
			</div>
		</div>
	);
}

function TimecodeDisplay() {
	const editor = useEditor();
	const totalDuration = useEditor((e) => e.timeline.getTotalDuration());
	const fps = useEditor((e) => e.project.getActive().settings.fps);
	const [currentTime, setCurrentTime] = useState(() =>
		editor.playback.getCurrentTime(),
	);

	useEffect(() => {
		const handler = (e: Event) =>
			setCurrentTime((e as CustomEvent<{ time: number }>).detail.time);
		window.addEventListener("playback-update", handler);
		window.addEventListener("playback-seek", handler);
		return () => {
			window.removeEventListener("playback-update", handler);
			window.removeEventListener("playback-seek", handler);
		};
	}, []);

	return (
		<div className="flex items-center">
			<MiniAudioVisualizer />
			<div className="mx-2 h-4 w-px bg-white/[0.08]" aria-hidden="true" />
			<EditableTimecode
				time={currentTime}
				duration={totalDuration}
				format="HH:MM:SS:FF"
				fps={fps}
				onTimeChange={({ time }) => editor.playback.seek({ time })}
				className="text-center"
			/>
			<span className="text-muted-foreground px-2 font-mono text-xs">/</span>
			<span className="text-muted-foreground font-mono text-xs">
				{safeFormatTimecode({
					time: totalDuration,
					format: "HH:MM:SS:FF",
					rate: fps,
				})}
			</span>
		</div>
	);
}

function DrawToolButtons() {
	const toolMode = useToolModeStore((s) => s.toolMode);
	const setToolMode = useToolModeStore((s) => s.setToolMode);

	const tools = [
		{
			mode: "draw" as const,
			label: "Freehand draw",
			icon: PencilEdit01Icon,
		},
		{
			mode: "vector" as const,
			label: "Vector draw",
			icon: PenToolIcon,
		},
	];

	return (
		<div className="mx-1 flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.025] p-0.5">
			{tools.map((tool) => {
				const active = toolMode === tool.mode;
				return (
					<Button
						key={tool.mode}
						variant="text"
						size="icon"
						aria-label={tool.label}
						aria-pressed={active}
						title={tool.label}
						onClick={() => setToolMode(active ? "select" : tool.mode)}
						className={cn(
							"size-7 rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white",
							active && "bg-white/[0.14] text-white ring-1 ring-white/30",
						)}
					>
						<HugeiconsIcon icon={tool.icon} className="size-3.5" />
					</Button>
				);
			})}
		</div>
	);
}

function QualityMenu() {
	const previewQuality = useSettingsStore((s) => s.previewQuality);
	const setPreviewQuality = useSettingsStore((s) => s.setPreviewQuality);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="text"
					size="sm"
					title="Preview render quality (does not affect export)"
					className="h-7 px-2 text-[0.62rem] font-medium text-white/55 hover:text-white"
				>
					{PREVIEW_QUALITY_LABELS[previewQuality]}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-32">
				<DropdownMenuRadioGroup
					value={previewQuality}
					onValueChange={(value) =>
						setPreviewQuality(value as typeof previewQuality)
					}
				>
					{PREVIEW_QUALITIES.map((quality) => (
						<DropdownMenuRadioItem key={quality} value={quality}>
							{PREVIEW_QUALITY_LABELS[quality]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LoopButton() {
	const editor = useEditor();
	const [loop, setLoop] = useState(false);
	const loopRef = useRef(loop);

	useEffect(() => {
		loopRef.current = loop;
	}, [loop]);

	useEffect(() => {
		const handler = (e: Event) => {
			if (!loopRef.current) return;
			const time = (e as CustomEvent<{ time: number }>).detail.time;
			const duration = editor.timeline.getTotalDuration();
			if (duration <= 0) return;
			// Restart slightly before the end so playback never stalls on the last frame.
			if (time >= duration - TICKS_PER_SECOND * 0.05) {
				editor.playback.seek({ time: 0 });
				if (!editor.playback.getIsPlaying()) {
					invokeAction("toggle-play");
				}
			}
		};
		window.addEventListener("playback-update", handler);
		return () => window.removeEventListener("playback-update", handler);
	}, [editor]);

	return (
		<Button
			variant="text"
			size="icon"
			aria-pressed={loop}
			aria-label={loop ? "Disable loop playback" : "Enable loop playback"}
			onClick={() => setLoop((value) => !value)}
			className={loop ? "bg-white/[0.1] text-white" : "text-white/55"}
		>
			<HugeiconsIcon icon={RepeatIcon} className="size-4" />
		</Button>
	);
}

const JUMP_WINDOW_TICKS = 5 * TICKS_PER_SECOND;

function TransportControls() {
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const editor = useEditor();
	const currentTime = useEditor((e) => e.playback.getCurrentTime());
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const selectedKeyframes = useEditor((e) => e.selection.getSelectedKeyframes());
	const bookmarks = scene?.bookmarks ?? [];

	const getSelectedNavigationTimes = () => {
		if (!scene) return [];
		const tracks = Object.values(scene.tracks).flat();
		const selectedElementIds = new Set(
			selectedElements.map((element) => `${element.trackId}:${element.elementId}`),
		);
		const times = new Set<number>();
		for (const track of tracks) {
			for (const element of track.elements) {
				const isSelectedElement = selectedElementIds.has(`${track.id}:${element.id}`);
				for (const keyframe of getElementKeyframes({
					animations: element.animations,
				})) {
					const isSelectedKeyframe = selectedKeyframes.some(
						(selectedKeyframe) =>
							selectedKeyframe.trackId === track.id &&
							selectedKeyframe.elementId === element.id &&
							selectedKeyframe.propertyPath === keyframe.propertyPath &&
							selectedKeyframe.keyframeId === keyframe.id,
					);
					if (isSelectedElement || isSelectedKeyframe) {
						times.add(element.startTime + keyframe.time);
					}
				}
			}
		}
		return [...times].sort((a, b) => a - b);
	};

	const handleJumpBackward = () => {
		const keyframeTime = getSelectedNavigationTimes()
			.reverse()
			.find((time) => time < currentTime);
		if (keyframeTime != null) {
			editor.playback.seek({ time: keyframeTime });
			return;
		}
		const candidate = getPreviousBookmarkTimeWithin({
			bookmarks,
			time: currentTime,
			windowTicks: JUMP_WINDOW_TICKS,
		});
		if (candidate != null) {
			editor.playback.seek({ time: candidate });
			return;
		}
		invokeAction("jump-backward");
	};

	const handleJumpForward = () => {
		const keyframeTime = getSelectedNavigationTimes().find(
			(time) => time > currentTime,
		);
		if (keyframeTime != null) {
			editor.playback.seek({ time: keyframeTime });
			return;
		}
		const candidate = getNextBookmarkTimeWithin({
			bookmarks,
			time: currentTime,
			windowTicks: JUMP_WINDOW_TICKS,
		});
		if (candidate != null) {
			editor.playback.seek({ time: candidate });
			return;
		}
		invokeAction("jump-forward");
	};

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="text"
				size="icon"
				aria-label="Go to start"
				className="text-white/60 hover:text-white"
				onClick={() => invokeAction("goto-start")}
			>
				<HugeiconsIcon icon={PreviousIcon} className="size-4" />
			</Button>
			<Button
				variant="text"
				size="icon"
				aria-label="Jump backward (or previous bookmark)"
				title="Jump backward, or to the previous bookmark if one is nearby"
				className="text-white/60 hover:text-white"
				onClick={handleJumpBackward}
			>
				<HugeiconsIcon icon={Backward01Icon} className="size-4" />
			</Button>
			<Button
				variant="text"
				size="icon"
				aria-label={isPlaying ? "Pause" : "Play"}
				onClick={() => invokeAction("toggle-play")}
			>
				<HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
			</Button>
			<Button
				variant="text"
				size="icon"
				aria-label="Jump forward (or next bookmark)"
				title="Jump forward, or to the next bookmark if one is nearby"
				className="text-white/60 hover:text-white"
				onClick={handleJumpForward}
			>
				<HugeiconsIcon icon={Forward01Icon} className="size-4" />
			</Button>
			<Button
				variant="text"
				size="icon"
				aria-label="Go to end"
				className="text-white/60 hover:text-white"
				onClick={() => invokeAction("goto-end")}
			>
				<HugeiconsIcon icon={NextIcon} className="size-4" />
			</Button>
		</div>
	);
}
