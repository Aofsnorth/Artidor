"use client";

import { MarqueeText } from "@/components/ui/marquee-text";
import { useEditor } from "@/hooks/use-editor";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { useState, useRef, useEffect, useCallback } from "react";
import { ReplaceMediaDialog } from "@/components/editor/dialogs/replace-media-dialog";
import { RenameElementDialog } from "@/components/editor/dialogs/rename-element-dialog";
import { AudioWaveform } from "./audio-waveform";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	useKeyframeDrag,
	type KeyframeDragState,
} from "@/hooks/timeline/element/use-keyframe-drag";
import { useKeyframeSelection } from "@/hooks/timeline/element/use-keyframe-selection";
import { useKeyframeBoxSelect } from "@/hooks/timeline/element/use-keyframe-box-select";
import { KeyframeContextMenu } from "./keyframe-context-menu";
import { useTimelineElementResize } from "@/hooks/timeline/element/use-element-resize";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { dBToLinear } from "@/lib/timeline/audio-state";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { SelectionBox } from "@/lib/selection/selection-box";
import { getElementKeyframes } from "@/lib/animation";
import {
	canElementHaveAudio,
	canElementBeHidden,
	hasElementEffects,
	hasMediaId,
	getElementDisplayName,
	getTimelinePixelsPerSecond,
	timelineTimeToPixels,
	timelineTimeToSnappedPixels,
} from "@/lib/timeline";
import { getTrackHeight } from "./track-layout";
import {
	getTrackTypeAccent,
	getTimelineElementClassName,
	TIMELINE_TRACK_THEME,
	TRACK_TYPE_PALETTE,
	getGroupColor,
} from "./theme";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type {
	TimelineElement as TimelineElementType,
	TimelineTrack,
	ElementDragState,
	VideoElement,
	ImageElement,
	AudioElement,
} from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import { mediaSupportsAudio } from "@/lib/media/media-utils";
import {
	canToggleSourceAudio,
	getSourceAudioActionLabel,
	isSourceAudioSeparated,
} from "@/lib/timeline/audio-separation";
import {
	getActionDefinition,
	type TAction,
	type TActionWithOptionalArgs,
	invokeAction,
} from "@/lib/actions";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { resolveStickerId } from "@/lib/stickers";
import { buildGraphicPreviewUrl } from "@/lib/graphics";
import { getFilmstripFrame, subscribeFilmstrip } from "./filmstrip-cache";
import { findScrollParent } from "@/utils/browser";
import Image from "next/image";
import {
	Camera01Icon,
	ScissorIcon,
	Delete02Icon,
	Copy01Icon,
	Copy02Icon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeOffIcon,
	VolumeMute02Icon,
	Search01Icon,
	Exchange01Icon,
	KeyframeIcon,
	MagicWand05Icon,
	Layers01Icon,
	TextFontIcon,
	BookmarkAdd02Icon,
	PaintBrushIcon,
	ClipboardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSavePresetDialogStore } from "@/stores/save-preset-dialog-store";
import { uppercase } from "@/utils/string";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import type {
	AnimationPath,
	SelectedKeyframeRef,
	ElementKeyframe,
} from "@/lib/animation/types";
import { cn } from "@/utils/ui";
import { usePropertiesStore } from "@/components/editor/panels/properties/stores/properties-store";
import { getTrackTypeForElementType } from "@/lib/timeline/placement/compatibility";
import { useTimelineStore } from "@/stores/timeline-store";
import { useAIControlStore } from "@/stores/ai-control-store";
import { KEYFRAME_LANE_HEIGHT_PX } from "./layout";
import { TIMELINE_LAYERS } from "./layers";
import {
	getExpandedRows,
	getExpansionHeight,
	type ExpandedRow,
} from "./expanded-layout";
import type { SnapPoint } from "@/lib/timeline/snap-utils";

function ElementEnvelope({
	element,
	track,
	displayedStartTime,
	elementWidth,
	zoomLevel,
	baseTrackHeight,
	elementLeft,
	dragState,
	propertyPath,
	color = "rgba(255,255,255,0.75)",
	envelopeHeight,
	envelopeTop = 0,
	onKeyframeMouseDown,
	onKeyframeClick,
	getVisualOffsetPx,
	isDimmed = false,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	displayedStartTime: number;
	elementWidth: number;
	zoomLevel: number;
	baseTrackHeight: number;
	elementLeft: number;
	dragState: KeyframeDragState;
	propertyPath: AnimationPath;
	color?: string;
	envelopeHeight?: number;
	envelopeTop?: number;
	onKeyframeMouseDown: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
	}) => void;
	onKeyframeClick: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
		orderedKeyframes: SelectedKeyframeRef[];
		indicatorTime: number;
	}) => void;
	getVisualOffsetPx: (params: {
		indicatorTime: number;
		indicatorOffsetPx: number;
		isBeingDragged: boolean;
		displayedStartTime: number;
		elementLeft: number;
	}) => number;
	isDimmed?: boolean;
}) {
	const { isKeyframeSelected } = useKeyframeSelection();

	const elementKeyframes = useMemo(
		() =>
			getElementKeyframes({ animations: element.animations })
				.filter((kf) => kf.propertyPath === propertyPath)
				.sort((a, b) => a.time - b.time),
		[element.animations, propertyPath],
	);

	// `volume` is stored in decibels (default 0 dB = full level), whereas
	// `opacity` is already a normalized 0–1 value. The envelope draws on a 0–1
	// vertical axis, so volume must be mapped from its dB range first — otherwise
	// 0 dB reads as "0" and the line/keyframes collapse to the bottom of the lane.
	const normalizeEnvelopeValue = (raw: number): number => {
		if (propertyPath !== "volume") {
			return Math.min(1, Math.max(0, raw));
		}
		const ratio = (raw - VOLUME_DB_MIN) / (VOLUME_DB_MAX - VOLUME_DB_MIN);
		return Math.min(1, Math.max(0, ratio));
	};

	const defaultValue =
		propertyPath === "volume"
			? ((element as AudioElement).volume ?? 0)
			: propertyPath === "opacity"
				? ((element as VideoElement).opacity ?? 1)
				: 1;

	const points: {
		x: number;
		y: number;
		kf?: ElementKeyframe;
		keyframeRef?: SelectedKeyframeRef;
	}[] = [];
	const linePaddingY = 4;
	const resolvedHeight = envelopeHeight ?? baseTrackHeight;
	const resolvedWidth = Math.max(0, elementWidth - ELEMENT_RING_WIDTH_PX * 2);
	const usableHeight = resolvedHeight - linePaddingY * 2;

	if (elementKeyframes.length === 0) {
		const y =
			linePaddingY +
			usableHeight -
			normalizeEnvelopeValue(defaultValue as number) * usableHeight;
		points.push({ x: 0, y });
		points.push({ x: resolvedWidth, y });
	} else {
		for (let i = 0; i < elementKeyframes.length; i++) {
			const kf = elementKeyframes[i];
			const val = typeof kf.value === "number" ? kf.value : defaultValue;
			const y =
				linePaddingY +
				usableHeight -
				normalizeEnvelopeValue(val as number) * usableHeight;

			const indicatorTime = kf.time;
			const indicatorOffsetPx =
				timelineTimeToSnappedPixels({
					time: displayedStartTime + kf.time,
					zoomLevel,
				}) - elementLeft;
			const isBeingDragged = dragState.draggingKeyframeIds.has(kf.id);
			const visualX = getVisualOffsetPx({
				indicatorTime,
				indicatorOffsetPx,
				isBeingDragged,
				displayedStartTime,
				elementLeft,
			});
			const x = Math.max(
				0,
				Math.min(resolvedWidth, visualX - ELEMENT_RING_WIDTH_PX),
			);

			const keyframeRef: SelectedKeyframeRef = {
				trackId: track.id,
				elementId: element.id,
				propertyPath,
				keyframeId: kf.id,
			};

			if (i === 0 && x > 0) {
				points.push({ x: 0, y });
			}
			points.push({ x, y, kf, keyframeRef });
			if (i === elementKeyframes.length - 1 && x < resolvedWidth) {
				points.push({ x: resolvedWidth, y });
			}
		}
	}

	const pointsString = points.map((p) => `${p.x},${p.y}`).join(" ");

	return (
		<div
			className="pointer-events-none absolute overflow-hidden rounded-xl"
			style={{
				height: `${resolvedHeight}px`,
				top: `${envelopeTop}px`,
				left: `${ELEMENT_RING_WIDTH_PX}px`,
				right: `${ELEMENT_RING_WIDTH_PX}px`,
			}}
		>
			<svg
				aria-hidden="true"
				className="absolute inset-0 size-full overflow-hidden pointer-events-none"
			>
				<polyline
					points={pointsString}
					fill="none"
					stroke={color}
					strokeWidth="1.25"
				/>
			</svg>
			{points
				.filter(
					(
						p,
					): p is typeof p & {
						kf: ElementKeyframe;
						keyframeRef: SelectedKeyframeRef;
					} => Boolean(p.kf && p.keyframeRef),
				)
				.map((p) => {
					const { kf, keyframeRef } = p;
					const isSelected = isKeyframeSelected({ keyframe: keyframeRef });
					return (
						<KeyframeContextMenu key={kf.id} keyframe={keyframeRef}>
							<button
								type="button"
								className="pointer-events-auto absolute cursor-grab"
								style={{
									left: p.x,
									top: p.y,
									transform: "translate(-50%, -50%)",
								}}
								onMouseDown={(event) =>
									onKeyframeMouseDown({ event, keyframes: [keyframeRef] })
								}
								onClick={(event) =>
									onKeyframeClick({
										event,
										keyframes: [keyframeRef],
										orderedKeyframes: [keyframeRef],
										indicatorTime: kf.time,
									})
								}
							>
								<span
									className={cn(
										"block size-4 [transform:scaleX(0.6)_rotate(45deg)] rounded-[2px] border border-black/80 bg-gradient-to-br from-white to-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.55)] transition-[box-shadow,background-color,width,height,opacity] duration-150",
										isDimmed && "size-3 opacity-35",
										isSelected &&
											"size-5 border-2 border-white bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_0_10px_2px_rgba(255,255,255,0.72)]",
									)}
								/>
							</button>
						</KeyframeContextMenu>
					);
				})}
		</div>
	);
}

