import { useCallback, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { extractClipAudio } from "@/lib/media/mediabunny";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { detectBeats } from "@/lib/media/beat-detection";
import { toast } from "sonner";
import type { DetectedBeat } from "@/lib/media/beat-detection";
import type { AudioElement, VideoElement } from "@/lib/timeline";

export interface BeatSyncState {
	isAnalyzing: boolean;
	beats: DetectedBeat[];
	sourceElementId: string | null;
}

const DEFAULT_STATE: BeatSyncState = {
	isAnalyzing: false,
	beats: [],
	sourceElementId: null,
};

export function useBeatSync(): {
	state: BeatSyncState;
	analyze: () => Promise<void>;
	clear: () => void;
	apply: () => boolean;
} {
	const editor = useEditor();
	const [state, setState] = useState<BeatSyncState>(DEFAULT_STATE);

	const analyze = useCallback(async () => {
		const selected = editor.selection.getSelectedElements();
		if (selected.length !== 1) {
			toast.error("Select a single audio or video clip first");
			return;
		}
		const ref = selected[0];
		if (!ref) {
			toast.error("Select a single audio or video clip first");
			return;
		}
		const track = editor.timeline.getTrackById({ trackId: ref.trackId });
		const element = track?.elements.find((el) => el.id === ref.elementId);
		if (!element) {
			toast.error("Selected element not found");
			return;
		}
		if (element.type !== "audio" && element.type !== "video") {
			toast.error("Beat sync works on audio or video clips");
			return;
		}

		setState({ isAnalyzing: true, beats: [], sourceElementId: element.id });
		const id = toast.loading("Detecting beats...");

		try {
			const blob = await extractClipAudio({
				element: element as AudioElement | VideoElement,
				mediaAssets: editor.media.getAssets(),
			});
			const { samples, sampleRate } = await decodeAudioToFloat32({
				audioBlob: blob,
				sampleRate: 22050,
			});
			const beats = detectBeats({ samples, sampleRate });
			setState({
				isAnalyzing: false,
				beats,
				sourceElementId: element.id,
			});
			toast.success(
				beats.length > 0
					? `Detected ${beats.length} beats`
					: "No beats detected",
				{ id },
			);
		} catch (error) {
			console.error("Beat detection failed:", error);
			setState(DEFAULT_STATE);
			toast.error(
				error instanceof Error ? error.message : "Beat detection failed",
				{ id },
			);
		}
	}, [editor]);

	const clear = useCallback(() => setState(DEFAULT_STATE), []);

	const apply = useCallback((): boolean => {
		if (state.beats.length === 0) {
			toast.error("Run beat analysis first");
			return false;
		}
		const selected = editor.selection.getSelectedElements();
		if (selected.length === 0) {
			toast.error("Select elements to snap to beats");
			return false;
		}
		const tracks = editor.scenes.getActiveScene().tracks;
		const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];

		const updates: Array<{
			trackId: string;
			elementId: string;
			patch: { startTime: number };
		}> = [];

		const beatTimes = state.beats.map((b) => b.ticks);
		const sortedBeats = [...beatTimes].sort((a, b) => a - b);
		const firstBeat = sortedBeats[0];
		if (firstBeat === undefined) {
			toast.info("No beats detected");
			return false;
		}

		for (const ref of selected) {
			const track = orderedTracks.find((t) => t.id === ref.trackId);
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (!element) continue;

			const target =
				element.startTime >= firstBeat
					? (sortedBeats.find((b) => b >= element.startTime) ?? firstBeat)
					: firstBeat;
			updates.push({
				trackId: ref.trackId,
				elementId: ref.elementId,
				patch: { startTime: target },
			});
		}

		if (updates.length === 0) {
			toast.info("No elements needed snapping");
			return false;
		}
		editor.timeline.updateElements({ updates });
		toast.success(`Snapped ${updates.length} element(s) to beats`);
		return true;
	}, [editor, state.beats]);

	return { state, analyze, clear, apply };
}
