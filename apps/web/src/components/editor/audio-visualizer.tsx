"use client";

import { memo, useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { cn } from "@/utils/ui";

const MINI_BARS = [0, 1, 2, 3, 4];
const IDLE_SCALE = 0.15;

/** A live toolbar toggle for the inline side meter, not an overlay. */
export const MiniAudioVisualizer = memo(function MiniAudioVisualizer() {
	const isOpen = useUiOverlayStore((state) => state.isAudioVisualizerOpen);
	const toggle = useUiOverlayStore((state) => state.toggleAudioVisualizer);
	const editor = useEditor();
	const isPlaying = useEditor((core) => core.playback.getIsPlaying(), ["playback"]);
	const barRefs = useRef<Array<HTMLDivElement | null>>([]);

	useEffect(() => {
		for (const bar of barRefs.current) {
			if (bar) bar.style.transform = `scaleY(${IDLE_SCALE})`;
		}
		if (!isPlaying) return;

		let frameId = 0;
		let data: Uint8Array<ArrayBuffer> | null = null;
		const tick = () => {
			frameId = 0;
			if (document.hidden) return;
			// Audio is initialized lazily, and can be replaced during playback.
			const { left, right } = editor.audio.getAnalysers();
			const analyser = left ?? right;
			if (analyser) {
				const bins = analyser.frequencyBinCount;
				if (data?.length !== bins) data = new Uint8Array(bins);
				analyser.getByteFrequencyData(data);
				for (const index of MINI_BARS) {
					const start = Math.floor((index * bins) / MINI_BARS.length);
					const end = Math.floor(((index + 1) * bins) / MINI_BARS.length);
					let sum = 0;
					for (let bin = start; bin < end; bin++) sum += data[bin];
					const level = Math.sqrt(sum / Math.max(1, end - start) / 255);
					const bar = barRefs.current[index];
					if (bar) bar.style.transform = `scaleY(${Math.max(IDLE_SCALE, level)})`;
				}
			} else {
				for (const bar of barRefs.current) {
					if (bar) bar.style.transform = `scaleY(${IDLE_SCALE})`;
				}
			}
			frameId = requestAnimationFrame(tick);
		};
		const onVisibilityChange = () => {
			cancelAnimationFrame(frameId);
			frameId = document.hidden ? 0 : requestAnimationFrame(tick);
		};
		onVisibilityChange();
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			cancelAnimationFrame(frameId);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [editor, isPlaying]);

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			aria-pressed={isOpen}
			aria-controls={isOpen ? "side-audio-meter" : undefined}
			title={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			className={cn(
				"flex h-7 cursor-pointer items-center justify-center overflow-hidden rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:min-h-11 pointer-coarse:min-w-11",
				isOpen
					? "border-secondary-border bg-secondary text-foreground"
					: "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			<div aria-hidden="true" className="flex h-5 items-end gap-0.5">
				{MINI_BARS.map((index) => (
					<div
						key={index}
						ref={(element) => { barRefs.current[index] = element; }}
						className="h-full w-0.5 origin-bottom rounded-[1px] bg-current"
						style={{ transform: `scaleY(${IDLE_SCALE})` }}
					/>
				))}
			</div>
		</button>
	);
});