const KEYFRAME_INDICATOR_MIN_WIDTH_PX = 40;
const ELEMENT_RING_WIDTH_PX = 1.5;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;

interface KeyframeIndicator {
	time: number;
	offsetPx: number;
	keyframes: SelectedKeyframeRef[];
}

export function buildKeyframeIndicator({
	keyframe,
	trackId,
	elementId,
	displayedStartTime,
	zoomLevel,
	elementLeft,
}: {
	keyframe: ElementKeyframe;
	trackId: string;
	elementId: string;
	displayedStartTime: number;
	zoomLevel: number;
	elementLeft: number;
}): {
	time: number;
	offsetPx: number;
	keyframeRef: SelectedKeyframeRef;
} {
	const keyframeRef = {
		trackId,
		elementId,
		propertyPath: keyframe.propertyPath,
		keyframeId: keyframe.id,
	};
	const keyframeLeft = timelineTimeToSnappedPixels({
		time: displayedStartTime + keyframe.time,
		zoomLevel,
	});
	return {
		time: keyframe.time,
		offsetPx: keyframeLeft - elementLeft,
		keyframeRef,
	};
}

export function getKeyframeIndicators({
	keyframes,
	trackId,
	elementId,
	displayedStartTime,
	zoomLevel,
	elementLeft,
	elementWidth,
}: {
	keyframes: ElementKeyframe[];
	trackId: string;
	elementId: string;
	displayedStartTime: number;
	zoomLevel: number;
	elementLeft: number;
	elementWidth: number;
}): KeyframeIndicator[] {
	if (elementWidth < KEYFRAME_INDICATOR_MIN_WIDTH_PX) {
		return [];
	}

	const keyframesByTime = new Map<number, KeyframeIndicator>();
	for (const keyframe of keyframes) {
		const indicator = buildKeyframeIndicator({
			keyframe,
			trackId,
			elementId,
			displayedStartTime,
			zoomLevel,
			elementLeft,
		});
		const existingIndicator = keyframesByTime.get(indicator.time);
		if (!existingIndicator) {
			keyframesByTime.set(indicator.time, {
				time: indicator.time,
				offsetPx: indicator.offsetPx,
				keyframes: [indicator.keyframeRef],
			});
			continue;
		}

		existingIndicator.keyframes.push(indicator.keyframeRef);
	}

	return [...keyframesByTime.values()].sort((a, b) => a.time - b.time);
}

export function getDisplayShortcut({ action }: { action: TAction }) {
	const { defaultShortcuts } = getActionDefinition({ action });
	if (!defaultShortcuts?.length) {
		return "";
	}

	return uppercase({
		string: defaultShortcuts[0].replace("+", " "),
	});
}

interface TimelineElementProps {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	isSelected: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
	onElementMouseDown: (
		event: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	onElementClick: (
		event: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	dragState: ElementDragState;
	isDropTarget?: boolean;
}

export function TimelineElement({
	element,
	track,
	zoomLevel,
	isSelected,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	dragState,
	isDropTarget = false,
}: TimelineElementProps) {
	const editor = useEditor();
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const lockedTrackIds = useTimelineStore((s) => s.lockedTrackIds);
	const isTrackLocked = lockedTrackIds.has(track.id);
	// AI takeover: when the AI is executing a tool that touches this
	// element, apply a highlight pulse + smooth position/size transition
	// so the user can see the AI "moving" the clip in real time.
	const aiTakeoverActive = useAIControlStore(
		(s) => s.takeoverState === "active",
	);
	const aiActiveToolCall = useAIControlStore((s) => s.activeToolCall);
	const isAIActiveOnElement =
		aiTakeoverActive &&
		aiActiveToolCall !== null &&
		(aiActiveToolCall.elementIds.includes(element.id) ||
			aiActiveToolCall.trackIds.includes(track.id));
	const { selectedElements } = useElementSelection();
	const requestRevealMedia = useAssetsPanelStore((s) => s.requestRevealMedia);
	const { renderElement } = useElementPreview({
		trackId: track.id,
		elementId: element.id,
		fallback: element,
	});
	const {
		currentTrimStart,
		currentTrimEnd,
		currentDuration,
		currentStartTime,
		handleResizeStart,
		isResizing,
	} = useTimelineElementResize({
		element,
		track,
		zoomLevel,
		onSnapPointChange,
		onResizeStateChange,
	});

	const [replaceMediaOpen, setReplaceMediaOpen] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);

	let mediaAsset: MediaAsset | null = null;

	if (hasMediaId(element)) {
		mediaAsset =
			mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
	}

	const hasAudio = mediaSupportsAudio({ media: mediaAsset });

	const isCurrentElementSelected = selectedElements.some(
		(selected) =>
			selected.elementId === element.id && selected.trackId === track.id,
	);

	const isBeingDragged = dragState.dragElementIds.includes(element.id);
	const dragOffsetY =
		isBeingDragged && dragState.dragElementIds.length > 0
			? dragState.currentMouseY - dragState.startMouseY
			: 0;
	const dragTimeOffset = dragState.dragTimeOffsets[element.id] ?? 0;
	const elementStartTime =
		isBeingDragged && dragState.dragElementIds.length > 0
			? dragState.currentTime + dragTimeOffset
			: isResizing
				? currentStartTime
				: renderElement.startTime;
	const displayedStartTime = elementStartTime;
	const displayedDuration = isResizing
		? currentDuration
		: renderElement.duration;
	const elementWidth = timelineTimeToPixels({
		time: displayedDuration,
		zoomLevel,
	});
	const elementLeft = timelineTimeToSnappedPixels({
		time: displayedStartTime,
		zoomLevel,
	});
	const handleElementResizeStart = ({
		event,
		element,
		side,
	}: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
		side: "left" | "right";
	}) => {
		if (isTrackLocked) return;
		handleResizeStart({
			event,
			elementId: element.id,
			side,
		});
	};
	const elementKeyframes = useMemo(
		() => getElementKeyframes({ animations: element.animations }),
		[element.animations],
	);
	const keyframeIndicators = useMemo(
		() =>
			getKeyframeIndicators({
				keyframes: elementKeyframes,
				trackId: track.id,
				elementId: element.id,
				displayedStartTime,
				zoomLevel,
				elementLeft,
				elementWidth,
			}),
		[
			elementKeyframes,
			track.id,
			element.id,
			displayedStartTime,
			zoomLevel,
			elementLeft,
			elementWidth,
		],
	);

	const {
		keyframeDragState,
		handleKeyframeMouseDown,
		handleKeyframeClick,
		getVisualOffsetPx,
	} = useKeyframeDrag({ zoomLevel, element, displayedStartTime });

	const isExpanded = useTimelineStore((s) =>
		s.expandedElementIds.has(element.id),
	);
	const toggleElementExpanded = useTimelineStore(
		(s) => s.toggleElementExpanded,
	);
	const focusedKeyframePropertyPaths = useTimelineStore(
		(s) => s.focusedKeyframePropertyPaths,
	);
	const shouldDimUnfocusedKeyframes =
		!isSelected || focusedKeyframePropertyPaths.length > 0;
	const shouldDimPropertyKeyframes = (propertyPath: AnimationPath) =>
		shouldDimUnfocusedKeyframes &&
		!focusedKeyframePropertyPaths.includes(propertyPath);
	const expandedRows = useMemo(
		() =>
			isExpanded ? getExpandedRows({ animations: element.animations }) : [],
		[isExpanded, element.animations],
	);

