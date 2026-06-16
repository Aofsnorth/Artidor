import type { EditorCore } from "@/core";
import type { ParamValues } from "@/lib/params";
import type {
	SceneTracks,
	TrackType,
	TimelineTrack,
	TimelineElement,
	RetimeConfig,
	ElementRef,
} from "@/lib/timeline";
import { calculateTotalDuration } from "@/lib/timeline";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { findTrackInSceneTracks } from "@/lib/timeline/track-element-update";
import {
	canElementBeHidden,
	canElementHaveAudio,
} from "@/lib/timeline/element-utils";
import type {
	AnimationPath,
	AnimationInterpolation,
	AnimationValue,
	AnimationValueForPath,
	ScalarCurveKeyframePatch,
} from "@/lib/animation/types";
import {
	getElementLocalTime,
	resolveAnimationTarget,
	resolveAnimationPathValueAtTime,
	buildEasyEasePatchesForElement,
} from "@/lib/animation";
import { lastFrameTime } from "artidor-wasm";
import { BatchCommand } from "@/lib/commands";
import {
	AddTrackCommand,
	RemoveTrackCommand,
	ToggleTrackMuteCommand,
	ToggleTrackVisibilityCommand,
	InsertElementCommand,
	DeleteElementsCommand,
	DuplicateElementsCommand,
	UpdateElementsCommand,
	SplitElementsCommand,
	MoveElementCommand,
	TracksSnapshotCommand,
	UpsertKeyframeCommand,
	RemoveKeyframeCommand,
	RetimeKeyframeCommand,
	UpdateScalarKeyframeCurveCommand,
	AddClipEffectCommand,
	RemoveClipEffectCommand,
	UpdateClipEffectParamsCommand,
	ToggleClipEffectCommand,
	ReorderClipEffectsCommand,
	RemoveMaskCommand,
	ToggleMaskInvertedCommand,
	UpsertEffectParamKeyframeCommand,
	RemoveEffectParamKeyframeCommand,
	ToggleSourceAudioSeparationCommand,
	UpdateTrackCommand,
} from "@/lib/commands/timeline";
import type { TrackPropertyUpdates } from "@/lib/commands/timeline";
import {
	GroupElementsCommand,
	UngroupElementsCommand,
	SetParentCommand,
	UnlinkParentCommand,
} from "@/lib/commands/timeline/grouping";
import type { InsertElementParams } from "@/lib/commands/timeline/element/insert-element";

export class TimelineManager {
	private listeners = new Set<() => void>();
	private previewOverlay = new Map<string, Partial<TimelineElement>>();
	private previewTracks: SceneTracks | null = null;

	constructor(private editor: EditorCore) {}

	addTrack({ type, index }: { type: TrackType; index?: number }): string {
		const command = new AddTrackCommand(type, index);
		this.editor.command.execute({ command });
		return command.getTrackId();
	}

	removeTrack({ trackId }: { trackId: string }): void {
		const command = new RemoveTrackCommand(trackId);
		this.editor.command.execute({ command });
	}

	updateTrack({
		trackId,
		updates,
	}: {
		trackId: string;
		updates: TrackPropertyUpdates;
	}): void {
		const command = new UpdateTrackCommand({ trackId, updates });
		this.editor.command.execute({ command });
	}

	insertElement({ element, placement }: InsertElementParams): void {
		const command = new InsertElementCommand({ element, placement });
		this.editor.command.execute({ command });
	}

	updateElementTrim({
		elementId,
		trimStart,
		trimEnd,
		startTime,
		duration,
		pushHistory = true,
	}: {
		elementId: string;
		trimStart: number;
		trimEnd: number;
		startTime?: number;
		duration?: number;
		pushHistory?: boolean;
	}): void {
		const trackId = this.findTrackIdForElement({ elementId });
		if (!trackId) {
			return;
		}

		const nextUpdates: Partial<TimelineElement> = {
			trimStart,
			trimEnd,
		};
		if (startTime !== undefined) {
			nextUpdates.startTime = startTime;
		}
		if (duration !== undefined) {
			nextUpdates.duration = duration;
		}

		this.updateElements({
			updates: [
				{
					trackId,
					elementId,
					patch: nextUpdates,
				},
			],
			pushHistory,
		});
	}

