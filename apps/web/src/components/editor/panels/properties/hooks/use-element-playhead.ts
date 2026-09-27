import { useEditor } from "@/hooks/use-editor";
import { getElementLocalTime } from "@/lib/animation";
import { useCallback, useEffect, useRef, useState } from "react";

interface ElementPlayhead {
	localTime: number;
	isPlayheadWithinElementRange: boolean;
}

/**
 * Element-local playhead for the properties tabs.
 *
 * `playback-update` fires once per animation frame (~60/s). The values the
 * tabs render are *derived* from that time, and the derivation is a
 * projection: `localTime` is clamped to the element's own range and
 * `isPlayheadWithinElementRange` is a boolean. Whenever the playhead is
 * outside the element's time range — the common case while a long timeline
 * plays — the derived pair is bit-for-bit identical to the previous tick, so
 * publishing it re-rendered the whole active tab for nothing.
 *
 * `publishPlayheadTime` therefore only calls `setPlayheadTime` when the
 * derived pair actually changes. Precision is untouched: a tick that moves
 * the playhead inside the element's range still publishes on every frame, so
 * keyframe/graph read-outs keep per-frame accuracy — the fix removes
 * re-renders that provably could not change the output, nothing else.
 */
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

	// What the currently published `playheadTime` derives to, plus the
	// element range it was derived against. `null` means "publish the next
	// tick unconditionally" — used to seed the cache and to re-seed it after
	// the element itself moved, so the comparison can never suppress an
	// update the render would have shown.
	const derivedRef = useRef<{
		startTime: number;
		duration: number;
		values: ElementPlayhead;
	} | null>(null);
	const derived = derivedRef.current;
	if (
		derived !== null &&
		(derived.startTime !== startTime || derived.duration !== duration)
	) {
		derivedRef.current = null;
	}

	const publishPlayheadTime = useCallback(
		(time: number) => {
			const values: ElementPlayhead = {
				localTime: getElementLocalTime({
					timelineTime: time,
					elementStartTime: startTime,
					elementDuration: duration,
				}),
				isPlayheadWithinElementRange:
					time >= startTime && time <= startTime + duration,
			};
			const previous = derivedRef.current;
			if (
				previous !== null &&
				previous.values.localTime === values.localTime &&
				previous.values.isPlayheadWithinElementRange ===
					values.isPlayheadWithinElementRange
			) {
				return;
			}
			derivedRef.current = { startTime, duration, values };
			setPlayheadTime(time);
		},
		[duration, startTime],
	);

	useEffect(() => {
		const handlePlaybackUpdate = (e: Event) => {
			publishPlayheadTime((e as CustomEvent<{ time: number }>).detail.time);
		};

		// Sync initial value just in case it changed before mount
		publishPlayheadTime(editor.playback.getCurrentTime());

		window.addEventListener("playback-update", handlePlaybackUpdate);
		window.addEventListener("playback-seek", handlePlaybackUpdate);
		return () => {
			window.removeEventListener("playback-update", handlePlaybackUpdate);
			window.removeEventListener("playback-seek", handlePlaybackUpdate);
		};
	}, [editor.playback, publishPlayheadTime]);

	const localTime = getElementLocalTime({
		timelineTime: playheadTime,
		elementStartTime: startTime,
		elementDuration: duration,
	});
	const isPlayheadWithinElementRange =
		playheadTime >= startTime && playheadTime <= startTime + duration;

	return { localTime, isPlayheadWithinElementRange };
}