	const {
		containerRef: expandedLanesRef,
		selectionBox: keyframeSelectionBox,
		isBoxSelecting: isKeyframeBoxSelecting,
		handleExpandedAreaMouseDown,
		handleExpandedAreaClick,
	} = useKeyframeBoxSelect({
		trackId: track.id,
		elementId: element.id,
		rows: expandedRows,
		keyframes: elementKeyframes,
		displayedStartTime,
		zoomLevel,
		elementLeft,
	});

	const handleRevealInMedia = ({ event }: { event: React.MouseEvent }) => {
		event.stopPropagation();
		if (hasMediaId(element)) {
			requestRevealMedia(element.mediaId);
		}
	};

	const isMuted = canElementHaveAudio(element) && element.muted === true;
	const canToggleCurrentSourceAudio =
		selectedElements.length === 1 &&
		isCurrentElementSelected &&
		canToggleSourceAudio(element, mediaAsset);
	const sourceAudioLabel =
		element.type === "video"
			? getSourceAudioActionLabel({ element })
			: "Extract audio";
	const isElementSourceAudioSeparated =
		element.type === "video" && isSourceAudioSeparated({ element });
	const hasKeyframes = elementKeyframes.length > 0;
	const expansionHeight = getExpansionHeight({ rows: expandedRows });
	const baseTrackHeight = getTrackHeight({ type: track.type });

	const expandedContent =
		isExpanded && expandedRows.length > 0 ? (
			<ExpandedKeyframeLanes
				rows={expandedRows}
				keyframes={elementKeyframes}
				trackId={track.id}
				elementId={element.id}
				displayedStartTime={displayedStartTime}
				zoomLevel={zoomLevel}
				elementLeft={elementLeft}
				keyframeDragState={keyframeDragState}
				onKeyframeMouseDown={handleKeyframeMouseDown}
				onKeyframeClick={handleKeyframeClick}
				getVisualOffsetPx={getVisualOffsetPx}
				containerRef={expandedLanesRef}
				onLaneMouseDown={handleExpandedAreaMouseDown}
				onLaneClick={handleExpandedAreaClick}
				selectionBox={keyframeSelectionBox}
				isBoxSelecting={isKeyframeBoxSelecting}
				focusedPropertyPaths={focusedKeyframePropertyPaths}
			/>
		) : null;

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						className={cn(
							"absolute top-0 select-none",
							isAIActiveOnElement && "ai-element-active ai-element-transition",
						)}
						style={{
							left: `${elementLeft}px`,
							width: `${elementWidth}px`,
							height:
								expandedRows.length > 0
									? `${baseTrackHeight + expansionHeight}px`
									: "100%",
							transform:
								isBeingDragged && dragState.dragElementIds.length > 0
									? `translate3d(0, ${dragOffsetY}px, 0)`
									: undefined,
							zIndex:
								isBeingDragged && dragState.dragElementIds.length > 0
									? TIMELINE_LAYERS.dragLine + 2
									: isAIActiveOnElement
										? TIMELINE_LAYERS.dragLine + 1
										: undefined,
							pointerEvents:
								isBeingDragged && dragState.dragElementIds.length > 0 ? "none" : undefined,
							opacity:
								isBeingDragged && dragState.dragElementIds.length > 0 ? 0 : undefined,
						}}
					>
						<ElementInner
							element={element}
							track={track}
							zoomLevel={zoomLevel}
							isSelected={isSelected}
							isExpanded={expandedRows.length > 0}
							baseTrackHeight={baseTrackHeight}
							expandedContent={expandedContent}
							onElementClick={onElementClick}
							onElementMouseDown={onElementMouseDown}
							onResizeStart={handleElementResizeStart}
							isDropTarget={isDropTarget}
							contentElement={
								isResizing
									? ({
											...element,
											trimStart: currentTrimStart,
											trimEnd: currentTrimEnd,
											duration: currentDuration,
										} as TimelineElementType)
									: undefined
							}
						/>
						{track.type === "video" && (
							<>
								<ElementEnvelope
									element={element}
									track={track}
									displayedStartTime={displayedStartTime}
									elementWidth={elementWidth}
									elementLeft={elementLeft}
									zoomLevel={zoomLevel}
									baseTrackHeight={baseTrackHeight}
									dragState={keyframeDragState}
									propertyPath="opacity"
									color="rgba(255,255,255,0.75)"
									envelopeHeight={baseTrackHeight / 2}
									envelopeTop={0}
									onKeyframeMouseDown={handleKeyframeMouseDown}
									onKeyframeClick={handleKeyframeClick}
									getVisualOffsetPx={getVisualOffsetPx}
									isDimmed={shouldDimPropertyKeyframes("opacity")}
								/>
								{((element as VideoElement).isSourceAudioEnabled ?? true) && (
									<ElementEnvelope
										element={element}
										track={track}
										displayedStartTime={displayedStartTime}
										elementWidth={elementWidth}
										elementLeft={elementLeft}
										zoomLevel={zoomLevel}
										baseTrackHeight={baseTrackHeight}
										dragState={keyframeDragState}
										propertyPath="volume"
										color="rgba(255,255,255,0.4)"
										envelopeHeight={baseTrackHeight / 2}
										envelopeTop={baseTrackHeight / 2}
										onKeyframeMouseDown={handleKeyframeMouseDown}
										onKeyframeClick={handleKeyframeClick}
										getVisualOffsetPx={getVisualOffsetPx}
										isDimmed={shouldDimPropertyKeyframes("volume")}
									/>
								)}
							</>
						)}
						{track.type === "audio" && (
							<ElementEnvelope
								element={element}
								track={track}
								displayedStartTime={displayedStartTime}
								elementWidth={elementWidth}
								elementLeft={elementLeft}
								zoomLevel={zoomLevel}
								baseTrackHeight={baseTrackHeight}
								dragState={keyframeDragState}
								propertyPath="volume"
								color="rgba(255,255,255,0.75)"
								onKeyframeMouseDown={handleKeyframeMouseDown}
								onKeyframeClick={handleKeyframeClick}
								getVisualOffsetPx={getVisualOffsetPx}
								isDimmed={shouldDimPropertyKeyframes("volume")}
							/>
						)}
						{track.type === "text" && (
							<ElementEnvelope
								element={element}
								track={track}
								displayedStartTime={displayedStartTime}
								elementWidth={elementWidth}
								elementLeft={elementLeft}
								zoomLevel={zoomLevel}
								baseTrackHeight={baseTrackHeight}
								dragState={keyframeDragState}
								propertyPath="opacity"
								color="rgba(255,255,255,0.75)"
								onKeyframeMouseDown={handleKeyframeMouseDown}
								onKeyframeClick={handleKeyframeClick}
								getVisualOffsetPx={getVisualOffsetPx}
								isDimmed={shouldDimPropertyKeyframes("opacity")}
							/>
						)}
						{element.bookmarks?.map((bookmark) => {
							const bookmarkLeftPx = timelineTimeToPixels({
								time: bookmark.time - element.trimStart,
								zoomLevel,
							});
							return (
								<div
									key={`bookmark-${bookmark.time}`}
									className="pointer-events-none absolute top-0 bottom-0 w-px bg-blue-400 z-30"
									style={{
										left: `${bookmarkLeftPx}px`,
									}}
								>
									<div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400" />
								</div>
							);
						})}
						{keyframeIndicators.length > 0 && (
							<div
								className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
								style={{ height: `${baseTrackHeight}px` }}
							>
								<KeyframeIndicators
									focusedPropertyPaths={focusedKeyframePropertyPaths}
									shouldDimUnfocused={shouldDimUnfocusedKeyframes}
									indicators={keyframeIndicators
										.map((ind) => ({
											...ind,
											keyframes: ind.keyframes.filter(
												(k) =>
													k.propertyPath !== "volume" &&
													k.propertyPath !== "opacity",
											),
										}))
										.filter((ind) => ind.keyframes.length > 0)}
									dragState={keyframeDragState}
									displayedStartTime={displayedStartTime}
									elementLeft={elementLeft}
									onKeyframeMouseDown={handleKeyframeMouseDown}
									onKeyframeClick={handleKeyframeClick}
									getVisualOffsetPx={getVisualOffsetPx}
								/>
							</div>
						)}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="w-64">
					<ActionMenuItem
						action="split"
						icon={<HugeiconsIcon icon={ScissorIcon} />}
					>
						Split
					</ActionMenuItem>
					{selectedElements.length <= 1 && (
						<ContextMenuItem
							icon={<HugeiconsIcon icon={TextFontIcon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								setRenameOpen(true);
							}}
						>
							Rename
						</ContextMenuItem>
					)}
					<CopyMenuItem />
					{selectedElements.length === 1 && (
						<ActionMenuItem
							action="duplicate-selected"
							icon={<HugeiconsIcon icon={Copy02Icon} />}
						>
							Duplicate
						</ActionMenuItem>
					)}
					{editor.clipboard.hasEntry() && (
						<ActionMenuItem
							action="paste-copied"
							icon={<HugeiconsIcon icon={ClipboardIcon} />}
						>
							Paste layer
						</ActionMenuItem>
					)}
					{selectedElements.length === 1 && (
						<ActionMenuItem
							action="copy-style"
							icon={<HugeiconsIcon icon={PaintBrushIcon} />}
						>
							Copy style
						</ActionMenuItem>
					)}
					{editor.clipboard.hasStyleEntry() && (
						<ActionMenuItem
							action="paste-style"
							icon={<HugeiconsIcon icon={PaintBrushIcon} />}
						>
							Paste style
						</ActionMenuItem>
					)}
					{editor.clipboard.hasEffectEntry() && (
						<ActionMenuItem
							action="paste-effect"
							icon={<HugeiconsIcon icon={MagicWand05Icon} />}
						>
							Paste effect
						</ActionMenuItem>
					)}
					{selectedElements.length > 1 && (
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Layers01Icon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								editor.timeline.groupElements({
									elementRefs: selectedElements,
								});
							}}
						>
							Group elements
						</ContextMenuItem>
					)}
					{selectedElements.length > 1 && (
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Layers01Icon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								editor.timeline.combineElements({
									elementRefs: selectedElements,
								});
							}}
						>
							Combine elements
						</ContextMenuItem>
					)}
					{element.groupId && (
						<ContextMenuItem
							icon={<HugeiconsIcon icon={Layers01Icon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								editor.timeline.ungroupElements({
									groupId: element.groupId as string,
								});
							}}
						>
							Ungroup elements
						</ContextMenuItem>
					)}
					<ContextMenuItem
						icon={<HugeiconsIcon icon={BookmarkAdd02Icon} />}
						onClick={(event: React.MouseEvent) => {
							event.stopPropagation();
							const selfRef = { trackId: track.id, elementId: element.id };
							const elementsToSave =
								selectedElements.length > 1 &&
								selectedElements.some((ref) => ref.elementId === element.id)
									? selectedElements
									: [selfRef];
							useSavePresetDialogStore.getState().openDialog({
								elements: elementsToSave,
								defaultName: getElementDisplayName({ element }),
							});
						}}
					>
						Save as preset
					</ContextMenuItem>
					{canElementHaveAudio(element) && hasAudio && (
						<MuteMenuItem
							isMultipleSelected={selectedElements.length > 1}
							isCurrentElementSelected={isCurrentElementSelected}
							isMuted={isMuted}
						/>
					)}
					{canToggleCurrentSourceAudio && (
						<ContextMenuItem
							icon={
								<HugeiconsIcon
									icon={
										isElementSourceAudioSeparated ? ScissorIcon : ScissorIcon
									}
								/>
							}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								invokeAction("toggle-source-audio");
							}}
						>
							{sourceAudioLabel}
						</ContextMenuItem>
					)}
					{canElementBeHidden(element) && (
						<VisibilityMenuItem
							element={element}
							isMultipleSelected={selectedElements.length > 1}
							isCurrentElementSelected={isCurrentElementSelected}
						/>
					)}
					{hasKeyframes && (
						<ContextMenuItem
							icon={<HugeiconsIcon icon={KeyframeIcon} />}
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								toggleElementExpanded(element.id);
							}}
						>
							{isExpanded ? "Collapse keyframes" : "Expand keyframes"}
						</ContextMenuItem>
					)}
					{selectedElements.length === 1 && hasMediaId(element) && (
						<>
							<ContextMenuItem
								icon={<HugeiconsIcon icon={Search01Icon} />}
								onClick={(event: React.MouseEvent) =>
									handleRevealInMedia({ event })
								}
							>
								Reveal media
							</ContextMenuItem>
							<ContextMenuItem
								icon={<HugeiconsIcon icon={Exchange01Icon} />}
								onClick={(event: React.MouseEvent) => {
									event.stopPropagation();
									setReplaceMediaOpen(true);
								}}
							>
								Replace media
							</ContextMenuItem>
						</>
					)}
					<ContextMenuSeparator />
					<DeleteMenuItem
						isMultipleSelected={selectedElements.length > 1}
						isCurrentElementSelected={isCurrentElementSelected}
						elementType={element.type}
						selectedCount={selectedElements.length}
					/>
				</ContextMenuContent>
			</ContextMenu>
			<ReplaceMediaDialog
				isOpen={replaceMediaOpen}
				onOpenChange={setReplaceMediaOpen}
				trackId={track.id}
				elementId={element.id}
			/>
			<RenameElementDialog
				open={renameOpen}
				onOpenChange={setRenameOpen}
				trackId={track.id}
				elementId={element.id}
				currentCustomName={element.customName ?? ""}
				derivedName={getElementDisplayName({
					// Placeholder should reflect what the label falls back to when
					// no custom name is set, so strip customName before deriving.
					element: { ...element, customName: undefined },
					mediaName: mediaAsset?.name,
				})}
			/>
		</>
	);
}

