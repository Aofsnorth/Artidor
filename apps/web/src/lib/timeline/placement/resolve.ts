import type { ElementType, SceneTracks, TrackType, TimelineTrack } from "@/lib/timeline";
import {
	getDefaultInsertIndexForTrack,
	getHighestInsertIndexForTrack,
	resolvePreferredNewTrackPlacement,
} from "./insert-index";
import { canElementGoOnTrack, getTrackTypeForElementType } from "./compatibility";
import { enforceMainTrackStart } from "./main-track";
import { canPlaceTimeSpansOnTrack } from "./overlap";
import type {
	PlacementResult,
	PlacementStrategy,
	PlacementSubject,
	PlacementTimeSpan,
} from "./types";

type ResolveTrackPlacementParams = PlacementSubject & {
	tracks: SceneTracks;
	timeSpans: PlacementTimeSpan[];
	strategy: PlacementStrategy;
};

function buildExistingTrackResult({
	track,
	trackIndex,
	tracks,
	timeSpans,
}: {
	track: TimelineTrack;
	trackIndex: number;
	tracks: SceneTracks;
	timeSpans: PlacementTimeSpan[];
}): PlacementResult | null {
	const firstSpan = timeSpans[0];
	const requestedStartTime = firstSpan?.startTime ?? 0;
	const adjustedStartTime = enforceMainTrackStart({
		tracks,
		targetTrackId: track.id,
		requestedStartTime,
		excludeElementId: firstSpan?.excludeElementId,
	});

	// Re-check overlap with the adjusted start time. enforceMainTrackStart
	// may have snapped the time to 0 (e.g. on the main track), which can
	// cause the element to overlap a different clip that the original
	// overlap check (run before this function) did not catch. If the
	// adjusted position overlaps, return null so the caller falls through
	// to new-track creation instead of placing an overlapping clip.
	if (adjustedStartTime !== requestedStartTime) {
		const adjustedTimeSpans: PlacementTimeSpan[] = [
			{
				startTime: adjustedStartTime,
				duration: firstSpan?.duration ?? 0,
				excludeElementId: firstSpan?.excludeElementId,
			},
		];
		if (!canPlaceTimeSpansOnTrack({ track, timeSpans: adjustedTimeSpans })) {
			return null;
		}
	}

	return {
		kind: "existingTrack",
		trackId: track.id,
		trackIndex,
		trackType: track.type,
		...(adjustedStartTime !== requestedStartTime ? { adjustedStartTime } : {}),
	};
}

function findFirstAvailableTrackIndex({
	tracks,
	trackType,
	elementType,
	timeSpans,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
	elementType: ElementType | undefined;
	timeSpans: PlacementTimeSpan[];
}): number {
	return tracks.findIndex((track) => {
		const isCompatible = elementType
			? canElementGoOnTrack({ elementType, trackType: track.type })
			: track.type === trackType;
		return (
			isCompatible &&
			canPlaceTimeSpansOnTrack({
				track,
				timeSpans,
			})
		);
	});
}

function resolveAlwaysNewTrack({
	tracks,
	trackType,
	position,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
	position: "highest" | "default";
}): PlacementResult {
	const insertIndex =
		position === "highest"
			? getHighestInsertIndexForTrack({
					tracks,
					trackType,
				})
			: getDefaultInsertIndexForTrack({
					tracks,
					trackType,
				});

	return buildNewTrackResult({
		trackType,
		insertIndex,
		insertPosition: null,
	});
}

function getInsertDirection({
	hoverDirection,
	verticalDragDirection,
}: {
	hoverDirection: "above" | "below";
	verticalDragDirection?: "up" | "down" | null;
}): "above" | "below" {
	if (verticalDragDirection === "up") {
		return "above";
	}

	if (verticalDragDirection === "down") {
		return "below";
	}

	return hoverDirection;
}

