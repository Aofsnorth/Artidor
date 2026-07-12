/**
 * Group/Parent commands (Alight Motion "Group layers" / "Link parent and
 * child layers").
 */
import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import {
	getOrderedTracks,
	type TimelineElement,
	type ElementRef,
} from "@/lib/timeline";
import { isValidParentChain } from "@/lib/timeline/parenting";
import { generateUUID } from "@/utils/id";

/**
 * Group multiple elements together by assigning them a shared groupId.
 * Group operations (move all, transform all) are downstream — the project
 * just needs to know the elements are linked.
 */
export class GroupElementsCommand extends Command {
	private elementRefs: ElementRef[];
	private groupId: string;
	private previousGroupIds: Array<{ ref: ElementRef; groupId?: string }>;

	constructor({ elementRefs }: { elementRefs: ElementRef[] }) {
		super();
		this.elementRefs = elementRefs;
		this.groupId = generateUUID();
		this.previousGroupIds = [];
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveScene();
		const tracks = scene.tracks;

		const beforeByRef = new Map<string, string | undefined>();
		for (const ref of this.elementRefs) {
			const track = getOrderedTracks(tracks).find((t) => t.id === ref.trackId);
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (element) {
				beforeByRef.set(
					ref.elementId,
					(element as { groupId?: string }).groupId,
				);
			}
		}
		this.previousGroupIds = this.elementRefs.map((ref) => ({
			ref,
			groupId: beforeByRef.get(ref.elementId),
		}));

		for (const ref of this.elementRefs) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId: ref.trackId,
						elementId: ref.elementId,
						patch: { groupId: this.groupId },
					},
				],
			});
		}

		return undefined;
	}

	undo(): void {
		for (const prev of this.previousGroupIds) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateElements({
				updates: [
					{
						trackId: prev.ref.trackId,
						elementId: prev.ref.elementId,
						patch: { groupId: prev.groupId },
					},
				],
			});
		}
	}

	getGroupId(): string {
		return this.groupId;
	}
}

/**
 * Ungroup a group of elements. Removes the shared groupId.
 */
export class UngroupElementsCommand extends Command {
	private groupId: string;
	private previousAssignments: Array<{ ref: ElementRef; groupId?: string }>;

	constructor({ groupId }: { groupId: string }) {
		super();
		this.groupId = groupId;
		this.previousAssignments = [];
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveScene();
		const tracks = scene.tracks;

		const members: ElementRef[] = [];
		for (const track of getOrderedTracks(tracks)) {
			for (const el of track.elements) {
				if ((el as { groupId?: string }).groupId === this.groupId) {
					members.push({ trackId: track.id, elementId: el.id });
				}
			}
		}

		for (const ref of members) {
			const track = getOrderedTracks(tracks).find((t) => t.id === ref.trackId);
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (element) {
				this.previousAssignments.push({
					ref,
					groupId: (element as { groupId?: string }).groupId,
				});
			}
		}

		for (const ref of members) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId: ref.trackId,
						elementId: ref.elementId,
						patch: { groupId: undefined },
					},
				],
			});
		}

		return undefined;
	}

	undo(): void {
		for (const prev of this.previousAssignments) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateElements({
				updates: [
					{
						trackId: prev.ref.trackId,
						elementId: prev.ref.elementId,
						patch: { groupId: prev.groupId },
					},
				],
			});
		}
	}
}

/**
 * Combine multiple elements into a single "combined" element.
 * Unlike grouping (which just links elements), combine merges them
 * into a single track element with a special type.
 */
export class CombineElementsCommand extends Command {
	private elementRefs: ElementRef[];
	private combinedId: string;
	private previousElements: Array<{
		ref: ElementRef;
		element: TimelineElement;
		trackIndex: number;
	}>;