function ElementInner({
	element,
	track,
	zoomLevel,
	isSelected,
	isExpanded,
	baseTrackHeight,
	expandedContent,
	onElementClick,
	onElementMouseDown,
	onResizeStart,
	isDropTarget = false,
	contentElement,
}: {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
	isSelected: boolean;
	isExpanded: boolean;
	baseTrackHeight: number;
	expandedContent: React.ReactNode;
	onElementClick: (
		event: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	onElementMouseDown: (
		event: React.MouseEvent,
		element: TimelineElementType,
	) => void;
	onResizeStart: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
		side: "left" | "right";
	}) => void;
	isDropTarget?: boolean;
	/** Element carrying live (in-progress) trim/duration during a resize drag so
	 * the filmstrip + waveform stay source-anchored instead of sliding. Falls
	 * back to `element` when not provided. */
	contentElement?: TimelineElementType;
}) {
	const isReducedOpacity =
		(canElementBeHidden(element) && element.hidden) || isDropTarget;
	const lockedTrackIds = useTimelineStore((s) => s.lockedTrackIds);
	const isTrackLocked = lockedTrackIds.has(track.id);
	const accent = getTrackTypeAccent({
		type: track.type,
		customColor: track.color,
	});

	// Detect adjacent clips for adaptive corner radius
	const SNAP_THRESHOLD = 2; // ticks tolerance for adjacency
	const hasAdjacentLeft = track.elements.some(
		(el) =>
			el.id !== element.id &&
			Math.abs(el.startTime + el.duration - element.startTime) < SNAP_THRESHOLD,
	);
	const hasAdjacentRight = track.elements.some(
		(el) =>
			el.id !== element.id &&
			Math.abs(el.startTime - (element.startTime + element.duration)) < SNAP_THRESHOLD,
	);
	// Full radius = 12px (rounded-xl), adjacent radius = 4px
	const ADJACENT_RADIUS = "4px";
	const FULL_RADIUS = "12px";
	const borderRadius = `${hasAdjacentLeft ? ADJACENT_RADIUS : FULL_RADIUS} ${hasAdjacentRight ? ADJACENT_RADIUS : FULL_RADIUS} ${hasAdjacentRight ? ADJACENT_RADIUS : FULL_RADIUS} ${hasAdjacentLeft ? ADJACENT_RADIUS : FULL_RADIUS}`;
	const palette = TRACK_TYPE_PALETTE[track.type];
	const hasFx = hasElementEffects({ element });
	const groupColor = getGroupColor(element.groupId);
	return (
		<div
			className="absolute top-0 bottom-0"
			style={{
				left: `${ELEMENT_RING_WIDTH_PX}px`,
				right: `${ELEMENT_RING_WIDTH_PX}px`,
			}}
		>
			<div
				className="absolute inset-0 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_22px_rgba(0,0,0,0.22)]"
				style={{
					...(isSelected
						? {
								boxShadow: `0 0 0 ${ELEMENT_RING_WIDTH_PX}px var(--primary)`,
							}
						: undefined),
					borderRadius,
				}}
			>
				<div
					className={cn(
						"absolute inset-0 overflow-hidden border border-white/[0.04]",
						isExpanded && "bg-background",
					)}
					style={{ borderRadius }}
				>
					{/* biome-ignore lint/a11y/useSemanticElements: timeline clips contain nested controls, so this cannot be a native button */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard actions are handled by global timeline shortcuts */}
					<div
						role="button"
						tabIndex={-1}
						className="absolute inset-0 size-full flex flex-col"
						onClick={(event) => {
							if (isTrackLocked) return;
							onElementClick(event, element);
						}}
						onMouseDown={(event) => {
							if (isTrackLocked) return;
							onElementMouseDown(event, element);
						}}
					>
						{/* Top accent stripe (1.5px) */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-10"
							style={{ borderTop: `1.5px solid ${accent.accent}`, borderRadius }}
						/>
						{/* Group visual indicator: left edge stripe */}
						{groupColor && (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 z-20"
								style={{ borderLeft: `3px solid ${groupColor}`, borderRadius }}
							/>
						)}
						{/* "fx" badge: a small monospace pill anchored to the
						    bottom-right that tells the user this clip has effects
						    applied. Uses the track-type accent for color, so it
						    matches the stripe and reads as part of the clip identity. */}
						{hasFx && (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute bottom-1 right-1 z-10 rounded-sm px-1 py-px font-mono text-[0.5rem] font-semibold uppercase leading-none"
								style={{
									backgroundColor: palette.badgeBg,
									color: palette.badgeText,
								}}
							>
								fx
							</div>
						)}
						<div
							className={cn(
								"flex shrink-0 items-center overflow-hidden",
								getTimelineElementClassName({
									type: getTrackTypeForElementType({
										elementType: element.type,
									}),
								}),
								(isReducedOpacity || isTrackLocked) && "opacity-50",
							)}
							style={{ height: isExpanded ? `${baseTrackHeight}px` : "100%" }}
						>
							<div className="flex h-full flex-1 min-h-0 items-center overflow-hidden">
								<ElementContent
									element={contentElement ?? element}
									track={track}
									zoomLevel={zoomLevel}
								/>
							</div>
						</div>
						{expandedContent}
					</div>
				</div>
			</div>

			{isSelected && !isTrackLocked && (
				<>
					<ResizeHandle
						side="left"
						element={element}
						track={track}
						onResizeStart={onResizeStart}
					/>
					<ResizeHandle
						side="right"
						element={element}
						track={track}
						onResizeStart={onResizeStart}
					/>
				</>
			)}
		</div>
	);
}

function ResizeHandle({
	side,
	element,
	track,
	onResizeStart,
}: {
	side: "left" | "right";
	element: TimelineElementType;
	track: TimelineTrack;
	onResizeStart: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
		side: "left" | "right";
	}) => void;
}) {
	const isLeft = side === "left";
	return (
		<button
			type="button"
			className={cn(
				"absolute top-0 bottom-0 w-2",
				isLeft ? "-left-1 cursor-w-resize" : "-right-1 cursor-e-resize",
			)}
			onMouseDown={(event) => onResizeStart({ event, element, track, side })}
			onClick={(event) => event.stopPropagation()}
			aria-label={`${isLeft ? "Left" : "Right"} resize handle`}
		></button>
	);
}

