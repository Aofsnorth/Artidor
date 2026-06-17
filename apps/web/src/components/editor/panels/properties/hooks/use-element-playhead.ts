import { useEditor } from "@/hooks/use-editor";
import { getElementLocalTime } from "@/lib/animation";
import { useEffect, useState } from "react";

export function useElementPlayhead({
	startTime,
	duration,
}: {
	startTime: number;
	duration: number;
}) {
	const editor = useEditor();
	const [playheadTime, setPlayheadTime] = useState(() =>
		editor.playback.getCurrentTime(),
	);

	useEffect(() => {
		const handlePlaybackUpdate = (e: Event) => {
			const time = (e as CustomEvent<{ time: number }>).detail.time;
			setPlayheadTime(time);
		};

		// Sync initial value just in case it changed before mount
		setPlayheadTime(editor.playback.getCurrentTime());

		window.addEventListener("playback-update", handlePlaybackUpdate);
		window.addEventListener("playback-seek", handlePlaybackUpdate);
		return () => {
			window.removeEventListener("playback-update", handlePlaybackUpdate);
			window.removeEventListener("playback-seek", handlePlaybackUpdate);
		};
	}, [editor.playback]);

	const localTime = getElementLocalTime({
		timelineTime: playheadTime,
		elementStartTime: startTime,
		elementDuration: duration,
	});
	const isPlayheadWithinElementRange =
		playheadTime >= startTime && playheadTime <= startTime + duration;

	return { localTime, isPlayheadWithinElementRange };
}