export function resolveTrackPlacement({
	tracks,
	...placement
}: ResolveTrackPlacementParams): PlacementResult | null {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	const elementType = placement.elementType;
	const trackType =
		placement.trackType ??
		(elementType ? getTrackTypeForElementType({ elementType }) : undefined);
	if (!trackType) {
		return null;
	}
	const { timeSpans, strategy } = placement;

	if (strategy.type === "explicit") {
		const trackIndex = orderedTracks.findIndex(
			(track) => track.id === strategy.trackId,
		);
		if (trackIndex < 0) {
			return null;
		}

		const track = orderedTracks[trackIndex];
		const isCompatible = elementType
			? canElementGoOnTrack({ elementType, trackType: track.type })
			: track.type === trackType;
		if (!isCompatible) {
			return null;
		}

		return buildExistingTrackResult({
			track,
			trackIndex,
			tracks,
			timeSpans,
		});
	}

	if (strategy.type === "firstAvailable") {
		const existingTrackIndex = findFirstAvailableTrackIndex({
			tracks: orderedTracks,
			trackType,
			elementType,
			timeSpans,
		});
		if (existingTrackIndex >= 0) {
			const result = buildExistingTrackResult({
				track: orderedTracks[existingTrackIndex],
				trackIndex: existingTrackIndex,
				tracks,
				timeSpans,
			});
			if (result) return result;
		}

		return resolveAlwaysNewTrack({
			tracks,
			trackType,
			position: "highest",
		});
	}

	if (strategy.type === "preferIndex") {
		const preferredTrack = orderedTracks[strategy.trackIndex];
		const isPreferredTrackCompatible =
			!!preferredTrack &&
			(elementType
				? canElementGoOnTrack({
						elementType,
						trackType: preferredTrack.type,
					})
				: preferredTrack.type === trackType);
		const canUseExistingTrack =
			!strategy.createNewTrackOnly &&
			isPreferredTrackCompatible &&
			canPlaceTimeSpansOnTrack({
				track: preferredTrack,
				timeSpans,
			});
		if (canUseExistingTrack) {
			const result = buildExistingTrackResult({
				track: preferredTrack,
				trackIndex: strategy.trackIndex,
				tracks,
				timeSpans,
			});
			if (result) return result;
		}

		const { insertIndex, insertPosition } = resolvePreferredNewTrackPlacement({
			tracks,
			trackType,
			preferredIndex: strategy.trackIndex,
			direction: getInsertDirection({
				hoverDirection: strategy.hoverDirection,
				verticalDragDirection: !isPreferredTrackCompatible
					? strategy.verticalDragDirection
					: null,
			}),
		});
		return buildNewTrackResult({
			trackType,
			insertIndex,
			insertPosition,
		});
	}

	if (strategy.type === "aboveSource") {
		const aboveTrackIndex = strategy.sourceTrackIndex - 1;
		const aboveTrack = orderedTracks[aboveTrackIndex];
		const aboveIsCompatible = aboveTrack
			? elementType
				? canElementGoOnTrack({
						elementType,
						trackType: aboveTrack.type,
					})
				: aboveTrack.type === trackType
			: false;
		if (
			aboveIsCompatible &&
			canPlaceTimeSpansOnTrack({
				track: aboveTrack,
				timeSpans,
			})
		) {
			const result = buildExistingTrackResult({
				track: aboveTrack,
				trackIndex: aboveTrackIndex,
				tracks,
				timeSpans,
			});
			if (result) return result;
		}

		const firstAvailableTrackIndex = findFirstAvailableTrackIndex({
			tracks: orderedTracks,
			trackType,
			elementType,
			timeSpans,
		});
		if (firstAvailableTrackIndex >= 0) {
			const result = buildExistingTrackResult({
				track: orderedTracks[firstAvailableTrackIndex],
				trackIndex: firstAvailableTrackIndex,
				tracks,
				timeSpans,
			});
			if (result) return result;
		}

		const insertIndex = getHighestInsertIndexForTrack({
			tracks,
			trackType,
		});

		return buildNewTrackResult({
			trackType,
			insertIndex,
			insertPosition: null,
		});
	}

	return resolveAlwaysNewTrack({
		tracks,
		trackType,
		position: strategy.position,
	});
}

function buildNewTrackResult({
	trackType,
	insertIndex,
	insertPosition,
}: {
	trackType: TrackType;
	insertIndex: number;
	insertPosition: "above" | "below" | null;
}): PlacementResult {
	return {
		kind: "newTrack",
		trackType,
		insertIndex,
		insertPosition,
	};
}