	updateElementRetime({
		trackId,
		elementId,
		retime,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		retime?: RetimeConfig;
		pushHistory?: boolean;
	}): void {
		this.updateElements({
			updates: [
				{
					trackId,
					elementId,
					patch: {
						retime,
					},
				},
			],
			pushHistory,
		});
	}

	moveElement({
		sourceTrackId,
		targetTrackId,
		elementId,
		newStartTime,
		createTrack,
	}: {
		sourceTrackId: string;
		targetTrackId: string;
		elementId: string;
		newStartTime: number;
		createTrack?: { type: TrackType; index: number };
	}): void {
		const command = new MoveElementCommand({
			sourceTrackId,
			targetTrackId,
			elementId,
			newStartTime,
			createTrack,
		});
		this.editor.command.execute({ command });
	}

	toggleTrackMute({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackMuteCommand(trackId);
		this.editor.command.execute({ command });
	}

	toggleTrackVisibility({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackVisibilityCommand(trackId);
		this.editor.command.execute({ command });
	}

	splitElements({
		elements,
		splitTime,
		retainSide = "both",
	}: {
		elements: { trackId: string; elementId: string }[];
		splitTime: number;
		retainSide?: "both" | "left" | "right";
	}): { trackId: string; elementId: string }[] {
		const command = new SplitElementsCommand({
			elements,
			splitTime,
			retainSide,
		});
		this.editor.command.execute({ command });
		return command.getRightSideElements();
	}

	getTotalDuration(): number {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) {
			return 0;
		}

		return calculateTotalDuration({ tracks: activeScene.tracks });
	}

	getLastFrameTime(): number {
		const duration = this.getTotalDuration();
		const fps = this.editor.project.getActive()?.settings.fps;
		if (!fps || duration <= 0) return duration;
		// duration is already an integer tick count (rounded in
		// calculateTotalDuration) but we round defensively for the WASM call.
		return (
			lastFrameTime({ duration: Math.round(duration), rate: fps }) ?? duration
		);
	}

	groupElements({ elementRefs }: { elementRefs: ElementRef[] }): string | null {
		if (elementRefs.length < 2) return null;
		const command = new GroupElementsCommand({ elementRefs });
		this.editor.command.execute({ command });
		return command.getGroupId();
	}

	ungroupElements({ groupId }: { groupId: string }): void {
		const command = new UngroupElementsCommand({ groupId });
		this.editor.command.execute({ command });
	}

	setParent({
		ref,
		parentId,
	}: {
		ref: ElementRef;
		parentId: string | undefined;
	}): void {
		const command = new SetParentCommand({ ref, parentId });
		this.editor.command.execute({ command });
	}

	unlinkParent({ ref }: { ref: ElementRef }): void {
		const command = new UnlinkParentCommand({ ref });
		this.editor.command.execute({ command });
	}

	insertCameraLayer(): void {
		const { buildCameraElement } =
			require("@/lib/camera") as typeof import("@/lib/camera");
		const playhead = this.editor.playback.getCurrentTime();
		const tracks = this.editor.scenes.getActiveScene().tracks;
		const overlayTrack = tracks.overlay[0];
		if (!overlayTrack) return;
		const camera = buildCameraElement({
			trackId: overlayTrack.id,
			startTime: playhead,
			duration: Math.round(5 * TICKS_PER_SECOND),
		});
		this.insertElement({
			element: camera as unknown as TimelineElement,
			placement: { mode: "explicit", trackId: overlayTrack.id },
		});
	}

	insertNullLayer(): void {
		const playhead = this.editor.playback.getCurrentTime();
		const tracks = this.editor.scenes.getActiveScene().tracks;
		const overlayTrack = tracks.overlay[0];
		if (!overlayTrack) return;
		const { generateUUID } =
			require("@/utils/id") as typeof import("@/utils/id");
		const element = {
			id: generateUUID(),
			type: "text",
			name: "Null",
			startTime: playhead,
			duration: Math.round(5 * TICKS_PER_SECOND),
			trimStart: 0,
			trimEnd: 0,
			hidden: true,
			content: "",
			fontFamily: "Arial",
			fontSize: 1,
			fontWeight: "normal" as const,
			fontStyle: "normal" as const,
			textDecoration: "none" as const,
			textAlign: "center" as const,
			letterSpacing: 0,
			lineHeight: 1,
			color: "#000000",
			background: {
				enabled: false,
				color: "#000000",
				cornerRadius: 0,
				paddingX: 0,
				paddingY: 0,
				offsetX: 0,
				offsetY: 0,
			},
			transform: {
				scaleX: 1,
				scaleY: 1,
				position: { x: 0, y: 0 },
				rotate: 0,
			},
			opacity: 1,
			nullLayer: true,
		} as unknown as TimelineElement;
		this.insertElement({
			element,
			placement: { mode: "explicit", trackId: overlayTrack.id },
		});
	}

	getTrackById({ trackId }: { trackId: string }): TimelineTrack | null {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) {
			return null;
		}

		return findTrackInSceneTracks({ tracks: activeScene.tracks, trackId });
	}

