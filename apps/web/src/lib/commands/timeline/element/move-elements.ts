import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
	SceneTracks,
	TimelineElement,
	TrackType,
	TimelineTrack,
} from "@/lib/timeline";
import {
	buildEmptyTrack,
	validateElementTrackCompatibility,
	enforceMainTrackStart,
} from "@/lib/timeline/placement";
import { canPlaceTimeSpansOnTrack } from "@/lib/timeline/placement/overlap";
import type { PlacementTimeSpan } from "@/lib/timeline/placement/types";
import {
	findTrackInSceneTracks,
	updateTrackInSceneTracks,
} from "@/lib/timeline/track-element-update";

export class MoveElementCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly sourceTrackId: string;
	private readonly targetTrackId: string;
	private readonly elementId: string;
	private readonly newStartTime: number;
	private readonly createTrack: { type: TrackType; index: number } | undefined;

	constructor({
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
	}) {
		super();
		this.sourceTrackId = sourceTrackId;
		this.targetTrackId = targetTrackId;
		this.elementId = elementId;
		this.newStartTime = newStartTime;
		this.createTrack = createTrack;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const sourceTrack = findTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.sourceTrackId,
		});
		const element = sourceTrack?.elements.find(
			(trackElement) => trackElement.id === this.elementId,
		);

		if (!sourceTrack || !element) {
			throw new Error("Source track or element not found");
		}

		let targetTrack = findTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.targetTrackId,
		});
		let tracksToUpdate = this.savedState;
		if (!targetTrack && this.createTrack) {
			const newTrack = buildEmptyTrack({
				id: this.targetTrackId,
				type: this.createTrack.type,
			});
			tracksToUpdate = insertTrackAtDisplayIndex({
				tracks: this.savedState,
				track: newTrack,
				insertIndex: this.createTrack.index,
			});
			targetTrack = newTrack;
		}
		if (!targetTrack) {
			throw new Error("Target track not found");
		}

		const validation = validateElementTrackCompatibility({
			element,
			track: targetTrack,
		});

		if (!validation.isValid) {
			throw new Error(validation.errorMessage);
		}

		let adjustedStartTime = enforceMainTrackStart({
			tracks: tracksToUpdate,
			targetTrackId: this.targetTrackId,
			requestedStartTime: this.newStartTime,
			excludeElementId: this.elementId,
		});

		// Overlap guard: after enforceMainTrackStart may have adjusted the
		// start time (e.g. snapped to 0 on the main track), re-check whether
		// the element would overlap another element on the target track.
		// Without this, the main track can end up with overlapping clips
		// because the overlap check in resolveTrackPlacement ran BEFORE
		// enforceMainTrackStart adjusted the time.
		const overlapTimeSpans: PlacementTimeSpan[] = [
			{
				startTime: adjustedStartTime,
				duration: element.duration,
				excludeElementId: this.elementId,
			},
		];
		if (!canPlaceTimeSpansOnTrack({ track: targetTrack, timeSpans: overlapTimeSpans })) {
			const overlappingNeighbor = targetTrack.elements
				.filter((el) => el.id !== this.elementId)
				.find((el) => {
					const elEnd = el.startTime + el.duration;
					return (
						adjustedStartTime < elEnd &&
						adjustedStartTime + element.duration > el.startTime
					);
				});
			if (overlappingNeighbor) {
				const pushedStart =
					overlappingNeighbor.startTime + overlappingNeighbor.duration;
				const pushedTimeSpans: PlacementTimeSpan[] = [
					{
						startTime: pushedStart,
						duration: element.duration,
						excludeElementId: this.elementId,
					},
				];
				if (
					canPlaceTimeSpansOnTrack({
						track: targetTrack,
						timeSpans: pushedTimeSpans,
					})
				) {
					adjustedStartTime = pushedStart;
				}
			}
		}

		// keyframe times remain clip-local, so moving only changes element startTime.
		const movedElement: TimelineElement = {
			...element,
			startTime: adjustedStartTime,
		};

		const isSameTrack = this.sourceTrackId === this.targetTrackId;

		const updatedTracks = isSameTrack
			? updateTrackInSceneTracks({
					tracks: tracksToUpdate,
					trackId: this.sourceTrackId,
					update: (track) => ({
						...track,
						elements: track.elements.map((trackElement) =>
							trackElement.id === this.elementId ? movedElement : trackElement,
						),
					}),
				})
			: updateTrackInSceneTracks({
					tracks: updateTrackInSceneTracks({
						tracks: tracksToUpdate,
						trackId: this.sourceTrackId,
						update: (track) => ({
							...track,
							elements: track.elements.filter(
								(trackElement) => trackElement.id !== this.elementId,
							),
						}),
					}),
					trackId: this.targetTrackId,
					update: (track) => ({
						...track,
						elements: [...track.elements, movedElement],
					}),
				});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

function insertTrackAtDisplayIndex({
	tracks,
	track,
	insertIndex,
}: {
	tracks: SceneTracks;
	track: TimelineTrack;
	insertIndex: number;
}): SceneTracks {
	if (track.type === "audio") {
		const audioInsertIndex = Math.max(
			0,
			Math.min(insertIndex - tracks.overlay.length - 1, tracks.audio.length),
		);
		return {
			...tracks,
			audio: [
				...tracks.audio.slice(0, audioInsertIndex),
				track,
				...tracks.audio.slice(audioInsertIndex),
			],
		};
	}

	const overlayInsertIndex = Math.max(
		0,
		Math.min(insertIndex, tracks.overlay.length),
	);
	return {
		...tracks,
		overlay: [
			...tracks.overlay.slice(0, overlayInsertIndex),
			track,
			...tracks.overlay.slice(overlayInsertIndex),
		],
	};
}
