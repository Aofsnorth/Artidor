import { describe, expect, test } from "bun:test";
import { TimelineManager } from "@/core/managers/timeline-manager";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { Command } from "@/lib/commands/base-command";
import type {
	ElementRef,
	SceneTracks,
	VideoElement,
} from "@/lib/timeline/types";

/**
 * Cross-clip adjust bleed regression tests.
 *
 * Symptom: select clip 2, adjust it, and clip 1's grade changes too. Cause:
 * the preview overlay was a scene-wide `Map<elementId, patch>` and `commitPreview`
 * promoted EVERY staged entry as one snapshot — so a gesture that was staged on
 * clip 1 and never committed (panel unmounted mid-drag) rode along inside clip
 * 2's commit.
 *
 * These tests pin the two halves of the fix:
 *
 * - commits are element-scoped, so another clip's staged entry can never be
 *   promoted, and
 * - a stranded entry is resolved on selection change (before the new clip can
 *   stage or commit anything) instead of lingering in the overlay.
 */

interface Harness {
	manager: TimelineManager;
	getTracks: () => SceneTracks;
	pushed: Command[];
	select: (refs: ElementRef[]) => void;
}

function buildHarness(initialTracks: SceneTracks): Harness {
	let sceneTracks = initialTracks;
	let selected: ElementRef[] = [];
	const pushed: Command[] = [];
	const editor = {
		scenes: {
			getActiveScene: () => ({ id: "scene", tracks: sceneTracks }),
			getActiveSceneOrNull: () => ({ id: "scene", tracks: sceneTracks }),
			updateSceneTracks: ({ tracks }: { tracks: SceneTracks }) => {
				sceneTracks = tracks;
			},
		},
		command: {
			push: ({ command }: { command: Command }) => {
				pushed.push(command);
			},
			execute: ({ command }: { command: Command }) => {
				pushed.push(command);
				command.execute();
			},
		},
		selection: {
			getSelectedElements: () => [...selected],
			setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
				selected = elements;
			},
		},
	} as unknown as EditorCore;

	return {
		manager: new TimelineManager(editor),
		getTracks: () => sceneTracks,
		pushed,
		select: (refs) => {
			selected = refs;
		},
	};
}

/** Two clips side by side on the main track, no effects yet. */
function twoClipTracks(): SceneTracks {
	return buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({ id: "clip-1", startTime: 0 }),
				buildVideoElement({ id: "clip-2", startTime: 200_000 }),
			],
		}),
	});
}

function amountOf(tracks: SceneTracks, elementId: string): number | undefined {
	const clip = tracks.main.elements.find(
		(element): element is VideoElement => element.id === elementId,
	);
	const effect = clip?.effects?.find(
		(candidate) => candidate.type === "brightness",
	);
	return effect?.params?.amount as number | undefined;
}

/** Brightness of a clip as the renderer currently sees it (preview-aware). */
function previewAmount(
	manager: TimelineManager,
	elementId: string,
): number | undefined {
	const tracks = manager.getPreviewTracks();
	if (!tracks) throw new Error("expected preview tracks to be available");
	return amountOf(tracks, elementId);
}

const REF_1: ElementRef = { trackId: "main", elementId: "clip-1" };
const REF_2: ElementRef = { trackId: "main", elementId: "clip-2" };

const brightness = (amount: number) =>
	[
		{
			id: "fx-brightness",
			type: "brightness",
			enabled: true,
			params: { amount },
		},
	] as unknown as VideoElement["effects"];

describe("preview overlay isolation", () => {
	test("committing clip 2 never promotes clip 1's staged entry", () => {
		const { manager, getTracks, select } = buildHarness(twoClipTracks());

		// A drag on clip 1 that is interrupted before it commits.
		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(40) },
				},
			],
		});

		// The user selects clip 2 and drags ITS brightness. Clip 1's entry is
		// still staged, exactly as in the bug.
		select([REF_2]);
		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-2",
					updates: { effects: brightness(10) },
				},
			],
		});

		manager.commitPreviewForElement(REF_2);

		expect(amountOf(getTracks(), "clip-2")).toBe(10);
		expect(amountOf(getTracks(), "clip-1")).toBeUndefined();
	});

	test("a stranded entry is promoted on selection change, not by the next commit", () => {
		const { manager, getTracks, select } = buildHarness(twoClipTracks());

		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(40) },
				},
			],
		});

		select([REF_2]);
		manager.resolveStalePreviews();

		// The value the user saw on clip 1 is kept...
		expect(amountOf(getTracks(), "clip-1")).toBe(40);
		// ...and it did not touch the clip that was just selected.
		expect(amountOf(getTracks(), "clip-2")).toBeUndefined();
		expect(manager.isPreviewActive()).toBe(false);
	});

	test("scene-wide commit still promotes every staged entry", () => {
		const { manager, getTracks, select } = buildHarness(twoClipTracks());
		select([REF_1, REF_2]);

		// Multi-element gestures (group transform previews) stage several
		// entries in one call and commit them together.
		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(40) },
				},
				{
					trackId: "main",
					elementId: "clip-2",
					updates: { effects: brightness(10) },
				},
			],
		});
		manager.commitPreview();

		expect(amountOf(getTracks(), "clip-1")).toBe(40);
		expect(amountOf(getTracks(), "clip-2")).toBe(10);
		expect(manager.isPreviewActive()).toBe(false);
	});

	test("two clips sharing an element id stay isolated across tracks", () => {
		const tracks = buildSceneTracks({
			main: buildVideoTrack({
				id: "main",
				elements: [buildVideoElement({ id: "shared" })],
			}),
			overlay: [
				{
					id: "overlay-track",
					name: "Overlay",
					type: "video",
					elements: [buildVideoElement({ id: "shared" })],
					muted: false,
					hidden: false,
				},
			],
		});
		const { manager, getTracks } = buildHarness(tracks);

		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "shared",
					updates: { effects: brightness(40) },
				},
			],
		});
		manager.commitPreviewForElement({ trackId: "main", elementId: "shared" });

		expect(amountOf(getTracks(), "shared")).toBe(40);
		const overlayClip = getTracks().overlay[0].elements[0];
		expect(overlayClip.effects).toBeUndefined();
	});

	test("a committed write drops the staged entry it supersedes", () => {
		const { manager, getTracks } = buildHarness(twoClipTracks());

		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(40) },
				},
			],
		});
		// A preset click commits directly; the staged drag must not survive it
		// and reappear on a later preview.
		manager.updateTracks(getTracks());

		expect(manager.isPreviewActive()).toBe(false);
		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(20) },
				},
			],
		});

		expect(previewAmount(manager, "clip-1")).toBe(20);
	});

	test("resolveStalePreviews leaves a still-selected clip's drag alone", () => {
		const { manager, getTracks, select } = buildHarness(twoClipTracks());
		select([REF_1]);

		manager.previewElements({
			updates: [
				{
					trackId: "main",
					elementId: "clip-1",
					updates: { effects: brightness(40) },
				},
			],
		});
		manager.resolveStalePreviews();

		// Still previewing: NOT committed, still visible.
		expect(manager.isPreviewActive()).toBe(true);
		expect(amountOf(getTracks(), "clip-1")).toBeUndefined();
		expect(previewAmount(manager, "clip-1")).toBe(40);
	});
});