function KeyframeIndicators({
	indicators,
	focusedPropertyPaths,
	shouldDimUnfocused,
	dragState,
	displayedStartTime,
	elementLeft,
	onKeyframeMouseDown,
	onKeyframeClick,
	getVisualOffsetPx,
}: {
	indicators: KeyframeIndicator[];
	focusedPropertyPaths: string[];
	shouldDimUnfocused: boolean;
	dragState: KeyframeDragState;
	displayedStartTime: number;
	elementLeft: number;
	onKeyframeMouseDown: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
	}) => void;
	onKeyframeClick: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
		orderedKeyframes: SelectedKeyframeRef[];
		indicatorTime: number;
	}) => void;
	getVisualOffsetPx: (params: {
		indicatorTime: number;
		indicatorOffsetPx: number;
		isBeingDragged: boolean;
		displayedStartTime: number;
		elementLeft: number;
	}) => number;
}) {
	const editor = useEditor();
	const { isKeyframeSelected } = useKeyframeSelection();
	const orderedKeyframes = indicators.flatMap(
		(indicator) => indicator.keyframes,
	);

	// Pre-compute x positions for the connecting curve so we can draw it once,
	// then re-derive inside the map (mirrors the same logic to stay in sync
	// with dragState). A polyline through all diamonds gives a visual cue that
	// the keyframes are part of the same animation segment, even though the
	// actual value curve lives in the bezier popover / expanded lanes.
	const curvePoints = indicators.map((indicator) => {
		const isBeingDragged = indicator.keyframes.some((keyframe) =>
			dragState.draggingKeyframeIds.has(keyframe.keyframeId),
		);
		return getVisualOffsetPx({
			indicatorTime: indicator.time,
			indicatorOffsetPx: indicator.offsetPx,
			isBeingDragged,
			displayedStartTime,
			elementLeft,
		});
	});

	const curvePath =
		curvePoints.length >= 2
			? `M ${curvePoints[0]} 0` +
				curvePoints
					.slice(1)
					.map((x) => ` L ${x} 0`)
					.join("")
			: null;

	return (
		<>
			{curvePath && (
				<svg
					className="pointer-events-none absolute top-1/2 left-0 right-0 h-0 -translate-y-1/2 overflow-visible"
					aria-hidden="true"
				>
					<path
						d={curvePath}
						stroke="rgba(255, 255, 255, 0.55)"
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeDasharray="2 2"
						fill="none"
					/>
				</svg>
			)}
			{indicators.map((indicator) => {
				const isIndicatorSelected = indicator.keyframes.some((keyframe) =>
					isKeyframeSelected({ keyframe }),
				);
				const isFocusedProperty = indicator.keyframes.some((keyframe) =>
					focusedPropertyPaths.includes(keyframe.propertyPath),
				);
				const isDimmed = shouldDimUnfocused && !isFocusedProperty;
				const isBeingDragged = indicator.keyframes.some((keyframe) =>
					dragState.draggingKeyframeIds.has(keyframe.keyframeId),
				);
				const visualOffsetPx = getVisualOffsetPx({
					indicatorTime: indicator.time,
					indicatorOffsetPx: indicator.offsetPx,
					isBeingDragged,
					displayedStartTime,
					elementLeft,
				});

				return (
					<button
						key={indicator.time}
						type="button"
						className="pointer-events-auto absolute cursor-grab"
						style={{
							left: visualOffsetPx,
							top: "50%",
							transform: "translate(-50%, -50%)",
						}}
						onMouseDown={(event) =>
							onKeyframeMouseDown({ event, keyframes: indicator.keyframes })
						}
						onClick={(event) =>
							onKeyframeClick({
								event,
								keyframes: indicator.keyframes,
								orderedKeyframes,
								indicatorTime: indicator.time,
							})
						}
						onDoubleClick={(event) => {
							event.stopPropagation();
							event.preventDefault();
							editor.timeline.removeKeyframes({
								keyframes: indicator.keyframes,
							});
						}}
						aria-label="Select keyframe"
					>
						<span
							className={cn(
								"block size-5 [transform:scaleX(0.6)_rotate(45deg)] rounded-[2px] border border-black/80 bg-gradient-to-br from-white to-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.55)] transition-[box-shadow,background-color,width,height,opacity,transform] duration-150",
								isDimmed &&
									"size-3.5 opacity-35 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]",
								isIndicatorSelected &&
									"size-6 border-2 border-white bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_0_11px_3px_rgba(255,255,255,0.72)] opacity-100",
							)}
						/>
					</button>
				);
			})}
		</>
	);
}

