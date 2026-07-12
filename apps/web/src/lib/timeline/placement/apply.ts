import type {
	AudioTrack,
	EffectTrack,
	GraphicTrack,
	ImageElement,
	OverlayTrack,
	SceneTracks,
	TextTrack,
	TimelineElement,
	VideoTrack,
	CameraTrack,
} from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { buildEmptyTrack } from "./track-factory";
import type { PlacementResult } from "./types";
import {
	findTrackInSceneTracks,
	updateTrackInSceneTracks,
} from "@/lib/timeline/track-element-update";

const MAIN_TRACK_COUNT = 1;

function getMainTrackIndex(tracks: SceneTracks): number {
	return tracks.overlay.length;
}

function getOverlayAfterStartIndex(tracks: SceneTracks): number {
	return getMainTrackIndex(tracks) + MAIN_TRACK_COUNT;
}

function getAudioStartIndex(tracks: SceneTracks): number {
	return getOverlayAfterStartIndex(tracks) + tracks.overlayAfter.length;
}

export function applyPlacement({
	tracks,
	placementResult,
	elements,
	newTrackInsertIndexOverride,
}: {
	tracks: SceneTracks;
	placementResult: PlacementResult;
	elements: TimelineElement[];
	newTrackInsertIndexOverride?: number;
}): { updatedTracks: SceneTracks; targetTrackId: string } | null {
	if (placementResult.kind === "existingTrack") {
		const targetTrack = findTrackInSceneTracks({
			tracks,
			trackId: placementResult.trackId,
		});
		if (!targetTrack) {
			return null;
		}

		const updatedTracks = updateTrackInSceneTracks({
			tracks,
			trackId: targetTrack.id,
			update: (track) => ({
				...track,
				elements: [...track.elements, ...elements],
			}),
		});

		return { updatedTracks, targetTrackId: targetTrack.id };
	}

	const newTrackId = generateUUID();
	const insertIndex =
		newTrackInsertIndexOverride ?? placementResult.insertIndex;
	const updatedTracks =
		placementResult.trackType === "audio"
			? {
					...tracks,
					audio: insertIntoAudioTracks({
						tracks,
						insertIndex,
						track: buildPlacedAudioTrack({
							id: newTrackId,
							elements,
						}),
					}),
				}
			: insertIntoOverlayOrOverlayAfter({
					tracks,
					insertIndex,
					track: buildPlacedOverlayTrack({
						id: newTrackId,
						type: placementResult.trackType,
						elements,
					}),
				});
	return { updatedTracks, targetTrackId: newTrackId };
}

function insertIntoOverlayOrOverlayAfter({
	tracks,
	insertIndex,
	track,
}: {
	tracks: SceneTracks;
	insertIndex: number;
	track: OverlayTrack;
}): SceneTracks {
	const mainTrackIndex = getMainTrackIndex(tracks);

	if (insertIndex <= mainTrackIndex) {
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

	const overlayAfterInsertIndex = Math.max(
		0,
		Math.min(
			insertIndex - getOverlayAfterStartIndex(tracks),
			tracks.overlayAfter.length,
		),
	);
	return {
		...tracks,
		overlayAfter: [
			...tracks.overlayAfter.slice(0, overlayAfterInsertIndex),
			track,
			...tracks.overlayAfter.slice(overlayAfterInsertIndex),
		],
	};
}

function insertIntoAudioTracks({
	tracks,
	insertIndex,
	track,
}: {
	tracks: SceneTracks;
	insertIndex: number;
	track: AudioTrack;
}): AudioTrack[] {
	const audioInsertIndex = Math.max(
		0,
		Math.min(insertIndex - getAudioStartIndex(tracks), tracks.audio.length),
	);
	const nextTracks = [...tracks.audio];
	nextTracks.splice(audioInsertIndex, 0, track);
	return nextTracks;
}

function buildPlacedAudioTrack({
	id,
	elements,
}: {
	id: string;
	elements: TimelineElement[];
}): AudioTrack {
	return {
		...buildEmptyTrack({ id, type: "audio" }),
		elements: elements as AudioTrack["elements"],
	};
}

function buildPlacedOverlayTrack({
	id,
	type,
	elements,
}: {
	id: string;
	type: Exclude<OverlayTrack["type"], "audio">;
	elements: TimelineElement[];
}): OverlayTrack {
	switch (type) {
		case "video":
			return {
				...buildEmptyTrack({ id, type: "video" }),
				elements: elements as VideoTrack["elements"],
			};
		case "text":
			return {
				...buildEmptyTrack({ id, type: "text" }),
				elements: elements as TextTrack["elements"],
			};
		case "graphic":
			return {
				...buildEmptyTrack({ id, type: "graphic" }),
				elements: elements as GraphicTrack["elements"],
			};
		case "effect":
			return {
				...buildEmptyTrack({ id, type: "effect" }),
				elements: elements as EffectTrack["elements"],
			};
		case "image":
			return {
				...buildEmptyTrack({ id, type: "image" }),
				elements: elements as ImageElement[],
			};
		case "camera":
			return {
				...buildEmptyTrack({ id, type: "camera" }),
				elements: elements as CameraTrack["elements"],
			};
	}
}
