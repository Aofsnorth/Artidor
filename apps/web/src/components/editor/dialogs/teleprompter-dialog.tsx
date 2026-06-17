"use client";

import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlayIcon, TextIcon } from "@hugeicons/core-free-icons";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";

/**
 * Floating teleprompter dialog.
 *
 * The teleprompter shows a script that scrolls upward while the user
 * records or performs. It reads/writes its content to the active
 * scene's metadata (under `teleprompterScript`) so the script is
 * persisted alongside the project. Playback speed and font size are
 * kept local to the dialog — they're reading aids, not creative
 * state.
 */
const DEFAULT_SCRIPT = `Welcome to Artidor!\n\nTell your story.\nHighlight the key beats.\nPause between sections for emphasis.\n\nPress Space to start auto-scrolling.`;

export function TeleprompterDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const activeScene = editor.scenes.getActiveSceneOrNull();

	const [script, setScript] = useState(
		(activeScene as { teleprompterScript?: string } | null)
			?.teleprompterScript ?? DEFAULT_SCRIPT,
	);
	const [isPlaying, setIsPlaying] = useState(false);
	const [fontSizePx, setFontSizePx] = useState(40);
	const [scrollSpeedPxPerSec, setScrollSpeedPxPerSec] = useState(40);

	const scrollRef = useRef<HTMLDivElement>(null);
	const lastTickRef = useRef<number | null>(null);

	// rAF-driven autoscroll. We read the previous frame's timestamp
	// each tick so the scroll speed is independent of the screen's
	// refresh rate; without it, a 120 Hz monitor scrolls ~2× faster
	// than a 60 Hz one at the same nominal speed.
	useEffect(() => {
		if (!isPlaying) return;
		let rafId: number;
		const tick = (now: number) => {
			const last = lastTickRef.current;
			lastTickRef.current = now;
			if (last != null) {
				const dtMs = now - last;
				const container = scrollRef.current;
				if (container) {
					container.scrollTop += (scrollSpeedPxPerSec * dtMs) / 1000;
					// Loop back to the top when we reach the bottom so
					// the user can keep recording without restarting.
					if (
						container.scrollTop + container.clientHeight >=
						container.scrollHeight - 1
					) {
						container.scrollTop = 0;
					}
				}
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(rafId);
			lastTickRef.current = null;
		};
	}, [isPlaying, scrollSpeedPxPerSec]);

	const handleSave = () => {
		// Persist to the active scene so reopening the dialog
		// (or restarting the app) restores the script.
		if (activeScene) {
			(activeScene as { teleprompterScript?: string }).teleprompterScript =
				script;
		}
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-white">
						<HugeiconsIcon icon={TextIcon} className="size-4" />
						Teleprompter
					</DialogTitle>
					<DialogDescription className="text-white/55">
						Read your script while recording. The text scrolls automatically
						when you press play.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<textarea
						value={script}
						onChange={(event) => setScript(event.target.value)}
						placeholder="Paste or write your script here…"
						className="min-h-[140px] w-full rounded-lg border border-white/[0.08] bg-black/30 p-3 text-sm leading-relaxed text-white/85 placeholder:text-white/30 focus:border-white/20 focus:outline-none"
					/>

					<div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-white/55">
						<label className="flex items-center gap-2">
							<span className="font-semibold uppercase tracking-wide">
								Font
							</span>
							<input
								type="range"
								min={20}
								max={80}
								value={fontSizePx}
								onChange={(event) => setFontSizePx(Number(event.target.value))}
								className="w-28 accent-white"
							/>
							<span className="tabular-nums">{fontSizePx}px</span>
						</label>

						<label className="flex items-center gap-2">
							<span className="font-semibold uppercase tracking-wide">
								Speed
							</span>
							<input
								type="range"
								min={5}
								max={150}
								value={scrollSpeedPxPerSec}
								onChange={(event) =>
									setScrollSpeedPxPerSec(Number(event.target.value))
								}
								className="w-28 accent-white"
							/>
							<span className="tabular-nums">{scrollSpeedPxPerSec}px/s</span>
						</label>

						<Button
							variant={isPlaying ? "secondary" : "default"}
							size="sm"
							onClick={() => setIsPlaying((value) => !value)}
							className="ml-auto"
						>
							<HugeiconsIcon
								icon={isPlaying ? Cancel01Icon : PlayIcon}
								className="size-3.5"
							/>
							{isPlaying ? "Pause" : "Play"}
						</Button>
					</div>

					<div
						ref={scrollRef}
						className={cn(
							"h-[260px] overflow-y-auto rounded-lg border border-white/[0.08] bg-black/50 p-6 text-center font-semibold leading-tight text-white",
						)}
						style={{ fontSize: `${fontSizePx}px` }}
					>
						{script.split("\n").map((line, index) => (
							<p key={index} className="my-6">
								{line || " "}
							</p>
						))}
						<p className="my-6">· · ·</p>
					</div>

					<div className="flex items-center justify-end gap-2 pt-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button variant="default" size="sm" onClick={handleSave}>
							Save script
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