function ExpandedKeyframeLanes({
	rows,
	keyframes,
	trackId,
	elementId,
	displayedStartTime,
	zoomLevel,
	elementLeft,
	keyframeDragState,
	onKeyframeMouseDown,
	onKeyframeClick,
	getVisualOffsetPx,
	containerRef,
	onLaneMouseDown,
	onLaneClick,
	selectionBox,
	isBoxSelecting,
	focusedPropertyPaths,
}: {
	rows: ExpandedRow[];
	keyframes: ElementKeyframe[];
	trackId: string;
	elementId: string;
	displayedStartTime: number;
	zoomLevel: number;
	elementLeft: number;
	keyframeDragState: KeyframeDragState;
	onKeyframeMouseDown: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
	}) => void;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onLaneMouseDown: (event: React.MouseEvent) => void;
	onLaneClick: (event: React.MouseEvent) => void;
	selectionBox: {
		startPos: { x: number; y: number };
		currentPos: { x: number; y: number };
		isActive: boolean;
	} | null;
	isBoxSelecting: boolean;
	focusedPropertyPaths: string[];
	onKeyframeClick: (params: {
		event: React.MouseEvent;
		keyframes: SelectedKeyframeRef[];
		orderedKeyframes: SelectedKeyframeRef[];
		indicatorTime: number;
	}) => void;
	getVisualOffsetPx: (params: {
		indicatorTime: number;
		indicatorOffsetPx: number;
		isBeingDragged: boolean;
		displayedStartTime: number;
		elementLeft: number;
	}) => number;
}) {
	const editor = useEditor();
	const { isKeyframeSelected } = useKeyframeSelection();

	const orderedKeyframes = useMemo(
		() =>
			[...keyframes]
				.sort(
					(a, b) =>
						a.time - b.time || a.propertyPath.localeCompare(b.propertyPath),
				)
				.map((kf) => ({
					trackId,
					elementId,
					propertyPath: kf.propertyPath,
					keyframeId: kf.id,
				})),
		[keyframes, trackId, elementId],
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keyframe lanes are pointer selection surfaces
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyframe keyboard actions are handled by global timeline shortcuts
		<div
			ref={containerRef}
			className="relative flex flex-col"
			onMouseDown={onLaneMouseDown}
			onClick={onLaneClick}
		>
			{rows.map((row) => {
				const laneKeyframes = keyframes.filter(
					(kf) => kf.propertyPath === row.propertyPath,
				);
				const sortedLaneKeyframes = [...laneKeyframes].sort(
					(a, b) => a.time - b.time,
				);
				return (
					<div
						key={row.propertyPath}
						className={cn("relative flex items-center bg-muted/50")}
						style={{ height: `${KEYFRAME_LANE_HEIGHT_PX}px` }}
					>
						{sortedLaneKeyframes.slice(0, -1).map((kf, index) => {
							const nextKeyframe = sortedLaneKeyframes[index + 1];
							if (!nextKeyframe || nextKeyframe.time <= kf.time) return null;
							const keyframeRef: SelectedKeyframeRef = {
								trackId,
								elementId,
								propertyPath: row.propertyPath,
								keyframeId: kf.id,
							};
							const startLeft = timelineTimeToSnappedPixels({
								time: displayedStartTime + kf.time,
								zoomLevel,
							});
							const endLeft = timelineTimeToSnappedPixels({
								time: displayedStartTime + nextKeyframe.time,
								zoomLevel,
							});
							const startOffset = startLeft - elementLeft;
							const endOffset = endLeft - elementLeft;
							const startVisualOffset = getVisualOffsetPx({
								indicatorTime: kf.time,
								indicatorOffsetPx: startOffset,
								isBeingDragged: keyframeDragState.draggingKeyframeIds.has(
									kf.id,
								),
								displayedStartTime,
								elementLeft,
							});
							const endVisualOffset = getVisualOffsetPx({
								indicatorTime: nextKeyframe.time,
								indicatorOffsetPx: endOffset,
								isBeingDragged: keyframeDragState.draggingKeyframeIds.has(
									nextKeyframe.id,
								),
								displayedStartTime,
								elementLeft,
							});
							const left = Math.min(startVisualOffset, endVisualOffset);
							const width = Math.abs(endVisualOffset - startVisualOffset);
							if (width < 8) return null;
							return (
								<button
									key={`${kf.id}-${nextKeyframe.id}`}
									type="button"
									className="group/keyframe-segment pointer-events-auto absolute top-1/2 h-3 -translate-y-1/2 rounded-full outline-none"
									style={{ left, width }}
									onMouseDown={(event) => event.stopPropagation()}
									onClick={(event) => {
										event.stopPropagation();
										onKeyframeClick({
											event,
											keyframes: [keyframeRef],
											orderedKeyframes,
											indicatorTime: kf.time,
										});
									}}
									aria-label="Select keyframe segment"
								>
									<span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 rounded-full bg-white/10 transition-colors group-hover/keyframe-segment:bg-cyan-300/70 group-focus-visible/keyframe-segment:bg-cyan-300" />
								</button>
							);
						})}
						{laneKeyframes.map((kf) => {
							const keyframeRef: SelectedKeyframeRef = {
								trackId,
								elementId,
								propertyPath: row.propertyPath,
								keyframeId: kf.id,
							};
							const isBeingDragged = keyframeDragState.draggingKeyframeIds.has(
								kf.id,
							);
							const kfLeft = timelineTimeToSnappedPixels({
								time: displayedStartTime + kf.time,
								zoomLevel,
							});
							const offsetPx = kfLeft - elementLeft;
							const visualOffset = getVisualOffsetPx({
								indicatorTime: kf.time,
								indicatorOffsetPx: offsetPx,
								isBeingDragged,
								displayedStartTime,
								elementLeft,
							});
							const isSelected = isKeyframeSelected({
								keyframe: keyframeRef,
							});
							const isDimmed =
								focusedPropertyPaths.length > 0 &&
								!focusedPropertyPaths.includes(row.propertyPath);

							return (
								<KeyframeContextMenu key={kf.id} keyframe={keyframeRef}>
									<button
										type="button"
										className={cn(
											"pointer-events-auto absolute cursor-grab",
											isBoxSelecting && "pointer-events-none",
										)}
										style={{
											left: visualOffset,
											top: "50%",
											transform: "translate(-50%, -50%)",
										}}
										onMouseDown={(event) => {
											event.stopPropagation();
											onKeyframeMouseDown({
												event,
												keyframes: [keyframeRef],
											});
										}}
										onClick={(event) => {
											event.stopPropagation();
											onKeyframeClick({
												event,
												keyframes: [keyframeRef],
												orderedKeyframes,
												indicatorTime: kf.time,
											});
										}}
										onDoubleClick={(event) => {
											event.stopPropagation();
											event.preventDefault();
											editor.timeline.removeKeyframes({
												keyframes: [keyframeRef],
											});
										}}
										aria-label="Select keyframe"
									>
										<span
											className={cn(
												"block size-5 [transform:scaleX(0.6)_rotate(45deg)] rounded-[2px] border border-black/80 bg-gradient-to-br from-white to-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.55)] transition-[box-shadow,background-color,width,height,opacity] duration-150",
												isDimmed && "size-3.5 opacity-35",
												isSelected &&
													"size-6 border-2 border-white bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_0_11px_3px_rgba(255,255,255,0.72)]",
											)}
										/>
									</button>
								</KeyframeContextMenu>
							);
						})}
					</div>
				);
			})}
			{selectionBox && (
				<SelectionBox
					startPos={selectionBox.startPos}
					currentPos={selectionBox.currentPos}
					containerRef={containerRef}
					isActive={selectionBox.isActive}
				/>
			)}
		</div>
	);
}

interface ElementContentProps {
	element: TimelineElementType;
	track: TimelineTrack;
	zoomLevel: number;
}

function TextElementContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "text" }>;
}) {
	return (
		<div className="flex size-full items-center justify-start pl-2">
			<span className="truncate text-xs text-white">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function NullLayerContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "text" }>;
}) {
	return (
		<div className="flex size-full items-center justify-start gap-1.5 pl-2">
			<div className="flex size-4 shrink-0 items-center justify-center rounded border border-dashed border-white/40">
				<div className="size-1.5 rounded-full bg-white/50" />
			</div>
			<span className="truncate text-xs text-white/70 font-medium">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function CameraElementContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "camera" }>;
}) {
	return (
		<div className="flex size-full items-center justify-start gap-1.5 pl-2">
			<HugeiconsIcon
				icon={Camera01Icon}
				className="size-3.5 shrink-0 text-white/80"
			/>
			<span className="truncate text-xs text-white font-medium">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function EffectElementContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "effect" }>;
}) {
	return (
		<div className="flex size-full items-center justify-start gap-1 pl-2">
			<HugeiconsIcon
				icon={MagicWand05Icon}
				className="size-4 shrink-0 text-white"
			/>
			<span className="truncate text-xs text-white">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function StickerElementContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "sticker" }>;
}) {
	return (
		<div className="flex size-full items-center gap-2 pl-2">
			<Image
				src={resolveStickerId({
					stickerId: element.stickerId,
					options: { width: 20, height: 20 },
				})}
				alt={element.name}
				className="size-4 shrink-0"
				width={20}
				height={20}
				unoptimized
			/>
			<span className="truncate text-xs text-white">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function GraphicElementContent({
	element,
}: {
	element: Extract<TimelineElementType, { type: "graphic" }>;
}) {
	return (
		<div className="flex size-full items-center gap-2 pl-2">
			<Image
				src={buildGraphicPreviewUrl({
					definitionId: element.definitionId,
					params: element.params,
					size: 20,
				})}
				alt={element.name}
				className="size-4 shrink-0"
				width={20}
				height={20}
				unoptimized
			/>
			<span className="truncate text-xs text-white">
				{getElementDisplayName({ element })}
			</span>
		</div>
	);
}

function AudioElementContent({
	element,
	track,
}: {
	element: AudioElement;
	track: TimelineTrack;
}) {
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const mediaAsset =
		element.sourceType === "upload"
			? (mediaAssets.find((asset) => asset.id === element.mediaId) ?? null)
			: null;

	const audioBuffer =
		element.sourceType === "library" ? element.buffer : undefined;
	const audioUrl =
		element.sourceType === "library" ? element.sourceUrl : mediaAsset?.url;
	// Audio-only elements fall back to the asset file when no buffer / url is
	// available yet (e.g. assets still loading, or first render). Without
	// this fallback the element renders as a bare label.
	const audioMediaFile =
		element.sourceType === "library" ? undefined : mediaAsset?.file;
	const hasAudioSource = !!(audioBuffer || audioUrl || audioMediaFile);
	const mediaLabel = getElementDisplayName({
		element,
		mediaName: mediaAsset?.name,
	});

	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const trackIndex = scene
		? scene.tracks.audio.findIndex((t) => t.id === track.id)
		: 0;
	const themeVariant =
		TIMELINE_TRACK_THEME.audio.variants[
			Math.max(0, trackIndex) % TIMELINE_TRACK_THEME.audio.variants.length
		];

	const trackSliderPercent =
		useTimelineStore((s) => s.trackSliders[track.id] ?? 100);
	const elementDb = (element as AudioElement | VideoElement).volume ?? 0;
	// Track slider is a linear percentage (0–100, default 100). The
	// element's volume is in dB; convert to linear, then multiply by the
	// slider percentage so visual scaling matches what the audio engine
	// plays back.
	const elementLinear = dBToLinear(elementDb);
	const effectiveVolume = elementLinear * (trackSliderPercent / 100);
	// Use perceptual (sqrt) scaling for waveform display so the visual
	// height better matches perceived loudness.
	const waveformScale = Math.sqrt(effectiveVolume);
	const trackVolumePercent = Math.max(
		0,
		Math.min(100, trackSliderPercent),
	);

	if (hasAudioSource) {
		return (
			<div className="relative size-full overflow-hidden bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.16),transparent_52%)]">
				<div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/10" />
				<AudioWaveform
					audioBuffer={audioBuffer}
					audioUrl={audioUrl}
					mediaFile={audioMediaFile}
					color={themeVariant.waveformColor}
					beatColor={themeVariant.beatColor}
					variant="beats"
					symmetric={false}
					trimStartTicks={element.trimStart}
					trimEndTicks={element.trimEnd}
					sourceDurationTicks={
						element.sourceDuration ||
						element.duration + element.trimStart + element.trimEnd
					}
					scale={waveformScale}
				/>
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div
						className="absolute inset-x-0 h-px bg-white/50"
						style={{
							top: `${100 - trackVolumePercent}%`,
							transform: "translateY(-50%)",
						}}
					/>
					<div
						className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/[0.04] to-transparent"
						style={{ height: `${trackVolumePercent}%` }}
					/>
				</div>
				<AudioFadeOverlay
					fadeInDuration={element.fadeInDuration ?? 0}
					fadeOutDuration={element.fadeOutDuration ?? 0}
					durationTicks={element.duration}
				/>
				<MediaElementHeader name={mediaLabel} hasFade={false} />
			</div>
		);
	}

	return (
		<span className="text-foreground/80 truncate text-xs">{mediaLabel}</span>
	);
}

function AudioFadeOverlay({
	fadeInDuration,
	fadeOutDuration,
	durationTicks,
}: {
	fadeInDuration: number;
	fadeOutDuration: number;
	durationTicks: number;
}) {
	const durationSeconds = durationTicks / TICKS_PER_SECOND;
	if (durationSeconds <= 0) return null;

	const fadeInPct = Math.min(100, (fadeInDuration / durationSeconds) * 100);
	const fadeOutPct = Math.min(100, (fadeOutDuration / durationSeconds) * 100);

	if (fadeInPct <= 0 && fadeOutPct <= 0) return null;

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{fadeInPct > 0 && (
				<div
					className="absolute inset-y-0 left-0 bg-gradient-to-r from-black/60 to-transparent"
					style={{ width: `${fadeInPct}%` }}
				/>
			)}
			{fadeOutPct > 0 && (
				<div
					className="absolute inset-y-0 right-0 bg-gradient-to-l from-black/60 to-transparent"
					style={{ width: `${fadeOutPct}%` }}
				/>
			)}
		</div>
	);
}

function EffectsButton({
	element,
	track,
}: {
	element: VideoElement | ImageElement;
	track: TimelineTrack;
}) {
	const editor = useEditor();
	const setActiveTab = usePropertiesStore((s) => s.setActiveTab);

	const handleClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		editor.selection.setSelectedElements({
			elements: [{ trackId: track.id, elementId: element.id }],
		});
		setActiveTab(element.type, "effects");
	};

	return (
		<button
			type="button"
			className="flex shrink-0 justify-center text-white cursor-pointer"
			onMouseDown={(event) => event.stopPropagation()}
			onClick={handleClick}
		>
			<HugeiconsIcon icon={MagicWand05Icon} size={12} />
		</button>
	);
}

