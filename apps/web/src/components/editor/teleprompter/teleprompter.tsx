"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	PlayIcon,
	StopIcon,
	RefreshIcon,
	ArrowExpandIcon,
	Copy01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import {
	DEFAULT_TELEPROMPTER_SETTINGS,
	type TeleprompterSettings,
} from "@/lib/teleprompter";

const SCROLL_PRESETS = [
	{ id: "slow", label: "Slow", value: 30 },
	{ id: "medium", label: "Medium", value: 60 },
	{ id: "fast", label: "Fast", value: 100 },
	{ id: "custom", label: "Custom", value: null },
];

export function Teleprompter({ onClose }: { onClose: () => void }) {
	const [script, setScript] = useState("");
	const [settings, setSettings] = useState<TeleprompterSettings>(
		DEFAULT_TELEPROMPTER_SETTINGS,
	);
	const [isPlaying, setIsPlaying] = useState(false);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [presetId, setPresetId] = useState("medium");
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const lastTickRef = useRef<number>(0);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isPlaying) return;
		const tick = (now: number) => {
			const last = lastTickRef.current || now;
			const delta = (now - last) / 1000;
			lastTickRef.current = now;
			const pxPerSec = settings.scrollSpeed;
			setScrollOffset((prev) => prev + pxPerSec * delta);
			rafRef.current = requestAnimationFrame(tick);
		};
		lastTickRef.current = 0;
		rafRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [isPlaying, settings.scrollSpeed]);

	const reset = () => {
		setIsPlaying(false);
		setScrollOffset(0);
	};

	const fullscreen = () => {
		const el = containerRef.current;
		if (!el) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			el.requestFullscreen?.();
		}
	};

	const copyScript = async () => {
		try {
			await navigator.clipboard.writeText(script);
		} catch {
			// ignore
		}
	};

	return (
		<div className="flex flex-col h-full bg-background text-foreground">
			<div className="border-b px-4 h-12 flex items-center justify-between">
				<div className="font-medium">Teleprompter</div>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={fullscreen}
						title="Fullscreen"
					>
						<HugeiconsIcon icon={ArrowExpandIcon} className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={copyScript}
						title="Copy script"
					>
						<HugeiconsIcon icon={Copy01Icon} className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>

			<div className="flex flex-1 overflow-hidden">
				<div className="w-72 border-r overflow-y-auto p-4 space-y-4">
					<div>
						<label
							className="text-xs font-medium text-muted-foreground"
							htmlFor="teleprompter-script"
						>
							Script
						</label>
						<Textarea
							id="teleprompter-script"
							value={script}
							onChange={(e) => setScript(e.target.value)}
							placeholder="Paste or type your script here..."
							className="mt-1.5 min-h-32"
						/>
					</div>

					<div className="space-y-2">
						<label
							className="text-xs font-medium text-muted-foreground"
							htmlFor="teleprompter-scroll-speed"
						>
							Scroll speed
						</label>
						<Select
							value={presetId}
							onValueChange={(v) => {
								setPresetId(v);
								const preset = SCROLL_PRESETS.find((p) => p.id === v);
								if (preset?.value != null) {
									setSettings((s) => ({ ...s, scrollSpeed: preset.value }));
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SCROLL_PRESETS.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Slider
							min={5}
							max={300}
							step={5}
							value={[settings.scrollSpeed]}
							onValueChange={(v) =>
								setSettings((s) => ({ ...s, scrollSpeed: v[0] ?? 60 }))
							}
						/>
						<div className="text-xs text-muted-foreground text-center">
							{Math.round(settings.scrollSpeed)} px/s
						</div>
					</div>

					<div className="space-y-2">
						<label
							className="text-xs font-medium text-muted-foreground"
							htmlFor="teleprompter-font-size"
						>
							Font size
						</label>
						<Slider
							min={20}
							max={120}
							step={2}
							value={[settings.fontSize]}
							onValueChange={(v) =>
								setSettings((s) => ({ ...s, fontSize: v[0] ?? 48 }))
							}
						/>
						<div className="text-xs text-muted-foreground text-center">
							{settings.fontSize}px
						</div>
					</div>

					<div className="space-y-2">
						<label
							className="text-xs font-medium text-muted-foreground"
							htmlFor="teleprompter-color"
						>
							Color
						</label>
						<input
							id="teleprompter-color"
							type="color"
							value={settings.textColor}
							onChange={(e) =>
								setSettings((s) => ({ ...s, textColor: e.target.value }))
							}
							className="w-full h-8 rounded border"
						/>
					</div>

					<div className="space-y-2">
						<label
							className="text-xs font-medium text-muted-foreground"
							htmlFor="teleprompter-background"
						>
							Background
						</label>
						<input
							id="teleprompter-background"
							type="color"
							value={settings.backgroundColor}
							onChange={(e) =>
								setSettings((s) => ({ ...s, backgroundColor: e.target.value }))
							}
							className="w-full h-8 rounded border"
						/>
					</div>

					<div className="flex items-center justify-between">
						<label className="text-xs" htmlFor="teleprompter-mirror">
							Mirror text
						</label>
						<Switch
							id="teleprompter-mirror"
							checked={settings.mirrored}
							onCheckedChange={(c) =>
								setSettings((s) => ({ ...s, mirrored: c }))
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<label className="text-xs" htmlFor="teleprompter-highlight">
							Highlight line
						</label>
						<Switch
							id="teleprompter-highlight"
							checked={settings.highlightLine}
							onCheckedChange={(c) =>
								setSettings((s) => ({ ...s, highlightLine: c }))
							}
						/>
					</div>

					<div className="flex gap-2 pt-2">
						<Button
							variant="default"
							className="flex-1"
							onClick={() => setIsPlaying(!isPlaying)}
						>
							<HugeiconsIcon
								icon={isPlaying ? StopIcon : PlayIcon}
								className="size-4 mr-1.5"
							/>
							{isPlaying ? "Pause" : "Play"}
						</Button>
						<Button variant="secondary" size="icon" onClick={reset}>
							<HugeiconsIcon icon={RefreshIcon} className="size-4" />
						</Button>
					</div>
				</div>

				<div
					ref={containerRef}
					className="flex-1 overflow-hidden"
					style={{ backgroundColor: settings.backgroundColor }}
				>
					<div
						className="h-full overflow-y-auto"
						style={{ transform: `translateY(${-scrollOffset}px)` }}
					>
						<div
							ref={textRef}
							className={cn(
								"px-12 py-32 leading-relaxed whitespace-pre-wrap",
								settings.mirrored && "[transform:scaleX(-1)]",
							)}
							style={{
								fontSize: `${settings.fontSize}px`,
								color: settings.textColor,
								lineHeight: 1.5,
							}}
						>
							{script || (
								<span className="opacity-50">
									Your script will appear here. Type or paste on the left.
								</span>
							)}
						</div>
					</div>

					{settings.highlightLine && isPlaying && (
						<div
							className="absolute left-12 right-12 pointer-events-none"
							style={{
								top: "50%",
								height: `${settings.fontSize * 1.6}px`,
								marginTop: `-${settings.fontSize * 0.8}px`,
								backgroundColor: "rgba(255, 255, 0, 0.15)",
								border: "2px solid rgba(255, 255, 0, 0.4)",
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
