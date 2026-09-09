import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { ElementClipboardItem } from "@/lib/clipboard/types";
import type {
	OverlayTrack,
	SceneTracks,
	VideoElement,
} from "@/lib/timeline/types";

let currentTracks: SceneTracks;

const editorMock = {
	scenes: {
		getActiveScene: () => ({ id: "scene", tracks: currentTracks }),
		getActiveSceneOrNull: () => ({ id: "scene", tracks: currentTracks }),
	},
	timeline: {
		updateTracks: (next: SceneTracks) => {
			currentTracks = next;
		},
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { PasteCommand } = await import("../paste");

afterAll(() => {
	mock.restore();
});

function buildVideo(
	id: string,
	startTime: number,
	overrides: Partial<VideoElement> = {},
): VideoElement {
	return buildVideoElement({ id, name: id, startTime, ...overrides });
}

function installEditor(tracks: SceneTracks) {
	currentTracks = tracks;
}

function buildItem(
	element: VideoElement,
	trackId: string,
): ElementClipboardItem {
	return {
		trackId,
		trackType: "video",
		element: element as unknown as ElementClipboardItem["element"],
	};
}

function videoTrack(id: string, elements: VideoElement[]): OverlayTrack {
	return {
		id,
		name: id,
		type: "video",
		elements,
		muted: false,
		hidden: false,
	} as OverlayTrack;
}

function baseTracks(mainElements: VideoElement[]): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: mainElements,
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
}

function allElements(): VideoElement[] {
	return [
		...currentTracks.overlay,
		currentTracks.main,
		...currentTracks.overlayAfter,
	].flatMap((track) => track.elements as VideoElement[]);
}

describe("PasteCommand regressions", () => {
	test("multi-lane paste creates a contiguous stack in copy order, not reverse", () => {
		installEditor({
			...baseTracks([buildVideo("m1", 1000)]),
			overlay: [videoTrack("overlay-1", [buildVideo("o1", 0)])],
		});

		new PasteCommand({
			time: 5000,
			clipboardItems: [
				buildItem(buildVideo("o1", 0), "overlay-1"),
				buildItem(buildVideo("m1", 1000), "main"),
			],
		}).execute();

		// Two new lanes were created above overlay-1: a contiguous pair in
		// copy order (o1 above m1).
		const newTracks = currentTracks.overlay.filter(
			(track) => track.id !== "overlay-1",
		);
		expect(currentTracks.overlay).toHaveLength(3);
		expect(newTracks).toHaveLength(2);
		expect(newTracks[0]?.elements).toHaveLength(1);
		expect(newTracks[1]?.elements).toHaveLength(1);
		// Copy order preserved: the overlay source item is in the earlier lane.
		expect(newTracks[0]?.elements[0]?.name).toBe("o1");
		expect(newTracks[1]?.elements[0]?.name).toBe("m1");
		// Both pasted copies keep their relative timing (m1 started 1000 after o1).
		expect(newTracks[1]?.elements[0]?.startTime).toBe(6000);
	});

	test("pasted elements get fresh IDs and never clone the source ID", () => {
		installEditor(baseTracks([buildVideo("m1", 0)]));

		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(buildVideo("m1", 0), "main")],
		});
		command.execute();

		const pasted = command.getPastedElements();
		expect(pasted).toHaveLength(1);
		expect(pasted[0]?.elementId).not.toBe("m1");

		const pastedId = pasted[0]?.elementId as string;
		const pastedElement = allElements().find(
			(element) => element.id === pastedId,
		);
		expect(pastedElement).toBeDefined();
		expect(pastedElement?.id).not.toBe("m1");
	});

	test("groupId/parentId links are remapped within the copied set", () => {
		installEditor(baseTracks([]));

		const child = buildVideo("child", 0, {
			parentId: "parent",
			groupId: "group-1",
		});
		const parent = buildVideo("parent", 0, { groupId: "group-1" });
		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(child, "main"), buildItem(parent, "main")],
		});
		command.execute();

		const pastedIds = command.getPastedElements().map((ref) => ref.elementId);
		expect(pastedIds).toHaveLength(2);

		const pastedParentId = pastedIds[1] as string;
		const pastedChild = allElements().find(
			(element) => element.id === pastedIds[0],
		);
		const pastedParent = allElements().find(
			(element) => element.id === pastedParentId,
		);
		// The pasted child must point at the pasted parent, not the original;
		// groupId is a shared opaque tag (not an element id), so both pasted
		// clips carry one fresh tag distinct from the original.
		expect(pastedChild?.parentId).toBe(pastedParentId);
		expect(pastedChild?.groupId).not.toBe("group-1");
		expect(pastedChild?.groupId).toBe(pastedParent?.groupId);
	});

	test("cross-track group and parent links survive a multi-lane paste", () => {
		installEditor(baseTracks([buildVideo("m1", 1000)]));

		const overlayChild = buildVideo("o-child", 0, {
			parentId: "m-parent",
			groupId: "group-x",
		});
		const mainParent = buildVideo("m-parent", 1000, { groupId: "group-x" });
		const command = new PasteCommand({
			time: 5000,
			clipboardItems: [
				buildItem(overlayChild, "overlay-1"),
				buildItem(mainParent, "main"),
			],
		});
		command.execute();

		const byName = new Map(
			command
				.getPastedElements()
				.map((ref) => allElements().find((e) => e.id === ref.elementId))
				.filter((e) => e !== undefined)
				.map((e) => [e.name, e]),
		);
		expect(byName.size).toBe(2);
		const pastedChild = byName.get("o-child");
		const pastedParent = byName.get("m-parent");
		// Cross-lane maps: the child links to the pasted parent on the other
		// lane, and both carry the same fresh group tag.
		expect(pastedChild?.parentId).toBe(pastedParent?.id);
		expect(pastedChild?.groupId).not.toBe("group-x");
		expect(pastedChild?.groupId).toBe(pastedParent?.groupId);
	});

	test("multi-lane paste preserves relative spacing from the earliest item", () => {
		installEditor(baseTracks([buildVideo("m1", 1000)]));

		const overlayChild = buildVideo("o-child", 0);
		const mainParent = buildVideo("m-parent", 1000);
		const command = new PasteCommand({
			time: 5000,
			clipboardItems: [
				buildItem(overlayChild, "overlay-1"),
				buildItem(mainParent, "main"),
			],
		});
		command.execute();

		const pasted = command
			.getPastedElements()
			.map((ref) => allElements().find((e) => e.id === ref.elementId));
		// Anchor: earliest item (overlay, t=0) lands exactly at `time`;
		// the main-lane item keeps its +1000 offset.
		const byStart = [...pasted].sort(
			(a, b) => (a?.startTime ?? 0) - (b?.startTime ?? 0),
		);
		expect(byStart[0]?.startTime).toBe(5000);
		expect(byStart[1]?.startTime).toBe(6000);
	});

	test("paste clamps times that would land before zero", () => {
		installEditor(baseTracks([]));

		// Overlay-lane paste (the clamp path, not the main-track anchor path):
		// with a main-track item already at 500, the earliest pasted copy lands
		// at `time`, the later one keeps its +3000 offset, and a paste whose
		// offsets would land before 0 is clamped to 0, never negative.
		installEditor({
			...baseTracks([buildVideo("m1", 500)]),
			overlay: [videoTrack("overlay-1", [buildVideo("o1", 0)])],
		});

		const early = buildVideo("early", 0);
		const late = buildVideo("late", 3000);
		const atZero = new PasteCommand({
			time: 1000,
			clipboardItems: [
				buildItem(late, "overlay-1"),
				buildItem(early, "overlay-1"),
			],
		});
		atZero.execute();

		const pasted = atZero
			.getPastedElements()
			.map((ref) => allElements().find((e) => e.id === ref.elementId));
		const earlyCopy = pasted.find((e) => e?.name === "early");
		const lateCopy = pasted.find((e) => e?.name === "late");
		expect(earlyCopy?.startTime).toBe(1000);
		expect(lateCopy?.startTime).toBe(4000);
		for (const element of pasted) {
			expect(element?.startTime).toBeGreaterThanOrEqual(0);
		}

		// Same copy pasted at t=0 relative to a +3000-offset item: the clamp
		// keeps the late item at +3000 (no negative shift).
		const clamped = new PasteCommand({
			time: 0,
			clipboardItems: [
				buildItem(late, "overlay-1"),
				buildItem(early, "overlay-1"),
			],
		});
		clamped.execute();
		const clampedPasted = clamped
			.getPastedElements()
			.map((ref) => allElements().find((e) => e.id === ref.elementId));
		for (const element of clampedPasted) {
			expect(element?.startTime).toBeGreaterThanOrEqual(0);
		}
	});

	test("pasted copies do not overlap each other on the same target track", () => {
		installEditor(baseTracks([buildVideo("m1", 0, { duration: 100_000 })]));

		const first = buildVideo("first", 0, { duration: 5000 });
		const second = buildVideo("second", 2000, { duration: 5000 });
		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(first, "main"), buildItem(second, "main")],
		});
		command.execute();

		// The copies may land on separate lanes (placement policy), but the
		// same-track copies must keep their original relative offset so they
		// never stack exactly on top of each other.
		const pasted = command
			.getPastedElements()
			.map((ref) => allElements().find((e) => e.id === ref.elementId));
		const byStart = [...pasted].sort(
			(a, b) => (a?.startTime ?? 0) - (b?.startTime ?? 0),
		);
		expect(byStart[1]?.startTime).toBe((byStart[0]?.startTime ?? 0) + 2000);
	});

	test("a 2-element group copied across 2 tracks pastes as ONE fresh group", () => {
		installEditor({
			...baseTracks([buildVideo("m1", 1000)]),
			overlay: [videoTrack("overlay-1", [buildVideo("o1", 0)])],
		});

		// Both elements share group "group-1" but live on different tracks.
		const overlayMember = buildVideo("o-member", 0, { groupId: "group-1" });
		const mainMember = buildVideo("m-member", 1000, { groupId: "group-1" });
		const command = new PasteCommand({
			time: 5000,
			clipboardItems: [
				buildItem(overlayMember, "overlay-1"),
				buildItem(mainMember, "main"),
			],
		});
		command.execute();

		const pasted = command
			.getPastedElements()
			.map((ref) => allElements().find((e) => e.id === ref.elementId))
			.filter((e) => e !== undefined);
		expect(pasted).toHaveLength(2);

		const groupTags = pasted
			.map((e) => e?.groupId)
			.filter((g) => g !== undefined);
		// ONE fresh group tag across both pasted elements — not the original's
		// tag (would graft into the live group), not two per-lane tags.
		expect(new Set(groupTags).size).toBe(1);
		expect(groupTags[0]).not.toBe("group-1");
		expect(groupTags[0]).toBeDefined();
	});

	test("links to elements outside the copied set are dropped", () => {
		installEditor(baseTracks([]));

		const orphan = buildVideo("orphan", 0, {
			parentId: "not-copied",
		});
		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(orphan, "main")],
		});
		command.execute();

		const pastedId = command.getPastedElements()[0]?.elementId as string;
		const pasted = allElements().find((element) => element.id === pastedId);
		// parentId pointing outside the copy must drop (staying linked to the
		// original would attach the paste to a live element).
		expect(pasted?.parentId).toBeUndefined();
	});

	test("group membership is preserved with a fresh tag even when the group is otherwise uncopied", () => {
		installEditor(baseTracks([]));

		// A lone member of a group gets copied. groupId is opaque, so the
		// paste keeps the membership under a fresh tag — it must NOT stay
		// equal to the original tag (that would silently graft the paste
		// into the live original group) and must NOT be dropped (the
		// element was grouped; the paste mirrors that state).
		const member = buildVideo("member", 0, { groupId: "live-group" });
		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(member, "main")],
		});
		command.execute();

		const pastedId = command.getPastedElements()[0]?.elementId as string;
		const pasted = allElements().find((element) => element.id === pastedId);
		expect(pasted?.groupId).toBeDefined();
		expect(pasted?.groupId).not.toBe("live-group");
	});

	test("copied payload is isolated from later edits to the live element", () => {
		const source = buildVideo("m1", 0);
		installEditor(baseTracks([source]));
		const item = buildItem(source, "main");

		const command = new PasteCommand({ time: 1000, clipboardItems: [item] });
		command.execute();

		// Mutating the live source after copy must not affect the pasted clone.
		source.transform = { ...source.transform, rotate: 99 };

		const pastedId = command.getPastedElements()[0]?.elementId as string;
		const pastedElement = allElements().find(
			(element) => element.id === pastedId,
		);
		expect(pastedElement?.transform.rotate).toBe(0);
	});

	test("undo restores pre-paste tracks and redo re-pastes the same IDs", () => {
		installEditor(baseTracks([buildVideo("m1", 0)]));
		const before = currentTracks;

		const command = new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(buildVideo("m1", 0), "main")],
		});
		command.execute();
		const firstPasteIds = command
			.getPastedElements()
			.map((ref) => ref.elementId);

		command.undo();
		expect(currentTracks).toBe(before);

		command.redo();
		const secondPasteIds = command
			.getPastedElements()
			.map((ref) => ref.elementId);
		expect(secondPasteIds).toEqual(firstPasteIds);

		const pastedIds = new Set(secondPasteIds);
		const found = allElements().filter((element) => pastedIds.has(element.id));
		expect(found).toHaveLength(secondPasteIds.length);
	});

	test("single-lane paste keeps aboveSource placement behavior", () => {
		installEditor(baseTracks([buildVideo("m1", 0)]));

		new PasteCommand({
			time: 0,
			clipboardItems: [buildItem(buildVideo("m1", 0), "main")],
		}).execute();

		// Single-lane paste from main: no lane above exists and main is
		// occupied, so a new lane is created above main and main is untouched.
		expect(currentTracks.overlay).toHaveLength(1);
		expect(currentTracks.main.elements).toHaveLength(1);
	});
});