function VideoFilmstrip({
	mediaFile,
	element,
	tileWidth,
	topHeight,
	zoomLevel,
}: {
	mediaFile: File;
	element: VideoElement;
	tileWidth: number;
	topHeight: number;
	zoomLevel: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollParentRef = useRef<HTMLElement | null>(null);

	// Virtualized filmstrip: only the tiles inside the timeline's scroll
	// viewport are drawn, and frames come from a shared per-file cache that
	// decodes each frame once (independent of zoom/scroll). This replaces the
	// previous full-clip canvas, which exceeded the browser's max canvas size
	// on long clips (so most tiles silently never drew) and re-decoded the
	// whole clip on every zoom/scroll.
	const draw = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Pixels-per-second must match the timeline's real scale
		// (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel), NOT zoomLevel alone —
		// otherwise the strip is 50x too narrow (only the clip's first sliver
		// draws, the rest shows the repeating CSS poster) and source-time maps
		// 50x too fast (wrong frames). This was the long-standing thumbnail bug.
		const pxPerSecond = getTimelinePixelsPerSecond({ zoomLevel });
		const elementWidth = (element.duration / TICKS_PER_SECOND) * pxPerSecond;
		if (elementWidth <= 0) return;

		// Clip the drawn region to the visible window of the scroll parent so
		// the canvas stays small no matter how long the clip is.
		const containerRect = container.getBoundingClientRect();
		const scrollParent = scrollParentRef.current;
		let clipLeft: number;
		let clipRight: number;
		if (scrollParent) {
			const parentRect = scrollParent.getBoundingClientRect();
			clipLeft = Math.max(0, parentRect.left - containerRect.left);
			clipRight = Math.min(elementWidth, parentRect.right - containerRect.left);
		} else {
			clipLeft = Math.max(0, -containerRect.left);
			clipRight = Math.min(
				elementWidth,
				window.innerWidth - containerRect.left,
			);
		}
		const visibleWidth = clipRight - clipLeft;
		if (visibleWidth <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(visibleWidth * dpr);
		canvas.height = Math.round(topHeight * dpr);
		canvas.style.width = `${visibleWidth}px`;
		canvas.style.height = `${topHeight}px`;
		canvas.style.left = `${clipLeft}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, visibleWidth, topHeight);

		const trimStartSeconds = element.trimStart / TICKS_PER_SECOND;
		// First tile boundary at or before the visible left edge, so tiles tile
		// seamlessly with the poster background regardless of scroll offset.
		const firstTile = Math.floor(clipLeft / tileWidth);
		const lastTile = Math.ceil(clipRight / tileWidth);

		for (let tile = firstTile; tile < lastTile; tile++) {
			const tileLeft = tile * tileWidth;
			const sourceTime = trimStartSeconds + tileLeft / pxPerSecond;
			const frame = getFilmstripFrame(mediaFile, sourceTime);
			if (!frame) continue; // poster background shows through until decoded
			ctx.drawImage(
				frame,
				0,
				0,
				frame.width,
				frame.height,
				tileLeft - clipLeft,
				0,
				tileWidth,
				topHeight,
			);
		}
	}, [
		mediaFile,
		element.duration,
		element.trimStart,
		zoomLevel,
		tileWidth,
		topHeight,
	]);

	const drawRef = useRef(draw);
	drawRef.current = draw;

	// Redraw when decoded frames land in the cache.
	useEffect(() => {
		const unsubscribe = subscribeFilmstrip(mediaFile, () => drawRef.current());
		drawRef.current();
		return unsubscribe;
	}, [mediaFile]);

	// Redraw on param/zoom changes.
	useEffect(() => {
		draw();
	}, [draw]);

	// Redraw while scrolling the (virtualized) timeline.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		scrollParentRef.current = findScrollParent({ element: container });
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) return;
		let rafId: number | null = null;
		const handler = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				drawRef.current();
			});
		};
		scrollParent.addEventListener("scroll", handler, { passive: true });
		return () => {
			scrollParent.removeEventListener("scroll", handler);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 overflow-hidden pointer-events-none"
		>
			<canvas ref={canvasRef} className="absolute top-0" />
		</div>
	);
}

function TiledMediaContent({
	element,
	track,
	zoomLevel,
}: {
	element: VideoElement | ImageElement;
	track: TimelineTrack;
	zoomLevel: number;
}) {
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const trackSliderPercent = useTimelineStore(
		(s) => s.trackSliders[track.id] ?? 100,
	);
	const elementDb =
		element.type === "video"
			? ((element as VideoElement).volume ?? 0)
			: 0;
	const effectiveVolume = dBToLinear(elementDb) * (trackSliderPercent / 100);
	const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
	const imageUrl =
		element.type === "video"
			? mediaAsset?.thumbnailUrl
			: (mediaAsset?.thumbnailUrl ?? mediaAsset?.url);

	if (!imageUrl && !mediaAsset?.url) {
		return (
			<span className="text-foreground/80 truncate text-xs">
				{getElementDisplayName({ element, mediaName: mediaAsset?.name })}
			</span>
		);
	}

	const trackHeight = getTrackHeight({ type: track.type });
	const isVideo = element.type === "video";
	// `effectiveVolume` already combines track slider (dB) + element
	// volume (dB) above. Just expose the perceptual-scaled version for
	// the waveform component.
	const waveformScale = Math.sqrt(effectiveVolume);

	// The track-row is split vertically: top 60% is the thumbnail
	// strip, bottom 40% is the audio waveform. Both halves are
	// sized off `trackHeight` so the thumbnails stay readable as
	// the user resizes the row.
	const filmstripHeight = isVideo ? Math.round(trackHeight * 0.6) : trackHeight;
	const tileWidth = filmstripHeight * THUMBNAIL_ASPECT_RATIO;
	const hasAudio = isVideo && (element.isSourceAudioEnabled ?? true);

	return (
		<>
			{/* Top portion: Thumbnail strip.
			   - For video: ALWAYS render the pre-rendered `thumbnailUrl`
			     as a tiled background first (synchronous, guaranteed
			     visible), then layer the canvas-based VideoFilmstrip
			     on top. The canvas can fail to extract frames (blob URL
			     race, browser quirks) and the user still sees SOMETHING.
			   - For image: just the tiled `imageUrl`. */}
			{isVideo && imageUrl ? (
				<div
					className={cn(
						"absolute top-0 left-0 right-0 overflow-hidden bg-black",
						hasAudio ? "rounded-t-xl" : "rounded-xl",
					)}
					style={{
						isolation: "isolate",
						height: `${filmstripHeight}px`,
						backgroundImage: `url(${imageUrl})`,
						backgroundRepeat: "repeat",
						backgroundSize: `${tileWidth}px ${filmstripHeight}px`,
						backgroundPosition: "left center",
						pointerEvents: "none",
					}}
				>
					{mediaAsset?.file ? (
						<VideoFilmstrip
							mediaFile={mediaAsset.file}
							element={element as VideoElement}
							tileWidth={tileWidth}
							topHeight={filmstripHeight}
							zoomLevel={zoomLevel}
						/>
					) : null}
				</div>
			) : imageUrl ? (
				<div
					className="absolute top-0 left-0 right-0 overflow-hidden rounded-xl"
					style={{
						isolation: "isolate",
						height: "100%",
						backgroundColor: "rgba(0, 0, 0, 1)",
						backgroundImage: `url(${imageUrl})`,
						backgroundRepeat: "repeat",
						backgroundSize: `${tileWidth}px ${filmstripHeight}px`,
						backgroundPosition: "left center",
						pointerEvents: "none",
					}}
				/>
			) : null}

			{/* Bottom portion: Audio Waveform (video only) */}
			{isVideo && mediaAsset?.url && hasAudio && (
				<div
					className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-b-xl"
					style={{
						height: `${trackHeight - filmstripHeight}px`,
						isolation: "isolate",
					}}
				>
					<AudioWaveform
						audioUrl={mediaAsset.url}
						mediaFile={mediaAsset.file}
						color="rgba(255, 255, 255, 0.5)"
						beatColor="rgba(255, 255, 255, 1)"
						variant="beats"
						symmetric={false}
						scale={waveformScale}
					/>
				</div>
			)}

			<MediaElementHeader
				name={getElementDisplayName({ element, mediaName: mediaAsset?.name })}
				leading={
					hasElementEffects({ element }) ? (
						<EffectsButton element={element} track={track} />
					) : null
				}
				hasFade={true}
			/>
		</>
	);
}

function MediaElementHeader({
	name,
	leading,
	hasFade,
}: {
	name?: string | null;
	leading?: ReactNode;
	hasFade?: boolean;
}) {
	if (!name && !leading) {
		return null;
	}

	const isLongName = name && name.length > 24;

	return (
		<div
			className={cn(
				"absolute top-0 left-0 flex h-7 w-full bg-linear-to-b pt-1",
				hasFade && "from-black/30 to-transparent",
			)}
		>
			{leading && <div className="pl-1">{leading}</div>}
			{name && (
				<div className="overflow-hidden px-1.5 text-[0.6rem] leading-tight text-white/75">
					{isLongName ? (
						<MarqueeText pxPerSecond={40} className="text-white/75">
							{name}
						</MarqueeText>
					) : (
						<span className="truncate block">{name}</span>
					)}
				</div>
			)}
		</div>
	);
}

function ElementContent({ element, track, zoomLevel }: ElementContentProps) {
	// Null layers are text elements with nullLayer flag — render as null
	if (element.type === "text" && (element as { nullLayer?: boolean }).nullLayer) {
		return <NullLayerContent element={element} />;
	}
	switch (element.type) {
		case "text":
			return <TextElementContent element={element} />;
		case "effect":
			return <EffectElementContent element={element} />;
		case "sticker":
			return <StickerElementContent element={element} />;
		case "graphic":
			return <GraphicElementContent element={element} />;
		case "audio":
			return <AudioElementContent element={element} track={track} />;
		case "camera":
			return <CameraElementContent element={element} />;
		case "video":
		case "image":
			return (
				<TiledMediaContent
					element={element}
					track={track}
					zoomLevel={zoomLevel}
				/>
			);
	}
}

function CopyMenuItem() {
	return (
		<ActionMenuItem
			action="copy-selected"
			icon={<HugeiconsIcon icon={Copy01Icon} />}
		>
			Copy layer
		</ActionMenuItem>
	);
}

function MuteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	isMuted,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	isMuted: boolean;
}) {
	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={VolumeMute02Icon} />;
		}
		return isMuted ? (
			<HugeiconsIcon icon={VolumeOffIcon} />
		) : (
			<HugeiconsIcon icon={VolumeHighIcon} />
		);
	};

	return (
		<ActionMenuItem action="toggle-elements-muted-selected" icon={getIcon()}>
			{isMuted ? "Unmute" : "Mute"}
		</ActionMenuItem>
	);
}

function VisibilityMenuItem({
	element,
	isMultipleSelected,
	isCurrentElementSelected,
}: {
	element: TimelineElementType;
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
}) {
	const isHidden = canElementBeHidden(element) && element.hidden;

	const getIcon = () => {
		if (isMultipleSelected && isCurrentElementSelected) {
			return <HugeiconsIcon icon={ViewOffSlashIcon} />;
		}
		return isHidden ? (
			<HugeiconsIcon icon={ViewIcon} />
		) : (
			<HugeiconsIcon icon={ViewOffSlashIcon} />
		);
	};

	return (
		<ActionMenuItem
			action="toggle-elements-visibility-selected"
			icon={getIcon()}
		>
			{isHidden ? "Show" : "Hide"}
		</ActionMenuItem>
	);
}

function DeleteMenuItem({
	isMultipleSelected,
	isCurrentElementSelected,
	elementType,
	selectedCount,
}: {
	isMultipleSelected: boolean;
	isCurrentElementSelected: boolean;
	elementType: TimelineElementType["type"];
	selectedCount: number;
}) {
	return (
		<ActionMenuItem
			action="delete-selected"
			variant="destructive"
			icon={<HugeiconsIcon icon={Delete02Icon} />}
		>
			{isMultipleSelected && isCurrentElementSelected
				? `Delete ${selectedCount} elements`
				: `Delete ${elementType === "text" ? "text" : "clip"}`}
		</ActionMenuItem>
	);
}

function ActionMenuItem({
	action,
	children,
	...props
}: Omit<ComponentProps<typeof ContextMenuItem>, "onClick" | "textRight"> & {
	action: TActionWithOptionalArgs;
	children: ReactNode;
}) {
	return (
		<ContextMenuItem
			onClick={(event: React.MouseEvent) => {
				event.stopPropagation();
				invokeAction(action);
			}}
			textRight={getDisplayShortcut({ action })}
			{...props}
		>
			{children}
		</ContextMenuItem>
	);
}
