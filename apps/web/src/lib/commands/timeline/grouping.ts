/**
 * Group/Parent commands (Alight Motion "Group layers" / "Link parent and
 * child layers").
 *
 * All five commands write the tracks ONCE via `timeline.updateTracks` with a
 * saved snapshot for undo/redo. They must never call the TimelineManager's
 * `updateElements`/`insertElement`/`deleteElements` helpers: those route
 * through `command.execute()`, which (a) pushes the child command into the
 * history as a separate entry — one user action became N+1 undo steps — and
 * (b) re-entered `CommandManager.execute` from inside another command's
 * `undo()`, pushing "undo" work onto the undo stack as if it were an edit.
 */
import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import {
	getOrderedTracks,
	type CombinedElement,
	type SceneTracks,
	type TimelineElement,
	type ElementRef,
} from "@/lib/timeline";
import { isValidParentChain } from "@/lib/timeline/parenting";
import { generateUUID } from "@/utils/id";

/**
 * Apply `patch` to the element identified by `ref`, returning new tracks.
 * Returns the input unchanged when the element does not exist (stale ref).
 */
function patchElementInTracks({
	tracks,
	ref,
	patch,
}: {
	tracks: SceneTracks;
	ref: ElementRef;
	patch: Partial<TimelineElement>;
}): SceneTracks {
	const orderedTracks = getOrderedTracks(tracks);
	const targetTrack = orderedTracks.find((track) => track.id === ref.trackId);
	if (!targetTrack?.elements.some((element) => element.id === ref.elementId)) {
		return tracks;
	}

	const patchTrack = <
		TTrack extends { id: string; elements: TimelineElement[] },
	>(
		track: TTrack,
	): TTrack =>
		track.id !== ref.trackId
			? track
			: {
					...track,
					elements: track.elements.map((element) =>
						element.id === ref.elementId
							? ({ ...element, ...patch } as TimelineElement)
							: element,
					),
				};

	return {
		...tracks,
		overlay: tracks.overlay.map(patchTrack),
		main: patchTrack(tracks.main),
		overlayAfter: tracks.overlayAfter.map(patchTrack),
		audio: tracks.audio.map(patchTrack),
	};
}

/**
 * Group behavior modes. "locked" is the hard selection lock (members can only
 * be edited individually after ungrouping); "standard" is Alight Motion's
 * grouping — the group selects/moves as a unit but members stay individually
 * editable through the group's edit mode.
 */
type GroupElementsMode = "locked" | "standard";

/**
 * Group multiple elements together by assigning them a shared groupId.
 * Group operations (move all, transform all) are downstream — the project
 * just needs to know the elements are linked.
 */
export class GroupElementsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private elementRefs: ElementRef[];
	private readonly groupId: string;
	private readonly mode: GroupElementsMode;

	constructor({
		elementRefs,
		mode = "locked",
	}: {
		elementRefs: ElementRef[];
		mode?: GroupElementsMode;
	}) {
		super();
		this.elementRefs = elementRefs;
		this.mode = mode;
		// Generated once in the constructor so the group id is stable across
		// execute/undo/redo cycles (getGroupId callers may chain follow-up
		// commands against this exact id).
		this.groupId = generateUUID();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		let updatedTracks = this.savedState;
		for (const ref of this.elementRefs) {
			updatedTracks = patchElementInTracks({
				tracks: updatedTracks,
				ref,
				patch: { groupId: this.groupId, groupMode: this.mode },
			});
		}

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (!this.savedState) return;
		EditorCore.getInstance().timeline.updateTracks(this.savedState);
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}

	getGroupId(): string {
		return this.groupId;
	}
}

/**
 * Ungroup a group of elements. Removes the shared groupId.
 */
export class UngroupElementsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private groupId: string;

	constructor({ groupId }: { groupId: string }) {
		super();
		this.groupId = groupId;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const removeGroupTag = <TTrack extends { elements: TimelineElement[] }>(
			track: TTrack,
		): TTrack => ({
			...track,
			elements: track.elements.map((element) => {
				const candidate = element as {
					groupId?: string;
					groupMode?: "locked" | "standard";
				};
				return candidate.groupId === this.groupId
					? ({
							...element,
							groupId: undefined,
							groupMode: undefined,
						} as TimelineElement)
					: element;
			}),
		});

		const updatedTracks: SceneTracks = {
			...this.savedState,
			overlay: this.savedState.overlay.map(removeGroupTag),
			main: removeGroupTag(this.savedState.main),
			overlayAfter: this.savedState.overlayAfter.map(removeGroupTag),
			audio: this.savedState.audio.map(removeGroupTag),
		};

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (!this.savedState) return;
		EditorCore.getInstance().timeline.updateTracks(this.savedState);
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}
}

/**
 * Combine multiple elements into a single "combined" element.
 * Unlike grouping (which just links elements), combine merges them
 * into a single track element with a special type.
 *
 * The combined element keeps the id assigned here (`combinedId`), which
 * equals the id returned by `getCombinedId()` — callers may chain follow-up
 * edits against it. Undo removes the combined element and restores the
 * originals; redo re-executes against the restored originals with the SAME
 * combined id.
 */
