/**
 * Group/Parent commands (Alight Motion "Group layers" / "Link parent and
 * child layers").
 */
import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TimelineElement, ElementRef } from "@/lib/timeline";
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
			const track = [
				...tracks.overlay,
				tracks.main,
				...tracks.audio,
			].find((t) => t.id === ref.trackId);
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (element) {
				beforeByRef.set(ref.elementId, (element as { groupId?: string }).groupId);
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
		for (const track of [
			...tracks.overlay,
			tracks.main,
			...tracks.audio,
		]) {
			for (const el of track.elements) {
				if ((el as { groupId?: string }).groupId === this.groupId) {
					members.push({ trackId: track.id, elementId: el.id });
				}
			}
		}

		for (const ref of members) {
			const track = [
				...tracks.overlay,
				tracks.main,
				...tracks.audio,
			].find((t) => t.id === ref.trackId);
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
		const track = [
			...tracks.overlay,
			tracks.main,
			...tracks.audio,
		].find((t) => t.id === this.ref.trackId);
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
		this.previousParentEnabled = (element as { parentEnabled?: boolean })
			.parentEnabled;

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
		const track = [
			...tracks.overlay,
			tracks.main,
			...tracks.audio,
		].find((t) => t.id === this.ref.trackId);
		const element = track?.elements.find((el) => el.id === this.ref.elementId);
		if (!element) return undefined;

		this.previousParentId = (element as { parentId?: string }).parentId;
		this.previousParentEnabled = (element as { parentEnabled?: boolean })
			.parentEnabled;

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
