"use client";

import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useActionHandler } from "@/hooks/actions/use-action-handler";
import { useEditor } from "../use-editor";
import { useElementSelection } from "../timeline/element/use-element-selection";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { useKeyframeSelection } from "../timeline/element/use-keyframe-selection";
import { getElementsAtTime, hasMediaId } from "@/lib/timeline";
import { cancelInteraction } from "@/lib/cancel-interaction";
import { invokeAction } from "@/lib/actions";
import { canToggleSourceAudio } from "@/lib/timeline/audio-separation";
import { toast } from "sonner";
import {
	activateScope,
	clearActiveScope,
	type ScopeEntry,
} from "@/lib/selection/scope";

export function useEditorActions() {
	const editor = useEditor();
	const { selectedElements, setElementSelection } = useElementSelection();
	const { selectedKeyframes, clearKeyframeSelection } = useKeyframeSelection();
	const toggleSnapping = useTimelineStore((s) => s.toggleSnapping);
	const rippleEditingEnabled = useTimelineStore((s) => s.rippleEditingEnabled);
	const toggleRippleEditing = useTimelineStore((s) => s.toggleRippleEditing);
	const hasTimelineSelectionRef = useRef(false);
	const clearTimelineSelectionRef = useRef(() => {});
	const timelineScopeRef = useRef<ScopeEntry | null>(null);
	const hasTimelineSelection =
		selectedElements.length > 0 || selectedKeyframes.length > 0;

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
		"toggle-bookmark",
		() => {
			editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
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
		"group-selected",
		() => {
			if (selectedElements.length < 2) return;
			editor.timeline.groupElements({ elementRefs: [...selectedElements] });
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

	useActionHandler(
		"link-parent",
		() => {
			if (selectedElements.length !== 2) return;
			// Default linking: first selected = child, second = parent.
			const child = selectedElements[0]!;
			const parent = selectedElements[1]!;
			editor.timeline.setParent({
				ref: child,
				parentId: parent.elementId,
			});
		},
		undefined,
	);

	useActionHandler(
		"unlink-parent",
		() => {
			if (selectedElements.length === 0) return;
			for (const ref of selectedElements) {
				editor.timeline.unlinkParent({ ref });
			}
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
		() => {
			invokeAction("add-beat-markers");
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

	useActionHandler(
		"add-camera",
		() => {
			editor.timeline.insertCameraLayer();
		},
		undefined,
	);

	useActionHandler(
		"add-null-layer",
		() => {
			editor.timeline.insertNullLayer();
		},
		undefined,
	);

	useActionHandler(
		"insert-camera",
		() => {
			editor.timeline.insertCameraLayer();
		},
		undefined,
	);

	useActionHandler(
		"open-teleprompter",
		() => {
			editor.teleprompter.open();
		},
		undefined,
	);

	useActionHandler(
		"open-templates",
		() => {
			editor.teleprompter.open(); // we reuse a generic "secondary panel" call
		},
		undefined,
	);
}