	getElementsWithTracks({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): Array<{ track: TimelineTrack; element: TimelineElement }> {
		const result: Array<{ track: TimelineTrack; element: TimelineElement }> =
			[];

		for (const { trackId, elementId } of elements) {
			const track = this.getTrackById({ trackId });
			const element = track?.elements.find(
				(trackElement) => trackElement.id === elementId,
			);

			if (track && element) {
				result.push({ track, element });
			}
		}

		return result;
	}

	/**
	 * Returns every element that shares the given groupId, as ElementRefs.
	 * Single scan over all tracks (overlay + main + audio). Used to expand a
	 * selection so that grouped clips move/transform/delete together.
	 */
	getGroupMembers({ groupId }: { groupId: string }): ElementRef[] {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return [];
		const { overlay, main, audio } = activeScene.tracks;
		const members: ElementRef[] = [];
		for (const track of [...overlay, main, ...audio]) {
			for (const element of track.elements) {
				if ((element as { groupId?: string }).groupId === groupId) {
					members.push({ trackId: track.id, elementId: element.id });
				}
			}
		}
		return members;
	}

	/**
	 * Given a set of selected refs, expands it to include every other member
	 * of any group those refs belong to. Idempotent and dedup'd, so it's safe
	 * to run on every selection change.
	 */
	expandSelectionByGroup({ refs }: { refs: ElementRef[] }): ElementRef[] {
		if (refs.length === 0) return refs;
		const seen = new Set(refs.map((r) => `${r.trackId}:${r.elementId}`));
		const result = [...refs];
		const groupIds = new Set<string>();
		for (const ref of refs) {
			const track = this.getTrackById({ trackId: ref.trackId });
			const element = track?.elements.find((e) => e.id === ref.elementId);
			const gid = (element as { groupId?: string } | undefined)?.groupId;
			if (gid) groupIds.add(gid);
		}
		for (const gid of groupIds) {
			for (const member of this.getGroupMembers({ groupId: gid })) {
				const key = `${member.trackId}:${member.elementId}`;
				if (!seen.has(key)) {
					seen.add(key);
					result.push(member);
				}
			}
		}
		return result;
	}

	deleteElements({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new DeleteElementsCommand({ elements });
		this.editor.command.execute({ command });
	}

	toggleSourceAudioSeparation({
		trackId,
		elementId,
	}: {
		trackId: string;
		elementId: string;
	}): void {
		const command = new ToggleSourceAudioSeparationCommand({
			trackId,
			elementId,
		});
		this.editor.command.execute({ command });
	}

	updateElements({
		updates,
		pushHistory = true,
	}: {
		updates: Array<{
			trackId: string;
			elementId: string;
			patch: Partial<TimelineElement>;
		}>;
		pushHistory?: boolean;
	}): void {
		if (updates.length === 0) {
			return;
		}

		const command = new UpdateElementsCommand({
			updates,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	addClipEffect({
		trackId,
		elementId,
		effectType,
	}: {
		trackId: string;
		elementId: string;
		effectType: string;
	}): string {
		const command = new AddClipEffectCommand({
			trackId,
			elementId,
			effectType,
		});
		this.editor.command.execute({ command });
		return command.getEffectId() ?? "";
	}

	removeClipEffect({
		trackId,
		elementId,
		effectId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
	}): void {
		const command = new RemoveClipEffectCommand({
			trackId,
			elementId,
			effectId,
		});
		this.editor.command.execute({ command });
	}

	removeMask({
		trackId,
		elementId,
		maskId,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
	}): void {
		const command = new RemoveMaskCommand({
			trackId,
			elementId,
			maskId,
		});
		this.editor.command.execute({ command });
	}

	updateClipEffectParams({
		trackId,
		elementId,
		effectId,
		params,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		params: Partial<ParamValues>;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateClipEffectParamsCommand({
			trackId,
			elementId,
			effectId,
			params,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	toggleClipEffect({
		trackId,
		elementId,
		effectId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
	}): void {
		const command = new ToggleClipEffectCommand({
			trackId,
			elementId,
			effectId,
		});
		this.editor.command.execute({ command });
	}

	toggleMaskInverted({
		trackId,
		elementId,
		maskId,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
	}): void {
		const command = new ToggleMaskInvertedCommand({
			trackId,
			elementId,
			maskId,
		});
		this.editor.command.execute({ command });
	}

	reorderClipEffects({
		trackId,
		elementId,
		fromIndex,
		toIndex,
	}: {
		trackId: string;
		elementId: string;
		fromIndex: number;
		toIndex: number;
	}): void {
		const command = new ReorderClipEffectsCommand({
			trackId,
			elementId,
			fromIndex,
			toIndex,
		});
		this.editor.command.execute({ command });
	}

	upsertKeyframes({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			time: number;
			value: AnimationValue;
			interpolation?: AnimationInterpolation;
			keyframeId?: string;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		const commands = keyframes.map(
			({
				trackId,
				elementId,
				propertyPath,
				time,
				value,
				interpolation,
				keyframeId,
			}) =>
				new UpsertKeyframeCommand({
					trackId,
					elementId,
					propertyPath,
					time,
					value,
					interpolation,
					keyframeId,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		this.editor.command.execute({ command });
	}

	removeKeyframes({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			keyframeId: string;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		// Pre-sample values at playhead for each (element, property) pair.
		// This preserves "what you see is what you get" when all keyframes are deleted.
		const playheadTime = this.editor.playback.getCurrentTime();
		const valueAtPlayheadMap = new Map<string, AnimationValue | null>();

		for (const { trackId, elementId, propertyPath } of keyframes) {
			const key = `${elementId}:${propertyPath}`;
			if (valueAtPlayheadMap.has(key)) {
				continue;
			}

			const element = this.getElementByRef({ trackId, elementId });
			if (!element) {
				valueAtPlayheadMap.set(key, null);
				continue;
			}

			const localTime = getElementLocalTime({
				timelineTime: playheadTime,
				elementStartTime: element.startTime,
				elementDuration: element.duration,
			});

			const target = resolveAnimationTarget({ element, path: propertyPath });
			const baseValue =
				(target?.getBaseValue() as AnimationValueForPath<AnimationPath> | null) ??
				null;
			if (baseValue === null) {
				valueAtPlayheadMap.set(key, null);
				continue;
			}

			const value = resolveAnimationPathValueAtTime({
				animations: element.animations,
				propertyPath,
				localTime,
				fallbackValue: baseValue,
			});
			valueAtPlayheadMap.set(key, value);
		}

		const commands = keyframes.map(
			({ trackId, elementId, propertyPath, keyframeId }) =>
				new RemoveKeyframeCommand({
					trackId,
					elementId,
					propertyPath,
					keyframeId,
					valueAtPlayhead:
						valueAtPlayheadMap.get(`${elementId}:${propertyPath}`) ?? null,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		this.editor.command.execute({ command });
	}

	retimeKeyframe({
		trackId,
		elementId,
		propertyPath,
		keyframeId,
		time,
	}: {
		trackId: string;
		elementId: string;
		propertyPath: AnimationPath;
		keyframeId: string;
		time: number;
	}): void {
		const command = new RetimeKeyframeCommand({
			trackId,
			elementId,
			propertyPath,
			keyframeId,
			nextTime: time,
		});
		this.editor.command.execute({ command });
	}

	updateKeyframeCurves({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			componentKey: string;
			keyframeId: string;
			patch: ScalarCurveKeyframePatch;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		const commands = keyframes.map(
			({ trackId, elementId, propertyPath, componentKey, keyframeId, patch }) =>
				new UpdateScalarKeyframeCurveCommand({
					trackId,
					elementId,
					propertyPath,
					componentKey,
					keyframeId,
					patch,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		this.editor.command.execute({ command });
	}

	/**
	 * Applies an After-Effects-style "Easy Ease" to the given selected keyframes,
	 * producing smooth flat-tangent ease-in/ease-out on their adjacent segments.
	 * Resolves each keyframe's component channels and dispatches a single batched,
	 * undoable curve update. No-op when no keyframe yields an editable segment.
	 */
	applyEasyEase({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			keyframeId: string;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		// Group selected keyframes by element so we resolve each element's
		// animation channels once.
		const byElement = new Map<
			string,
			{
				trackId: string;
				elementId: string;
				refs: Array<{ propertyPath: AnimationPath; keyframeId: string }>;
			}
		>();
		for (const { trackId, elementId, propertyPath, keyframeId } of keyframes) {
			const key = `${trackId}:${elementId}`;
			const existing = byElement.get(key);
			if (existing) {
				existing.refs.push({ propertyPath, keyframeId });
				continue;
			}
			byElement.set(key, {
				trackId,
				elementId,
				refs: [{ propertyPath, keyframeId }],
			});
		}

		const curveUpdates: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			componentKey: string;
			keyframeId: string;
			patch: ScalarCurveKeyframePatch;
		}> = [];
		for (const { trackId, elementId, refs } of byElement.values()) {
			const element = this.getElementByRef({ trackId, elementId });
			if (!element) {
				continue;
			}
			const patches = buildEasyEasePatchesForElement({
				element,
				keyframes: refs,
			});
			for (const { propertyPath, componentKey, keyframeId, patch } of patches) {
				curveUpdates.push({
					trackId,
					elementId,
					propertyPath,
					componentKey,
					keyframeId,
					patch,
				});
			}
		}

		this.updateKeyframeCurves({ keyframes: curveUpdates });
	}

	upsertEffectParamKeyframe({
		trackId,
		elementId,
		effectId,
		paramKey,
		time,
		value,
		interpolation,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		paramKey: string;
		time: number;
		value: number;
		interpolation?: "linear" | "hold";
		keyframeId?: string;
	}): void {
		const command = new UpsertEffectParamKeyframeCommand({
			trackId,
			elementId,
			effectId,
			paramKey,
			time,
			value,
			interpolation,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	removeEffectParamKeyframe({
		trackId,
		elementId,
		effectId,
		paramKey,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		paramKey: string;
		keyframeId: string;
	}): void {
		const command = new RemoveEffectParamKeyframeCommand({
			trackId,
			elementId,
			effectId,
			paramKey,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	isPreviewActive(): boolean {
		return this.previewOverlay.size > 0;
	}

	previewElements({
		updates,
	}: {
		updates: Array<{
			trackId: string;
			elementId: string;
			updates: Partial<TimelineElement>;
		}>;
	}): void {
		for (const { elementId, updates: elementUpdates } of updates) {
			const existingOverlay = this.previewOverlay.get(elementId);
			const mergedOverlay = {
				...existingOverlay,
				...elementUpdates,
			} as Partial<TimelineElement>;
			this.previewOverlay.set(elementId, mergedOverlay);
		}
		const committedTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
		if (!committedTracks) {
			return;
		}
		this.previewTracks = this.applyPreviewOverlay(committedTracks);
		this.notify();
	}

	commitPreview(): void {
		if (this.previewOverlay.size === 0) return;
		const committedTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
		if (!committedTracks) {
			return;
		}
		const afterTracks =
			this.previewTracks ?? this.applyPreviewOverlay(committedTracks);
		const command = new TracksSnapshotCommand(committedTracks, afterTracks);
		this.editor.command.push({ command });
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.updateTracks(afterTracks);
	}

	discardPreview(): void {
		if (this.previewOverlay.size === 0) return;
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.notify();
	}

	private applyPreviewOverlay(tracks: SceneTracks): SceneTracks {
		if (this.previewOverlay.size === 0) return tracks;

		const applyTrackOverlay = <TTrack extends TimelineTrack>(
			track: TTrack,
		): TTrack => {
			const hasOverlay = track.elements.some((element) =>
				this.previewOverlay.has(element.id),
			);
			if (!hasOverlay) {
				return track;
			}

			const nextElements = track.elements.map((element) => {
				const overlay = this.previewOverlay.get(element.id);
				return overlay
					? ({ ...element, ...overlay } as TimelineElement)
					: element;
			});

			return { ...track, elements: nextElements } as TTrack;
		};

		return {
			overlay: tracks.overlay.map((track) => applyTrackOverlay(track)),
			main: applyTrackOverlay(tracks.main),
			audio: tracks.audio.map((track) => applyTrackOverlay(track)),
		};
	}

	duplicateElements({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): { trackId: string; elementId: string }[] {
		const command = new DuplicateElementsCommand({ elements });
		this.editor.command.execute({ command });
		return command.getDuplicatedElements();
	}

	toggleElementsVisibility({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const shouldHide = elements.some(({ trackId, elementId }) => {
			const element = this.getElementByRef({ trackId, elementId });
			return element && canElementBeHidden(element) && !element.hidden;
		});

		const nextUpdates = elements.flatMap(({ trackId, elementId }) => {
			const element = this.getElementByRef({ trackId, elementId });
			if (!element || !canElementBeHidden(element)) {
				return [];
			}

			return [
				{
					trackId,
					elementId,
					patch: { hidden: shouldHide },
				},
			];
		});

		this.updateElements({ updates: nextUpdates });
	}

	toggleElementsMuted({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const shouldMute = elements.some(({ trackId, elementId }) => {
			const element = this.getElementByRef({ trackId, elementId });
			return element && canElementHaveAudio(element) && !element.muted;
		});

		const nextUpdates = elements.flatMap(({ trackId, elementId }) => {
			const element = this.getElementByRef({ trackId, elementId });
			if (!element || !canElementHaveAudio(element)) {
				return [];
			}

			return [
				{
					trackId,
					elementId,
					patch: { muted: shouldMute },
				},
			];
		});

		this.updateElements({ updates: nextUpdates });
	}

	getPreviewTracks(): SceneTracks | null {
		return (
			this.previewTracks ??
			this.editor.scenes.getActiveSceneOrNull()?.tracks ??
			null
		);
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	private getElementByRef({
		trackId,
		elementId,
	}: {
		trackId: string;
		elementId: string;
	}): TimelineElement | undefined {
		return this.getTrackById({ trackId })?.elements.find(
			(element) => element.id === elementId,
		);
	}

	private findTrackIdForElement({
		elementId,
	}: {
		elementId: string;
	}): string | null {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) {
			return null;
		}

		if (
			activeScene.tracks.main.elements.some(
				(element) => element.id === elementId,
			)
		) {
			return activeScene.tracks.main.id;
		}

		for (const track of activeScene.tracks.overlay) {
			if (track.elements.some((element) => element.id === elementId)) {
				return track.id;
			}
		}

		for (const track of activeScene.tracks.audio) {
			if (track.elements.some((element) => element.id === elementId)) {
				return track.id;
			}
		}

		return null;
	}

	updateTracks(newTracks: SceneTracks): void {
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.editor.scenes.updateSceneTracks({ tracks: newTracks });
		this.notify();
	}
}
