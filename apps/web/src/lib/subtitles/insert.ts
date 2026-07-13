import type { EditorCore } from "@/core";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
	RemoveTrackCommand,
} from "@/lib/commands";
import { buildSubtitleTextElement } from "./build-subtitle-text-element";
import type { SubtitleCue } from "./types";
import type { TextTrack } from "@/lib/timeline";

/**
 * Caption tracks are identified by this exact track name. It gives caption
 * cues a lightweight identity (no new element variant) so we can: de-dupe on
 * regenerate (replace the old caption track instead of stacking duplicates)
 * and export the cues back to .srt/.ass.
 */
export const CAPTION_TRACK_NAME = "Captions";

/** Returns the current caption track (by name), if any. */
export function findCaptionTrack({
	editor,
}: {
	editor: EditorCore;
}): TextTrack | null {
	const { overlay } = editor.scenes.getActiveScene().tracks;
	const track = overlay.find(
		(t) => t.type === "text" && t.name === CAPTION_TRACK_NAME,
	);
	return (track as TextTrack | undefined) ?? null;
}

export function insertCaptionChunksAsTextTrack({
	editor,
	captions,
	captionPresetId,
}: {
	editor: EditorCore;
	captions: SubtitleCue[];
	captionPresetId?: string;
}): string | null {
	if (captions.length === 0) {
		return null;
	}

	// Regenerate semantics: if a caption track already exists, remove it first
	// so we replace rather than stack duplicate tracks.
	const existing = findCaptionTrack({ editor });

	const addTrackCommand = new AddTrackCommand("text", 0);
	const trackId = addTrackCommand.getTrackId();
	const canvasSize = editor.project.getActive().settings.canvasSize;
	const insertCommands = captions.map(
		(caption, index) =>
			new InsertElementCommand({
				placement: { mode: "explicit", trackId },
				element: buildSubtitleTextElement({
					index,
					caption,
					canvasSize,
					captionPresetId,
				}),
			}),
	);

	const commands = existing
		? [new RemoveTrackCommand(existing.id), addTrackCommand, ...insertCommands]
		: [addTrackCommand, ...insertCommands];
	editor.command.execute({ command: new BatchCommand(commands) });

	// Name the new track so it's recognisable as the caption track on the
	// next regenerate / export. Done as a direct state patch (the batch above
	// has already created it); this keeps AddTrackCommand generic.
	renameTrack({ editor, trackId, name: CAPTION_TRACK_NAME });

	return trackId;
}

function renameTrack({
	editor,
	trackId,
	name,
}: {
	editor: EditorCore;
	trackId: string;
	name: string;
}): void {
	const tracks = editor.scenes.getActiveScene().tracks;
	const overlay = tracks.overlay.map((t) =>
		t.id === trackId ? { ...t, name } : t,
	);
	editor.timeline.updateTracks({ ...tracks, overlay });
}
