import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import {
	applyPlacement,
	resolveTrackPlacement,
} from "@/lib/timeline/placement";
import { cloneAnimations } from "@/lib/animation";

interface DuplicateElementsParams {
	elements: { trackId: string; elementId: string }[];
}

export class DuplicateElementsCommand extends Command {
	private duplicatedElements: { trackId: string; elementId: string }[] = [];
	private savedState: SceneTracks | null = null;
	/** Post-execute snapshot replayed on redo so duplicated ids stay stable. */
	private duplicatedState: SceneTracks | null = null;
	private elements: DuplicateElementsParams["elements"];

	constructor({ elements }: DuplicateElementsParams) {
		super();
		this.elements = elements;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		this.duplicatedElements = [];
		this.duplicatedState = null;

		let updatedTracks = this.savedState;

		// Dup-group policy mirrors the clipboard agent's paste remap: clones
		// never stay grouped with their originals. Every distinct source group
		// maps to ONE fresh group id so duplicated pairs stay grouped together
		// without linking back to the source set.
		const sourceGroupToFreshGroup = new Map<string, string>();

		for (const track of [
			...this.savedState.overlay,
			this.savedState.main,
			...this.savedState.overlayAfter,
			...this.savedState.audio,
		]) {
			const elementsToDuplicate = this.elements.filter(
				(elementEntry) => elementEntry.trackId === track.id,
			);

			if (elementsToDuplicate.length === 0) {
				continue;
			}

			const elementIdsToDuplicate = new Set(
				elementsToDuplicate.map((element) => element.elementId),
			);
			const newTrackElements: TimelineElement[] = [];

			for (const element of track.elements) {
				if (!elementIdsToDuplicate.has(element.id)) {
					continue;
				}

				const newId = generateUUID();
				newTrackElements.push(
					buildDuplicateElement({
						element,
						id: newId,
						startTime: element.startTime,
						sourceGroupToFreshGroup,
					}),
				);
			}

			const placementResult = resolveTrackPlacement({
				tracks: updatedTracks,
				trackType: track.type,
				timeSpans: [],
				strategy: { type: "alwaysNew", position: "highest" },
			});
			if (placementResult?.kind !== "newTrack") {
				continue;
			}

			const applied = applyPlacement({
				tracks: updatedTracks,
				placementResult,
				elements: newTrackElements,
			});
			if (!applied) {
				continue;
			}

			updatedTracks = applied.updatedTracks;

			for (const element of newTrackElements) {
				this.duplicatedElements.push({
					trackId: applied.targetTrackId,
					elementId: element.id,
				});
			}
		}

		this.duplicatedState = structuredClone(updatedTracks);
		editor.timeline.updateTracks(updatedTracks);

		if (this.duplicatedElements.length > 0) {
			return {
				select: this.duplicatedElements,
			};
		}
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	/** Redo replays the same snapshot so duplicated ids stay stable. */
	redo(): CommandResult | undefined {
		if (this.duplicatedState) {
			EditorCore.getInstance().timeline.updateTracks(
				structuredClone(this.duplicatedState),
			);
		}
		return this.duplicatedElements.length > 0
			? { select: this.duplicatedElements }
			: undefined;
	}

	getDuplicatedElements(): { trackId: string; elementId: string }[] {
		return this.duplicatedElements;
	}
}

function buildDuplicateElement({
	element,
	id,
	startTime,
	sourceGroupToFreshGroup,
}: {
	element: TimelineElement;
	id: string;
	startTime: number;
	sourceGroupToFreshGroup: Map<string, string>;
}): TimelineElement {
	const sourceGroupId = (element as TimelineElement & { groupId?: string })
		.groupId;
	// parentId points at a single element that was NOT duplicated (duplicates
	// always land on a new lane): drop it so the clone never stays linked to
	// the original. groupId is an opaque shared tag: all copies from one
	// source group share one fresh tag.
	let groupId: string | undefined;
	if (typeof sourceGroupId === "string") {
		const seen = sourceGroupToFreshGroup.get(sourceGroupId);
		if (seen) {
			groupId = seen;
		} else {
			groupId = generateUUID();
			sourceGroupToFreshGroup.set(sourceGroupId, groupId);
		}
	}
	return {
		...element,
		id,
		groupId,
		parentId: undefined,
		parentEnabled: undefined,
		name: `${element.name} (copy)`,
		startTime,
		animations: cloneAnimations({
			animations: element.animations,
			shouldRegenerateKeyframeIds: true,
		}),
	};
}
