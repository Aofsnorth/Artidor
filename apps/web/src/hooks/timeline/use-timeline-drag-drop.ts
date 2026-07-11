import { useState, useCallback, useEffect, type RefObject } from "react";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { showMediaUploadToast } from "@/lib/media/upload-toast";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/lib/timeline/creation";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { roundToFrame } from "artidor-wasm";
import { snapElementEdge } from "@/lib/timeline/snap-utils";
import { useTimelineStore } from "@/stores/timeline-store";
import {
	buildTextElement,
	buildGraphicElement,
	buildStickerElement,
	buildElementFromMedia,
	buildEffectElement,
} from "@/lib/timeline/element-utils";
import {
	AddTrackCommand,
	InsertElementCommand,
	PasteCommand,
} from "@/lib/commands/timeline";
import { BatchCommand } from "@/lib/commands";
import { computeDropTarget } from "@/components/editor/panels/timeline/drop-target";
import { getDragData, hasDragData } from "@/lib/drag-data";
import type { TrackType, DropTarget, ElementType } from "@/lib/timeline";
import type {
	MediaDragData,
	GraphicDragData,
	StickerDragData,
	EffectDragData,
	PresetDragData,
	TextDragData,
} from "@/lib/timeline/drag";
import { textPresets } from "@/lib/text/presets";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { usePresetsStore } from "@/stores/presets-store";
import { presetToClipboardItems } from "@/lib/presets";

/**
 * Sensible defaults applied when a text drag carries only `name`/`content`
 * (e.g. dragging from a quick-add menu). Mirrors the base defaults used
 * by `buildTextElement` so the result is always a complete, renderable
 * element rather than a half-populated one.
 */
const TEXT_ELEMENT_BUILD_DEFAULTS = {
	duration: DEFAULT_NEW_ELEMENT_DURATION,
	trimStart: 0,
	trimEnd: 0,
	textAlign: "center" as const,
	fontWeight: "normal" as const,
	fontStyle: "normal" as const,
	textDecoration: "none" as const,
	letterSpacing: 0,
	lineHeight: 1.2,
	hidden: false,
	transform: {
		scaleX: 1,
		scaleY: 1,
		position: { x: 0, y: 0 },
		rotate: 0,
	},
	opacity: 1,
};

interface UseTimelineDragDropProps {
	containerRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	tracksScrollRef?: RefObject<HTMLDivElement | null>;
	zoomLevel: number;
}

