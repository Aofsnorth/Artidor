"use client";

import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useOpenDialogsStore } from "@/stores/open-dialogs-store";
import { useEditorUIStore } from "@/stores/editor-ui-store";
import { useActionHandler } from "@/hooks/actions/use-action-handler";
import { useEditor } from "../use-editor";
import { useElementSelection } from "../timeline/element/use-element-selection";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { useKeyframeSelection } from "../timeline/element/use-keyframe-selection";
import {
	getElementsAtTime,
	hasMediaId,
	type TimelineElement,
	type TimelineTrack,
} from "@/lib/timeline";
import { cancelInteraction } from "@/lib/cancel-interaction";
import { invokeAction } from "@/lib/actions";
import {
	canToggleSourceAudio,
	doesElementHaveEnabledAudio,
} from "@/lib/timeline/audio-separation";
import { toast } from "sonner";
import { getElementKeyframes } from "@/lib/animation";
import {
	activateScope,
	clearActiveScope,
	type ScopeEntry,
} from "@/lib/selection/scope";
import {
	decodeAndCache,
	getCacheKey,
} from "@/components/editor/panels/timeline/audio-waveform";
import { yieldToEventLoop } from "@/lib/media/yield";

export function useEditorActions() {
	const editor = useEditor();
	const { selectedElements, setElementSelection } = useElementSelection();
	const { selectedKeyframes, clearKeyframeSelection } = useKeyframeSelection();
	const toggleSnapping = useTimelineStore((s) => s.toggleSnapping);
	const focusedKeyframePropertyPath = useTimelineStore(
		(s) => s.focusedKeyframePropertyPath,
	);
	const setFocusedKeyframePropertyPath = useTimelineStore(
		(s) => s.setFocusedKeyframePropertyPath,
	);
	const rippleEditingEnabled = useTimelineStore((s) => s.rippleEditingEnabled);
	const toggleRippleEditing = useTimelineStore((s) => s.toggleRippleEditing);
	const hasTimelineSelectionRef = useRef(false);
	const clearTimelineSelectionRef = useRef(() => {});
	const timelineScopeRef = useRef<ScopeEntry | null>(null);
	const hasTimelineSelection =
		selectedElements.length > 0 || selectedKeyframes.length > 0;

	const getSelectedKeyframeLayerPaths = () => {
		const scene = editor.scenes.getActiveScene();
		const tracks = Object.values(scene.tracks).flat() as TimelineTrack[];
		const paths = new Set<string>();
		for (const selectedElement of selectedElements) {
			const track = tracks.find(
				(track) => track.id === selectedElement.trackId,
			);
			const element = track?.elements.find(
				(element) => element.id === selectedElement.elementId,
			);
			for (const keyframe of getElementKeyframes({
				animations: element?.animations,
			})) {
				paths.add(keyframe.propertyPath);
			}
		}
		return [...paths];
	};

	const selectKeyframeLayer = ({ direction }: { direction: -1 | 1 }) => {
		const paths = getSelectedKeyframeLayerPaths();
		if (paths.length === 0) return;
		const currentIndex = Math.max(
			0,
			paths.indexOf(focusedKeyframePropertyPath ?? paths[0]),
		);
		const nextIndex = (currentIndex + direction + paths.length) % paths.length;
		setFocusedKeyframePropertyPath(paths[nextIndex]);
	};

	hasTimelineSelectionRef.current = hasTimelineSelection;
	clearTimelineSelectionRef.current = () => {
		setElementSelection({ elements: [] });
		clearKeyframeSelection();
	};

	if (!timelineScopeRef.current) {
		timelineScopeRef.current = {
			hasSelection: () => hasTimelineSelectionRef.current,
			clear: () => {
				clearTimelineSelectionRef.current();
			},
		};
	}

	useEffect(() => {
		if (!hasTimelineSelection) {
			return;
		}

		const timelineScope = timelineScopeRef.current;
		if (!timelineScope) {
			return;
		}

		return activateScope({ entry: timelineScope });
	}, [hasTimelineSelection]);

	useActionHandler(
		"toggle-play",
		() => {
			editor.playback.toggle();
		},
		undefined,
	);

	useActionHandler(
		"stop-playback",
		() => {
			if (editor.playback.getIsPlaying()) {
				editor.playback.toggle();
			}
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"seek-forward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"seek-backward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-forward",
		() => {
			const fps = editor.project.getActive().settings.fps;
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
			);
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + ticksPerFrame,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-backward",
		() => {
			const fps = editor.project.getActive().settings.fps;
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
			);
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - ticksPerFrame),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-forward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-backward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"goto-start",
		() => {
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"goto-end",
		() => {
			editor.playback.seek({ time: editor.timeline.getTotalDuration() });
		},
		undefined,
	);

	useActionHandler(
		"select-previous-keyframe-layer",
		() => selectKeyframeLayer({ direction: -1 }),
		undefined,
	);

	useActionHandler(
		"select-next-keyframe-layer",
		() => selectKeyframeLayer({ direction: 1 }),
		undefined,
	);

	useActionHandler(
		"split",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const tracks = editor.scenes.getActiveScene().tracks;
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
			});
		},
		undefined,
	);

	useActionHandler(
		"split-left",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const tracks = editor.scenes.getActiveScene().tracks;
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			const rightSideElements = editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "right",
			});

			if (rippleEditingEnabled && rightSideElements.length > 0) {
				const firstRightElement = editor.timeline.getElementsWithTracks({
					elements: [rightSideElements[0]],
				})[0];
				if (firstRightElement) {
					editor.playback.seek({ time: firstRightElement.element.startTime });
				}
			}
		},
		undefined,
	);

	useActionHandler(
		"split-right",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const tracks = editor.scenes.getActiveScene().tracks;
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "left",
			});
		},
		undefined,
	);

	useActionHandler(
		"delete-selected",
		() => {
			if (selectedKeyframes.length > 0) {
				editor.timeline.removeKeyframes({ keyframes: selectedKeyframes });
				clearKeyframeSelection();
				return;
			}
			if (selectedElements.length === 0) {
				return;
			}
			editor.timeline.deleteElements({
				elements: selectedElements,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-source-audio",
		() => {
			if (selectedElements.length !== 1) {
				return;
			}

			const selectedElement = editor.timeline.getElementsWithTracks({
				elements: selectedElements,
			})[0];
			if (!selectedElement) {
				return;
			}

			const mediaAsset = (() => {
				const { element } = selectedElement;
				if (!hasMediaId(element)) {
					return null;
				}

				return (
					editor.media
						.getAssets()
						.find((asset) => asset.id === element.mediaId) ?? null
				);
			})();
			if (!canToggleSourceAudio(selectedElement.element, mediaAsset)) {
				return;
			}

			editor.timeline.toggleSourceAudioSeparation({
				trackId: selectedElement.track.id,
				elementId: selectedElement.element.id,
			});
		},
		undefined,
	);

	useActionHandler(
		"select-all",
		() => {
			const scene = editor.scenes.getActiveScene();
			const allElements = [
				...scene.tracks.overlay,
				scene.tracks.main,
				...scene.tracks.audio,
			].flatMap((track) =>
				track.elements.map((element) => ({
					trackId: track.id,
					elementId: element.id,
				})),
			);
			setElementSelection({ elements: allElements });
		},
		undefined,
	);

	useActionHandler(
		"cancel-interaction",
		() => {
			if (!cancelInteraction()) {
				invokeAction("deselect-all");
			}
		},
		undefined,
	);

	useActionHandler(
		"deselect-all",
		() => {
			if (!clearActiveScope()) {
				setElementSelection({ elements: [] });
				clearKeyframeSelection();
			}
		},
		undefined,
	);

	useActionHandler(
		"duplicate-selected",
		() => {
			editor.timeline.duplicateElements({
				elements: selectedElements,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-muted-selected",
		() => {
			editor.timeline.toggleElementsMuted({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-visibility-selected",
		() => {
			editor.timeline.toggleElementsVisibility({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"fit-to-screen",
		() => {
			// The actual zoom math lives in the Timeline component
			// (because it needs the live viewport width). We just
			// broadcast a window event; the Timeline's listener
			// computes and applies the fit. This keeps the action
			// fully decoupled from the timeline component lifecycle.
			window.dispatchEvent(new CustomEvent("timeline-fit-to-screen"));
		},
		undefined,
	);

	useActionHandler(
		"toggle-bookmark",
		() => {
			editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
		},
		undefined,
	);

	useActionHandler(
		"toggle-element-bookmark",
		() => {
			if (selectedElements.length !== 1) {
				toast.info("Please select a single element to add a bookmark.");
				return;
			}
			const [selectedRef] = selectedElements;
			const track = editor.timeline.getTrackById({
				trackId: selectedRef.trackId,
			});
			const element = track?.elements.find(
				(el) => el.id === selectedRef.elementId,
			);
			if (!element) return;

			const currentTime = editor.playback.getCurrentTime();
			// The bookmark time should be relative to the element's inner time (source time).
			// element.trimStart + (currentTime - element.startTime)
			const relativeTime =
				element.trimStart + (currentTime - element.startTime);

			// Check if we are inside the element's bounds
			if (
				currentTime < element.startTime ||
				currentTime > element.startTime + element.duration
			) {
				toast.info("Playhead must be over the selected element.");
				return;
			}

			const existingBookmarks = element.bookmarks ?? [];
			// Toggle logic: if there is a bookmark near this time (e.g. within 0.1s), remove it.
			const threshold = 0.1 * TICKS_PER_SECOND;
			const existingIndex = existingBookmarks.findIndex(
				(b) => Math.abs(b.time - relativeTime) < threshold,
			);

			let newBookmarks: typeof existingBookmarks;
			if (existingIndex !== -1) {
				newBookmarks = existingBookmarks.filter((_, i) => i !== existingIndex);
			} else {
				newBookmarks = [...existingBookmarks, { time: relativeTime }];
			}

			editor.timeline.updateElements({
				updates: [
					{
						trackId: selectedRef.trackId,
						elementId: selectedRef.elementId,
						patch: { bookmarks: newBookmarks },
					},
				],
			});
		},
		undefined,
	);

	useActionHandler(
		"copy-selected",
		() => {
			editor.clipboard.copy();
		},
		undefined,
	);

	useActionHandler(
		"paste-copied",
		() => {
			editor.clipboard.paste();
		},
		undefined,
	);

	useActionHandler(
		"copy-style",
		() => {
			editor.clipboard.copyStyle();
		},
		undefined,
	);

	useActionHandler(
		"paste-style",
		() => {
			editor.clipboard.pasteStyle();
		},
		undefined,
	);

	useActionHandler(
		"paste-effect",
		() => {
			editor.clipboard.pasteEffect();
		},
		undefined,
	);

	useActionHandler(
		"toggle-snapping",
		() => {
			toggleSnapping();
		},
		undefined,
	);

	useActionHandler(
		"toggle-ripple-editing",
		() => {
			toggleRippleEditing();
		},
		undefined,
	);

	useActionHandler(
		"undo",
		() => {
			editor.command.undo();
		},
		undefined,
	);

	useActionHandler(
		"redo",
		() => {
			editor.command.redo();
		},
		undefined,
	);

	// todo: potnetially unify these two actions:
	useActionHandler(
		"remove-media-asset",
		(args) => {
			if (!args) return;
			editor.media.removeMediaAsset({
				projectId: args.projectId,
				id: args.assetId,
			});
		},
		undefined,
	);

	useActionHandler(
		"remove-media-assets",
		(args) => {
			if (!args) return;
			editor.media.removeMediaAssets({
				projectId: args.projectId,
				ids: args.assetIds,
			});
		},
		undefined,
	);

	// Group / ungroup / parent
	useActionHandler(
		"align-to-playhead",
		() => {
			if (selectedElements.length === 0) return;
			const playhead = editor.playback.getCurrentTime();
			const updates: Array<{
				trackId: string;
				elementId: string;
				patch: Record<string, number>;
			}> = [];

			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const element = track?.elements.find((el) => el.id === ref.elementId);
				if (!element) continue;
				const end = element.startTime + element.duration;
				const nextStart =
					playhead <= element.startTime
						? playhead
						: playhead - element.duration;
				if (playhead > element.startTime && playhead < end) continue;
				if (nextStart === element.startTime) continue;
				updates.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					patch: { startTime: Math.max(0, nextStart) },
				});
			}

			if (updates.length > 0) {
				editor.timeline.updateElements({ updates, pushHistory: true });
			}
		},
		undefined,
	);

	useActionHandler(
		"extend-to-playhead",
		() => {
			if (selectedElements.length === 0) return;
			const playhead = editor.playback.getCurrentTime();
			const updates: Array<{
				trackId: string;
				elementId: string;
				patch: Partial<TimelineElement>;
			}> = [];

			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const element = track?.elements.find((el) => el.id === ref.elementId);
				if (!element) continue;
				const end = element.startTime + element.duration;
				if (playhead > element.startTime && playhead < end) continue;

				const nextStart = Math.min(playhead, element.startTime);
				const nextEnd = Math.max(playhead, end);
				const nextDuration = nextEnd - nextStart;
				if (nextDuration === element.duration) continue;

				const patch: Partial<TimelineElement> = {
					startTime: nextStart,
					duration: nextDuration,
				};
				if (element.type === "video" && element.sourceDuration) {
					const sourceSpan = Math.max(
						1,
						element.sourceDuration - element.trimStart - element.trimEnd,
					);
					Object.assign(patch, {
						retime: {
							...(element.retime ?? { rate: 1 }),
							rate: sourceSpan / nextDuration,
							mode: "constant",
						},
					});
				}
				updates.push({ trackId: ref.trackId, elementId: ref.elementId, patch });
			}

			if (updates.length > 0) {
				editor.timeline.updateElements({ updates, pushHistory: true });
			}
		},
		undefined,
	);

	useActionHandler(
		"group-selected",
		() => {
			if (selectedElements.length < 1) return;
			editor.timeline.groupElements({ elementRefs: [...selectedElements] });
		},
		undefined,
	);

	useActionHandler(
		"combine-selected",
		() => {
			if (selectedElements.length < 1) return;
			editor.timeline.combineElements({ elementRefs: [...selectedElements] });
		},
		undefined,
	);

	useActionHandler(
		"ungroup-selected",
		() => {
			if (selectedElements.length === 0) return;
			const groupIds = new Set<string>();
			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const element = track?.elements.find((el) => el.id === ref.elementId);
				const gid = (element as { groupId?: string } | undefined)?.groupId;
				if (gid) groupIds.add(gid);
			}
			for (const gid of groupIds) {
				editor.timeline.ungroupElements({ groupId: gid });
			}
		},
		undefined,
	);

	// In/Out trim: clamp the selected clip's near edge to the playhead.
	// set-in moves the start to the playhead (shortening the head); set-out
	// moves the end to the playhead (shortening the tail). Both keep the clip
	// non-empty (at least one frame) and are single undoable updates.
	useActionHandler(
		"set-in",
		() => {
			if (selectedElements.length === 0) return;
			const playhead = editor.playback.getCurrentTime();
			const fps = editor.project.getActive().settings.fps;
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
			);
			const updates: Array<{
				trackId: string;
				elementId: string;
				patch: Record<string, number>;
			}> = [];
			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const el = track?.elements.find((e) => e.id === ref.elementId);
				if (!el) continue;
				const end = el.startTime + el.duration;
				const newStart = Math.max(
					el.startTime,
					Math.min(playhead, end - ticksPerFrame),
				);
				const delta = newStart - el.startTime;
				if (delta === 0) continue;
				updates.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					patch: {
						startTime: newStart,
						duration: el.duration - delta,
						trimStart: el.trimStart + delta,
					},
				});
			}
			if (updates.length > 0) {
				editor.timeline.updateElements({ updates, pushHistory: true });
			}
		},
		undefined,
	);

	useActionHandler(
		"set-out",
		() => {
			if (selectedElements.length === 0) return;
			const playhead = editor.playback.getCurrentTime();
			const fps = editor.project.getActive().settings.fps;
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
			);
			const updates: Array<{
				trackId: string;
				elementId: string;
				patch: Record<string, number>;
			}> = [];
			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const el = track?.elements.find((e) => e.id === ref.elementId);
				if (!el) continue;
				const newEnd = Math.max(
					el.startTime + ticksPerFrame,
					Math.min(playhead, el.startTime + el.duration),
				);
				const newDuration = newEnd - el.startTime;
				if (newDuration === el.duration) continue;
				updates.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					patch: {
						duration: newDuration,
						trimEnd: el.trimEnd + (el.duration - newDuration),
					},
				});
			}
			if (updates.length > 0) {
				editor.timeline.updateElements({ updates, pushHistory: true });
			}
		},
		undefined,
	);

	// Nudge: move the selected clip(s) by one frame, as a single command.
	const nudge = (direction: -1 | 1) => {
		if (selectedElements.length === 0) return;
		const fps = editor.project.getActive().settings.fps;
		const ticksPerFrame = Math.round(
			(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
		);
		for (const ref of selectedElements) {
			const track = editor.timeline.getTrackById({ trackId: ref.trackId });
			const el = track?.elements.find((e) => e.id === ref.elementId);
			if (!el) continue;
			const newStart = Math.max(0, el.startTime + direction * ticksPerFrame);
			editor.timeline.moveElement({
				sourceTrackId: ref.trackId,
				targetTrackId: ref.trackId,
				elementId: ref.elementId,
				newStartTime: newStart,
			});
		}
	};
	useActionHandler("nudge-left", () => nudge(-1), undefined);
	useActionHandler("nudge-right", () => nudge(1), undefined);

	useActionHandler(
		"ease-keyframes",
		() => {
			if (selectedKeyframes.length === 0) {
				toast.info("Select keyframes to apply Easy Ease.");
				return;
			}
			editor.timeline.applyEasyEase({ keyframes: selectedKeyframes });
		},
		undefined,
	);

	// Command palette + focus mode — UI chrome toggles.
	const setCommandPaletteOpen = useEditorUIStore(
		(s) => s.setCommandPaletteOpen,
	);
	const toggleFocusMode = useEditorUIStore((s) => s.toggleFocusMode);
	useActionHandler(
		"open-command-palette",
		() => setCommandPaletteOpen(true),
		undefined,
	);
	useActionHandler("toggle-focus-mode", () => toggleFocusMode(), undefined);

	const linkSelectedElements = () => {
		if (selectedElements.length !== 2) {
			toast.info("Select exactly 2 clips: child first, parent second.");
			return;
		}
		const [child, parent] = selectedElements;
		editor.timeline.setParent({
			ref: child,
			parentId: parent.elementId,
		});
	};

	useActionHandler("link-selected-elements", linkSelectedElements, undefined);
	useActionHandler("link-parent", linkSelectedElements, undefined);

	useActionHandler(
		"unlink-parent",
		() => {
			if (selectedElements.length === 0) {
				toast.info("Select a linked clip first.");
				return;
			}
			let changed = false;
			for (const ref of selectedElements) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const element = track?.elements.find((el) => el.id === ref.elementId);
				if (!(element as { parentId?: string } | undefined)?.parentId) continue;
				editor.timeline.unlinkParent({ ref });
				changed = true;
			}
			if (!changed) toast.info("Selected clips have no parent link.");
		},
		undefined,
	);

	useActionHandler(
		"add-bookmark",
		() => {
			editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
		},
		undefined,
	);

	useActionHandler(
		"add-beat-markers",
		async () => {
			if (selectedElements.length !== 1) {
				toast.info("Please select a single audio or video element.");
				return;
			}
			const [selectedRef] = selectedElements;
			const track = editor.timeline.getTrackById({
				trackId: selectedRef.trackId,
			});
			if (!track) return;
			const element = track.elements.find(
				(el) => el.id === selectedRef.elementId,
			);
			if (!element) return;

			const mediaAssets = editor.media.getAssets();
			const mediaAsset = hasMediaId(element)
				? (mediaAssets.find((a) => a.id === element.mediaId) ?? null)
				: null;

			if (element.type !== "audio" && element.type !== "video") {
				toast.info(
					"Beat markers can only be added to audio or video elements.",
				);
				return;
			}
			if (!doesElementHaveEnabledAudio({ element, mediaAsset })) {
				toast.info("Selected element does not have active audio.");
				return;
			}

			toast.loading("Analyzing beats...", { id: "beat-analysis" });

			try {
				let audioUrl: string | undefined;
				let mediaFile: File | undefined;

				if (element.type === "audio") {
					audioUrl =
						element.sourceType === "library"
							? element.sourceUrl
							: mediaAsset?.url;
					mediaFile =
						element.sourceType === "library" ? undefined : mediaAsset?.file;
				} else {
					audioUrl = mediaAsset?.url;
					mediaFile = mediaAsset?.file;
				}

				const cacheKey = getCacheKey(audioUrl, mediaFile);
				const decoded = await decodeAndCache(cacheKey, audioUrl, mediaFile);

				const peaks = decoded.peakBuffer;
				const safePeak = Math.max(decoded.globalPeak, 0.01);
				const logBase = Math.log1p(1);

				const newBookmarks = [...(element.bookmarks ?? [])];
				const _blockDurationTicks = (TICKS_PER_SECOND * 256) / 44100; // rough approximation, PEAK_BLOCK_SIZE=256 and ~44100 sampleRate

				// Scan for beats using the same heuristic as the visualizer.
				// Yield periodically so the UI stays responsive during large
				// audio files (the peak buffer can be tens of thousands of
				// entries for long clips).
				for (let i = 1; i < peaks.length - 1; i++) {
					if ((i & 4095) === 0) await yieldToEventLoop();
					const normalized = Math.min(1, peaks[i] / safePeak);
					const scaled = Math.log1p(normalized) / logBase;
					const leftPeak = peaks[i - 1] ?? 0;
					const rightPeak = peaks[i + 1] ?? 0;

					const isBeat =
						scaled > 0.32 && peaks[i] >= leftPeak && peaks[i] >= rightPeak;
					if (isBeat) {
						// i is the block index. PEAK_BLOCK_SIZE is 256
						// We don't have the exact sampleRate here, but typical is 44100
						// Actually we can approximate time using block duration
						// but wait, we need exact time. bufferLength is the total samples.
						// time = (i * 256) / sampleRate. sampleRate = bufferLength / sourceDurationSeconds
						const sourceDurationSeconds = element.sourceDuration
							? element.sourceDuration / TICKS_PER_SECOND
							: (element.duration + element.trimStart + element.trimEnd) /
								TICKS_PER_SECOND;

						const sampleRate = decoded.bufferLength / sourceDurationSeconds;
						const timeInSeconds = (i * 256) / sampleRate;
						const timeInTicks = Math.round(timeInSeconds * TICKS_PER_SECOND);

						// Only add if it's within the trimmed bounds
						const trimmedEnd =
							element.sourceDuration ??
							element.duration + element.trimStart + element.trimEnd;
						if (
							timeInTicks >= element.trimStart &&
							timeInTicks <= trimmedEnd - element.trimEnd
						) {
							// Avoid duplicates
							if (
								!newBookmarks.some(
									(b) =>
										Math.abs(b.time - timeInTicks) < TICKS_PER_SECOND * 0.1,
								)
							) {
								newBookmarks.push({ time: timeInTicks });
							}
						}
					}
				}

				editor.timeline.updateElements({
					updates: [
						{
							trackId: track.id,
							elementId: element.id,
							patch: { bookmarks: newBookmarks },
						},
					],
				});
				toast.success(
					`Added ${newBookmarks.length - (element.bookmarks?.length ?? 0)} beat markers!`,
					{ id: "beat-analysis" },
				);
			} catch (error) {
				console.error("Beat analysis failed", error);
				toast.error("Failed to analyze beats.", { id: "beat-analysis" });
			}
		},
		undefined,
	);

	useActionHandler(
		"reverse-clip",
		() => {
			// Implemented via the reverse-video hook used by the Quick Tools
			// panel; this action is mostly here so a keybinding can be bound.
			toast.info("Use the Tools panel → Reverse Video");
		},
		undefined,
	);

	useActionHandler(
		"stabilize-clip",
		() => {
			toast.info("Use the Tools panel → Stabilize");
		},
		undefined,
	);

	useActionHandler(
		"auto-reframe",
		() => {
			toast.info("Use the Tools panel → Auto Reframe");
		},
		undefined,
	);

	useActionHandler(
		"freeze-frame",
		() => {
			invokeAction("freeze-frame");
		},
		undefined,
	);

	const addCameraLayer = () => {
		editor.timeline.insertCameraLayer();
		toast.success("Camera layer added");
	};

	useActionHandler("add-camera", addCameraLayer, undefined);

	useActionHandler(
		"add-null-layer",
		() => {
			editor.timeline.insertNullLayer();
			toast.success("Null layer added");
		},
		undefined,
	);

	useActionHandler("insert-camera", addCameraLayer, undefined);

	useActionHandler(
		"open-teleprompter",
		() => {
			useOpenDialogsStore.getState().setOpen("teleprompter", true);
		},
		undefined,
	);

	useActionHandler(
		"open-templates",
		() => {
			useOpenDialogsStore.getState().setOpen("templates", true);
		},
		undefined,
	);
}