export class CombineElementsCommand extends Command {
	private elementRefs: ElementRef[];
	private readonly combinedId: string;
	private savedState: SceneTracks | null = null;

	constructor({ elementRefs }: { elementRefs: ElementRef[] }) {
		super();
		this.elementRefs = elementRefs;
		// Generated once so the id reported by getCombinedId() is the id that
		// actually lands on the timeline on every execute/redo cycle.
		this.combinedId = generateUUID();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		const orderedTracks = getOrderedTracks(this.savedState);

		// Resolve every source element up front; ignore stale refs.
		const sources = this.elementRefs
			.map((ref) => {
				const track = orderedTracks.find((track) => track.id === ref.trackId);
				const element = track?.elements.find(
					(element) => element.id === ref.elementId,
				);
				return element ? { ref, element: { ...element } } : null;
			})
			.filter((entry): entry is { ref: ElementRef; element: TimelineElement } =>
				Boolean(entry),
			);

		if (sources.length < 2) return undefined;

		const removeIds = new Set(
			sources.map(({ element }) => element.id as string),
		);
		const removeElements = <TTrack extends { elements: TimelineElement[] }>(
			track: TTrack,
		): TTrack => ({
			...track,
			elements: track.elements.filter((element) => !removeIds.has(element.id)),
		});

		const firstSource = sources[0]?.element;
		if (!firstSource) return undefined;

		const startTimes = sources.map(({ element }) => element.startTime);
		const endTimes = sources.map(
			({ element }) => element.startTime + element.duration,
		);
		const minStart = Math.min(...startTimes);
		const maxEnd = Math.max(...endTimes);

		const combinedElement: CombinedElement = {
			...firstSource,
			id: this.combinedId,
			name: `Combined ${sources.length} layers`,
			startTime: minStart,
			duration: maxEnd - minStart,
			trimStart: 0,
			trimEnd: 0,
			combinedElements: sources.map(({ element }) => element),
		};

		const firstTrackId = sources[0]?.ref.trackId;
		if (!firstTrackId) return undefined;

		const withCombined = <
			TTrack extends { id: string; elements: TimelineElement[] },
		>(
			track: TTrack,
		): TTrack => ({
			...removeElements(track),
			elements: [
				...removeElements(track).elements,
				...(track.id === firstTrackId ? [combinedElement] : []),
			],
		});

		const updatedTracks: SceneTracks = {
			...this.savedState,
			overlay: this.savedState.overlay.map(withCombined),
			main: withCombined(this.savedState.main),
			overlayAfter: this.savedState.overlayAfter.map(withCombined),
			audio: this.savedState.audio.map(withCombined),
		};

		editor.timeline.updateTracks(updatedTracks);
		return {
			select: [{ trackId: firstTrackId, elementId: this.combinedId }],
		};
	}

	undo(): void {
		if (!this.savedState) return;
		EditorCore.getInstance().timeline.updateTracks(this.savedState);
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}

	getCombinedId(): string {
		return this.combinedId;
	}
}

/**
 * Set a parent for an element. Validates the parent chain to prevent cycles.
 */
export class SetParentCommand extends Command {
	private ref: ElementRef;
	private parentId: string | undefined;
	private savedState: SceneTracks | null = null;

	constructor({
		ref,
		parentId,
	}: {
		ref: ElementRef;
		parentId: string | undefined;
	}) {
		super();
		this.ref = ref;
		this.parentId = parentId;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const tracks = editor.scenes.getActiveScene().tracks;

		const orderedTracks = getOrderedTracks(tracks);
		const track = orderedTracks.find((track) => track.id === this.ref.trackId);
		const element = track?.elements.find(
			(element) => element.id === this.ref.elementId,
		);
		if (!element) return undefined;

		// Validate cycle-free chain
		if (
			!isValidParentChain({
				element: element as TimelineElement,
				tracks,
				newParentId: this.parentId,
			})
		) {
			return undefined;
		}

		this.savedState = tracks;

		const updatedTracks = patchElementInTracks({
			tracks,
			ref: this.ref,
			patch: {
				parentId: this.parentId,
				parentEnabled: this.parentId ? true : undefined,
			},
		});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (!this.savedState) return;
		EditorCore.getInstance().timeline.updateTracks(this.savedState);
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}
}

/**
 * Unlink a child from its parent (keeps the layer, drops the parent link).
 */
export class UnlinkParentCommand extends Command {
	private ref: ElementRef;
	private savedState: SceneTracks | null = null;

	constructor({ ref }: { ref: ElementRef }) {
		super();
		this.ref = ref;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const tracks = editor.scenes.getActiveScene().tracks;

		const orderedTracks = getOrderedTracks(tracks);
		const track = orderedTracks.find((track) => track.id === this.ref.trackId);
		const element = track?.elements.find(
			(element) => element.id === this.ref.elementId,
		);
		if (!element) return undefined;

		this.savedState = tracks;

		const updatedTracks = patchElementInTracks({
			tracks,
			ref: this.ref,
			patch: {
				parentId: undefined,
				parentEnabled: undefined,
			},
		});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (!this.savedState) return;
		EditorCore.getInstance().timeline.updateTracks(this.savedState);
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}
}