	constructor({ elementRefs }: { elementRefs: ElementRef[] }) {
		super();
		this.elementRefs = elementRefs;
		this.combinedId = generateUUID();
		this.previousElements = [];
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveScene();
		const tracks = scene.tracks;
		const orderedTracks = getOrderedTracks(tracks);

		// Save previous state
		for (const ref of this.elementRefs) {
			const trackIndex = orderedTracks.findIndex((t) => t.id === ref.trackId);
			const track = orderedTracks[trackIndex];
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (element && trackIndex >= 0) {
				this.previousElements.push({
					ref,
					element: { ...element } as TimelineElement,
					trackIndex,
				});
			}
		}

		if (this.previousElements.length === 0) return undefined;

		// Remove all original elements
		for (const prev of this.previousElements) {
			editor.timeline.deleteElements({
				elements: [prev.ref],
			});
		}

		// Create combined element on first track
		const firstTrack = orderedTracks[this.previousElements[0].trackIndex];
		if (!firstTrack) return undefined;

		const combinedElement = {
			id: this.combinedId,
			type: "combined" as const,
			name: `Combined ${this.previousElements.length} layers`,
			startTime: Math.min(
				...this.previousElements.map((p) => p.element.startTime),
			),
			duration:
				Math.max(
					...this.previousElements.map(
						(p) => p.element.startTime + p.element.duration,
					),
				) - Math.min(...this.previousElements.map((p) => p.element.startTime)),
			trimStart: 0,
			trimEnd: 0,
			opacity: 1,
			transform: {
				position: { x: 0, y: 0 },
				scaleX: 1,
				scaleY: 1,
				rotate: 0,
			},
			combinedElements: this.previousElements.map((p) => p.element),
		};

		editor.timeline.insertElement({
			// biome-ignore lint/suspicious/noExplicitAny: combined element carries heterogeneous payloads
			element: combinedElement as any,
			placement: { mode: "explicit", trackId: firstTrack.id },
		});

		return undefined;
	}

	undo(): void {
		const editor = EditorCore.getInstance();

		// Remove combined element
		const combinedTrackId =
			getOrderedTracks(editor.scenes.getActiveScene().tracks).find((track) =>
				track.elements.some((element) => element.id === this.combinedId),
			)?.id ?? "";
		editor.timeline.deleteElements({
			elements: [{ trackId: combinedTrackId, elementId: this.combinedId }],
		});

		// Restore original elements
		for (const prev of this.previousElements) {
			editor.timeline.insertElement({
				// biome-ignore lint/suspicious/noExplicitAny: combined elements preserve heterogeneous payloads
				element: prev.element as any,
				placement: { mode: "explicit", trackId: prev.ref.trackId },
			});
		}
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
	private previousParentId: string | undefined;
	private previousParentEnabled: boolean | undefined;

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
		this.previousParentId = undefined;
		this.previousParentEnabled = undefined;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveScene();
		const tracks = scene.tracks;

		// Find the element
		const track = getOrderedTracks(tracks).find(
			(t) => t.id === this.ref.trackId,
		);
		const element = track?.elements.find((el) => el.id === this.ref.elementId);
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

		this.previousParentId = (element as { parentId?: string }).parentId;
		this.previousParentEnabled = (
			element as { parentEnabled?: boolean }
		).parentEnabled;

		editor.timeline.updateElements({
			updates: [
				{
					trackId: this.ref.trackId,
					elementId: this.ref.elementId,
					patch: {
						parentId: this.parentId,
						parentEnabled: this.parentId ? true : undefined,
					},
				},
			],
		});

		return undefined;
	}

	undo(): void {
		const editor = EditorCore.getInstance();
		editor.timeline.updateElements({
			updates: [
				{
					trackId: this.ref.trackId,
					elementId: this.ref.elementId,
					patch: {
						parentId: this.previousParentId,
						parentEnabled: this.previousParentEnabled,
					},
				},
			],
		});
	}
}

/**
 * Unlink a child from its parent (keeps the layer, drops the parent link).
 */
export class UnlinkParentCommand extends Command {
	private ref: ElementRef;
	private previousParentId: string | undefined;
	private previousParentEnabled: boolean | undefined;

	constructor({ ref }: { ref: ElementRef }) {
		super();
		this.ref = ref;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveScene();
		const tracks = scene.tracks;
		const track = getOrderedTracks(tracks).find(
			(t) => t.id === this.ref.trackId,
		);
		const element = track?.elements.find((el) => el.id === this.ref.elementId);
		if (!element) return undefined;

		this.previousParentId = (element as { parentId?: string }).parentId;
		this.previousParentEnabled = (
			element as { parentEnabled?: boolean }
		).parentEnabled;

		editor.timeline.updateElements({
			updates: [
				{
					trackId: this.ref.trackId,
					elementId: this.ref.elementId,
					patch: {
						parentId: undefined,
						parentEnabled: undefined,
					},
				},
			],
		});

		return undefined;
	}

	undo(): void {
		const editor = EditorCore.getInstance();
		editor.timeline.updateElements({
			updates: [
				{
					trackId: this.ref.trackId,
					elementId: this.ref.elementId,
					patch: {
						parentId: this.previousParentId,
						parentEnabled: this.previousParentEnabled,
					},
				},
			],
		});
	}
}
