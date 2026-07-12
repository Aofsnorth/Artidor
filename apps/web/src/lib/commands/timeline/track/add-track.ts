import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TrackType } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import {
	buildEmptyTrack,
	getDefaultInsertIndexForTrack,
} from "@/lib/timeline/placement";

export class AddTrackCommand extends Command {
	private trackId: string;
	private savedState: SceneTracks | null = null;

	constructor(
		private type: TrackType,
		private index?: number,
	) {
		super();
		this.trackId = generateUUID();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const insertIndex =
			this.index ??
			getDefaultInsertIndexForTrack({
				tracks: this.savedState,
				trackType: this.type,
			});

		const updatedTracks =
			this.type === "audio"
				? buildAudioTrackState({
						tracks: this.savedState,
						insertIndex,
						trackId: this.trackId,
					})
				: buildOverlayTrackState({
						tracks: this.savedState,
						insertIndex,
						trackId: this.trackId,
						trackType: this.type,
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

	getTrackId(): string {
		return this.trackId;
	}
}

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

function buildAudioTrackState({
	tracks,
	insertIndex,
	trackId,
}: {
	tracks: SceneTracks;
	insertIndex: number;
	trackId: string;
}): SceneTracks {
	const audioInsertIndex = Math.max(
		0,
		Math.min(insertIndex - getAudioStartIndex(tracks), tracks.audio.length),
	);
	const newTrack = buildEmptyTrack({
		id: trackId,
		type: "audio",
	});
	return {
		...tracks,
		audio: [
			...tracks.audio.slice(0, audioInsertIndex),
			newTrack,
			...tracks.audio.slice(audioInsertIndex),
		],
	};
}

function buildOverlayTrackState({
	tracks,
	insertIndex,
	trackId,
	trackType,
}: {
	tracks: SceneTracks;
	insertIndex: number;
	trackId: string;
	trackType: Exclude<TrackType, "audio">;
}): SceneTracks {
	const newTrack =
		trackType === "video"
			? buildEmptyTrack({ id: trackId, type: "video" })
			: trackType === "text"
				? buildEmptyTrack({ id: trackId, type: "text" })
				: trackType === "graphic"
					? buildEmptyTrack({ id: trackId, type: "graphic" })
					: trackType === "image"
						? buildEmptyTrack({ id: trackId, type: "image" })
						: trackType === "camera"
							? buildEmptyTrack({ id: trackId, type: "camera" })
							: buildEmptyTrack({ id: trackId, type: "effect" });

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
				newTrack,
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
			newTrack,
			...tracks.overlayAfter.slice(overlayAfterInsertIndex),
		],
	};
}