export function useTimelineDragDrop({
	containerRef,
	headerRef,
	tracksScrollRef,
	zoomLevel,
}: UseTimelineDragDropProps) {
	const editor = useEditor();
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const [isDragOver, setIsDragOver] = useState(false);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
	const [dragElementType, setElementType] = useState<ElementType | null>(null);

	const getSnappedTime = useCallback(
		({ time }: { time: number }) => {
			const projectFps = editor.project.getActive().settings.fps;
			return roundToFrame({ time, rate: projectFps }) ?? time;
		},
		[editor],
	);

	const getElementType = useCallback(
		({ dataTransfer }: { dataTransfer: DataTransfer }): ElementType | null => {
			const dragData = getDragData({ dataTransfer });
			if (!dragData) return null;

			if (dragData.type === "text") return "text";
			if (dragData.type === "graphic") return "graphic";
			if (dragData.type === "sticker") return "sticker";
			if (dragData.type === "effect") return "effect";
			if (dragData.type === "media") {
				return dragData.mediaType;
			}
			return null;
		},
		[],
	);

	const getElementDuration = useCallback(
		({
			elementType,
			mediaId,
		}: {
			elementType: ElementType;
			mediaId?: string;
		}): number => {
			if (
				elementType === "text" ||
				elementType === "graphic" ||
				elementType === "sticker" ||
				elementType === "effect"
			) {
				return DEFAULT_NEW_ELEMENT_DURATION;
			}
			if (mediaId) {
				const mediaAssets = editor.media.getAssets();
				const media = mediaAssets.find((m) => m.id === mediaId);
				return media?.duration != null
					? Math.round(media.duration * TICKS_PER_SECOND)
					: DEFAULT_NEW_ELEMENT_DURATION;
			}
			return DEFAULT_NEW_ELEMENT_DURATION;
		},
		[editor],
	);

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
		const hasFiles = e.dataTransfer.types.includes("Files");
		if (!hasAsset && !hasFiles) return;
		setIsDragOver(true);
	}, []);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();

			const scrollContainer = tracksScrollRef?.current;
			const referenceRect =
				scrollContainer?.getBoundingClientRect() ??
				containerRef.current?.getBoundingClientRect();
			if (!referenceRect) return;

			const headerHeight =
				headerRef?.current?.getBoundingClientRect().height ?? 0;
			const scrollLeft = scrollContainer?.scrollLeft ?? 0;
			const scrollTop = scrollContainer?.scrollTop ?? 0;
			const hasFiles = e.dataTransfer.types.includes("Files");
			const isExternal =
				hasFiles && !hasDragData({ dataTransfer: e.dataTransfer });

			const elementType = getElementType({ dataTransfer: e.dataTransfer });

			if (!elementType && hasFiles && isExternal) {
				setDropTarget(null);
				setElementType(null);
				return;
			}

			if (!elementType) return;

			setElementType(elementType);

			const dragData = getDragData({ dataTransfer: e.dataTransfer });
			const duration = getElementDuration({
				elementType,
				mediaId: dragData?.type === "media" ? dragData.id : undefined,
			});

			const mouseX = e.clientX - referenceRect.left + scrollLeft;
			const mouseY = e.clientY - referenceRect.top + scrollTop - headerHeight;

			const targetElementTypes =
				dragData?.type === "effect"
					? (dragData as EffectDragData).targetElementTypes
					: dragData?.type === "media"
						? (dragData as MediaDragData).targetElementTypes
						: undefined;

			const sceneTracks = editor.scenes.getActiveScene().tracks;
			const currentTime = editor.playback.getCurrentTime();
			const target = computeDropTarget({
				elementType,
				mouseX,
				mouseY,
				tracks: sceneTracks,
				playheadTime: currentTime,
				isExternalDrop: isExternal,
				elementDuration: duration,
				pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
				zoomLevel,
				targetElementTypes,
			});

			// Magnet snap for external drops (file drops from OS, library
			// tiles): when snapping is enabled, snap the new clip's start
			// OR end edge to the nearest existing clip edge within the
			// default snap threshold. Mirrors the behaviour used by the
			// internal drag interaction so the magnet toggle behaves
			// consistently regardless of drag source.
			if (isExternal && snappingEnabled) {
				const startSnap = snapElementEdge({
					targetTime: target.xPosition,
					elementDuration: duration,
					tracks: sceneTracks,
					playheadTime: currentTime,
					zoomLevel,
					snapToStart: true,
				});
				const endSnap = snapElementEdge({
					targetTime: target.xPosition,
					elementDuration: duration,
					tracks: sceneTracks,
					playheadTime: currentTime,
					zoomLevel,
					snapToStart: false,
				});
				const best =
					startSnap.snapDistance <= endSnap.snapDistance ? startSnap : endSnap;
				if (best.snapPoint) {
					target.xPosition = best.snappedTime;
				}
			}

			target.xPosition = getSnappedTime({ time: target.xPosition });

			setDropTarget(target);
			e.dataTransfer.dropEffect = "copy";
		},
		[
			containerRef,
			headerRef,
			tracksScrollRef,
			zoomLevel,
			getElementType,
			getElementDuration,
			getSnappedTime,
			editor,
			snappingEnabled,
		],
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				const { clientX, clientY } = e;
				if (
					clientX < rect.left ||
					clientX > rect.right ||
					clientY < rect.top ||
					clientY > rect.bottom
				) {
					setIsDragOver(false);
					setDropTarget(null);
					setElementType(null);
				}
			}
		},
		[containerRef],
	);

	const executeTextDrop = useCallback(
		({ target, dragData }: { target: DropTarget; dragData: TextDragData }) => {
			// Prefer the full preset build (carries the original font,
			// background, animation, etc.) over the slim name+content
			// fallback so drag-and-drop matches click-to-add styling.
			let raw: Omit<import("@/lib/timeline").TextElement, "id" | "startTime">;
			if (dragData.presetId) {
				const preset = textPresets.find((p) => p.id === dragData.presetId);
				if (preset) {
					raw = preset.build();
				} else {
					raw = {
						...TEXT_ELEMENT_BUILD_DEFAULTS,
						fontSize: DEFAULTS.text.element.fontSize,
						fontFamily: DEFAULTS.text.element.fontFamily,
						color: DEFAULTS.text.element.color,
						background: { ...DEFAULTS.text.element.background },
						name: dragData.name ?? "Text",
						content: dragData.content ?? "",
						type: "text",
					};
				}
			} else {
				raw = {
					...TEXT_ELEMENT_BUILD_DEFAULTS,
					fontSize: DEFAULTS.text.element.fontSize,
					fontFamily: DEFAULTS.text.element.fontFamily,
					color: DEFAULTS.text.element.color,
					background: { ...DEFAULTS.text.element.background },
					name: dragData.name ?? "Text",
					content: dragData.content ?? "",
					type: "text",
				};
			}

			const element = buildTextElement({
				raw,
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("text", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = [
				...editor.scenes.getActiveScene().tracks.overlay,
				editor.scenes.getActiveScene().tracks.main,
				...editor.scenes.getActiveScene().tracks.audio,
			];
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeStickerDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: StickerDragData;
		}) => {
			const element = buildStickerElement({
				stickerId: dragData.stickerId,
				name: dragData.name,
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("graphic", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = [
				...editor.scenes.getActiveScene().tracks.overlay,
				editor.scenes.getActiveScene().tracks.main,
				...editor.scenes.getActiveScene().tracks.audio,
			];
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeGraphicDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: GraphicDragData;
		}) => {
			const element = buildGraphicElement({
				definitionId: dragData.definitionId,
				name: dragData.name,
				startTime: target.xPosition,
				params: dragData.params,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("graphic", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = [
				...editor.scenes.getActiveScene().tracks.overlay,
				editor.scenes.getActiveScene().tracks.main,
				...editor.scenes.getActiveScene().tracks.audio,
			];
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeMediaDrop = useCallback(
		({ target, dragData }: { target: DropTarget; dragData: MediaDragData }) => {
			if (target.targetElement) {
				const targetTrack = editor.timeline.getTrackById({
					trackId: target.targetElement.trackId,
				});
				const targetElement = targetTrack?.elements.find(
					(element) => element.id === target.targetElement?.elementId,
				);
				if (targetElement?.type === dragData.mediaType) {
					editor.timeline.updateElements({
						updates: [
							{
								trackId: target.targetElement.trackId,
								elementId: target.targetElement.elementId,
								patch: { mediaId: dragData.id },
							},
						],
					});
					return;
				}
			}

			const mediaAssets = editor.media.getAssets();
			const mediaAsset = mediaAssets.find((m) => m.id === dragData.id);
			if (!mediaAsset) return;

			const trackType: TrackType =
				dragData.mediaType === "audio" ? "audio" : "video";

			const duration =
				mediaAsset.duration != null
					? Math.round(mediaAsset.duration * TICKS_PER_SECOND)
					: DEFAULT_NEW_ELEMENT_DURATION;
			const element = buildElementFromMedia({
				mediaId: mediaAsset.id,
				mediaType: mediaAsset.type,
				name: mediaAsset.name,
				duration,
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand(trackType, target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const sceneTracks = editor.scenes.getActiveScene().tracks;
			const orderedTracks = [
				...sceneTracks.overlay,
				sceneTracks.main,
				...sceneTracks.audio,
			];
			const track = orderedTracks[target.trackIndex];
			if (!track) return;

			const elementTypeForTrack =
				dragData.mediaType === "audio"
					? "audio"
					: dragData.mediaType === "image"
						? "image"
						: "video";
			const dropOnMainVideoTrack =
				track.id === sceneTracks.main.id && elementTypeForTrack === "image";
			if (dropOnMainVideoTrack) {
				target.isNewTrack = true;
				target.trackIndex = sceneTracks.overlay.length;
				const overlayIndex = sceneTracks.overlay.length;
				const addTrackCmd = new AddTrackCommand("video", overlayIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeEffectDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: EffectDragData;
		}) => {
			if (target.targetElement) {
				editor.timeline.addClipEffect({
					trackId: target.targetElement.trackId,
					elementId: target.targetElement.elementId,
					effectType: dragData.effectType,
				});
				return;
			}

			const tracks = [
				...editor.scenes.getActiveScene().tracks.overlay,
				editor.scenes.getActiveScene().tracks.main,
				...editor.scenes.getActiveScene().tracks.audio,
			];
			const effectTrack = tracks.find((t) => t.type === "effect");
			let trackId: string;

			if (effectTrack) {
				trackId = effectTrack.id;
			} else if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("effect", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element: buildEffectElement({
						effectType: dragData.effectType,
						startTime: target.xPosition,
					}),
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			} else {
				const track = tracks[target.trackIndex];
				if (track?.type !== "effect") return;
				trackId = track.id;
			}

			const element = buildEffectElement({
				effectType: dragData.effectType,
				startTime: target.xPosition,
			});

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});
		},
		[editor],
	);

	/**
	 * Drop handler for user-saved presets. Pulls the preset out of the
	 * presets store by id, hands the layer(s) to `presetToClipboardItems`
	 * to mint fresh element + track ids, and runs the existing
	 * `PasteCommand` at the drop time. Style, transform, animation,
	 * effect, and timing all round-trip because the preset already
	 * stores the full element minus its id.
	 */
	const executePresetDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: PresetDragData;
		}) => {
			const preset = usePresetsStore
				.getState()
				.presets.find((p) => p.id === dragData.presetId);
			if (!preset) return;

			const clipboardItems = presetToClipboardItems({ preset });
			const insertCmd = new PasteCommand({
				time: target.xPosition,
				clipboardItems,
			});
			editor.command.execute({ command: insertCmd });
		},
		[editor],
	);

	const executeFileDrop = useCallback(
		async ({
			files,
			mouseX,
			mouseY,
		}: {
			files: File[];
			mouseX: number;
			mouseY: number;
		}) => {
			const activeProject = editor.project.getActiveOrNull();
			if (!activeProject) return;

			await showMediaUploadToast({
				filesCount: files.length,
				promise: async () => {
					const processedAssets = await processMediaAssets({ files });
					const projectId = activeProject.metadata.id;

					for (const asset of processedAssets) {
						const createdAsset = await editor.media.addMediaAsset({
							projectId,
							asset,
						});
						if (!createdAsset) continue;

						const duration =
							createdAsset.duration != null
								? Math.round(createdAsset.duration * TICKS_PER_SECOND)
								: DEFAULT_NEW_ELEMENT_DURATION;
						const sceneTracks = editor.scenes.getActiveScene().tracks;
						const currentTime = editor.playback.getCurrentTime();
						const reuseMainTrackId =
							createdAsset.type !== "audio" &&
							sceneTracks.overlay.length === 0 &&
							sceneTracks.audio.length === 0 &&
							sceneTracks.main.elements.length === 0
								? sceneTracks.main.id
								: null;
						let dropTarget = reuseMainTrackId
							? null
							: computeDropTarget({
									elementType: createdAsset.type,
									mouseX,
									mouseY,
									tracks: sceneTracks,
									playheadTime: currentTime,
									isExternalDrop: true,
									elementDuration: duration,
									pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
									zoomLevel,
								});

						// Magnet snap for OS file drops: this path runs after
						// the user releases the mouse, so it can't reuse the
						// drag-over `dropTarget` state. Re-apply the same
						// snap-to-adjacent logic that handleDragOver uses
						// for library-asset drags.
						if (dropTarget && snappingEnabled) {
							const startSnap = snapElementEdge({
								targetTime: dropTarget.xPosition,
								elementDuration: duration,
								tracks: sceneTracks,
								playheadTime: currentTime,
								zoomLevel,
								snapToStart: true,
							});
							const endSnap = snapElementEdge({
								targetTime: dropTarget.xPosition,
								elementDuration: duration,
								tracks: sceneTracks,
								playheadTime: currentTime,
								zoomLevel,
								snapToStart: false,
							});
							const best =
								startSnap.snapDistance <= endSnap.snapDistance
									? startSnap
									: endSnap;
							if (best.snapPoint) {
								dropTarget = { ...dropTarget, xPosition: best.snappedTime };
							}
						}

						const trackType: TrackType =
							createdAsset.type === "audio" ? "audio" : "video";

						let trackId: string | undefined;
						if (reuseMainTrackId) {
							trackId = reuseMainTrackId;
						} else {
							if (!dropTarget) continue;
							if (dropTarget.isNewTrack) {
								const addTrackCmd = new AddTrackCommand(
									trackType,
									dropTarget.trackIndex,
								);
								trackId = addTrackCmd.getTrackId();
								editor.command.execute({ command: addTrackCmd });
							} else {
								trackId = [
									...sceneTracks.overlay,
									sceneTracks.main,
									...sceneTracks.audio,
								][dropTarget.trackIndex]?.id;
							}
						}

						if (!trackId) continue;

						const element = buildElementFromMedia({
							mediaId: createdAsset.id,
							mediaType: createdAsset.type,
							name: createdAsset.name,
							duration,
							startTime: dropTarget?.xPosition ?? currentTime,
							buffer:
								createdAsset.type === "audio"
									? new AudioBuffer({ length: 1, sampleRate: 44100 })
									: undefined,
						});

						const insertCmd = new InsertElementCommand({
							element,
							placement: { mode: "explicit", trackId },
						});
						editor.command.execute({ command: insertCmd });
					}

					return {
						uploadedCount: processedAssets.length,
						assetNames: processedAssets.map((asset) => asset.name),
					};
				},
			});
		},
		[editor, zoomLevel, snappingEnabled],
	);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();

			const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
			const hasFiles = e.dataTransfer.files?.length > 0;

			if (!hasAsset && !hasFiles) return;

			const currentTarget = dropTarget;
			setIsDragOver(false);
			setDropTarget(null);
			setElementType(null);

			try {
				if (hasAsset) {
					if (!currentTarget) return;
					const dragData = getDragData({ dataTransfer: e.dataTransfer });
					if (!dragData) return;

					if (dragData.type === "text") {
						executeTextDrop({ target: currentTarget, dragData });
					} else if (dragData.type === "graphic") {
						executeGraphicDrop({
							target: currentTarget,
							dragData: dragData as GraphicDragData,
						});
					} else if (dragData.type === "sticker") {
						executeStickerDrop({ target: currentTarget, dragData });
					} else if (dragData.type === "effect") {
						executeEffectDrop({
							target: currentTarget,
							dragData: dragData as EffectDragData,
						});
					} else if (dragData.type === "preset") {
						executePresetDrop({
							target: currentTarget,
							dragData: dragData as PresetDragData,
						});
					} else {
						executeMediaDrop({ target: currentTarget, dragData });
					}
				} else if (hasFiles) {
					const scrollContainer = tracksScrollRef?.current;
					const referenceRect =
						scrollContainer?.getBoundingClientRect() ??
						containerRef.current?.getBoundingClientRect();
					if (!referenceRect) return;
					const scrollLeft = scrollContainer?.scrollLeft ?? 0;
					const scrollTop = scrollContainer?.scrollTop ?? 0;
					const mouseX = e.clientX - referenceRect.left + scrollLeft;
					const headerHeight =
						headerRef?.current?.getBoundingClientRect().height ?? 0;
					const mouseY =
						e.clientY - referenceRect.top + scrollTop - headerHeight;
					await executeFileDrop({
						files: Array.from(e.dataTransfer.files),
						mouseX,
						mouseY,
					});
				}
			} catch (err) {
				console.error("Failed to process drop:", err);
			}
		},
		[
			dropTarget,
			executeTextDrop,
			executeGraphicDrop,
			executeStickerDrop,
			executeMediaDrop,
			executeEffectDrop,
			executePresetDrop,
			executeFileDrop,
			containerRef,
			headerRef,
			tracksScrollRef,
		],
	);

	// Safety net: alt-tabbing / switching windows mid-drag may skip the
	// dragleave/drop events, leaving the drop indicator stuck. Reset the
	// drag-over state on window blur, tab hide, and any global dragend.
	useEffect(() => {
		if (!isDragOver) return;
		const reset = () => {
			setIsDragOver(false);
			setDropTarget(null);
			setElementType(null);
		};
		const onVisibility = () => {
			if (document.hidden) reset();
		};
		window.addEventListener("blur", reset);
		document.addEventListener("dragend", reset);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("blur", reset);
			document.removeEventListener("dragend", reset);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [isDragOver]);

	return {
		isDragOver,
		dropTarget,
		dragElementType,
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}
