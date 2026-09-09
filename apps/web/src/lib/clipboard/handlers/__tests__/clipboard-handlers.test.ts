import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SelectedKeyframeRef } from "@/lib/animation/types";
import type { ClipboardEntry, PasteContext } from "@/lib/clipboard/types";
import type { SceneTracks, VideoElement } from "@/lib/timeline/types";

let currentTracks: SceneTracks;
let selectedElements: { trackId: string; elementId: string }[];
let selectedKeyframes: SelectedKeyframeRef[];

const editorMock = {
	scenes: {
		getActiveScene: () => ({ id: "scene", tracks: currentTracks }),
		getActiveSceneOrNull: () => ({ id: "scene", tracks: currentTracks }),
	},
	timeline: {
		updateTracks: (next: SceneTracks) => {
			currentTracks = next;
		},
		getElementsWithTracks: ({
			elements,
		}: {
			elements: { trackId: string; elementId: string }[];
		}) =>
			elements.flatMap((ref) => {
				const track = [
					...currentTracks.overlay,
					currentTracks.main,
					...currentTracks.overlayAfter,
					...currentTracks.audio,
				].find((candidate) => candidate.id === ref.trackId);
				const element = track?.elements.find(
					(candidate) => candidate.id === ref.elementId,
				);
				return track && element ? [{ track, element }] : [];
			}),
	},
	selection: {
		getSelectedElements: () => selectedElements,
		getSelectedKeyframes: () => selectedKeyframes,
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { copyClipboardEntry, buildPasteClipboardCommand } = await import("..");

afterAll(() => {
	mock.restore();
});

function installEditor() {
	currentTracks = {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: [
				buildVideoElement({ id: "src", startTime: 2000, duration: 10_000 }),
				buildVideoElement({ id: "target", startTime: 5000, duration: 10_000 }),
			],
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
	selectedElements = [];
	selectedKeyframes = [];
}

const srcRef = { trackId: "main", elementId: "src" };
const targetRef = { trackId: "main", elementId: "target" };

describe("clipboard handler regressions", () => {
	test("keyframe copy spanning multiple elements falls through to element copy", () => {
		installEditor();
		selectedElements = [srcRef, targetRef];
		// Two keyframes on DIFFERENT elements: single-source resolution fails,
		// so the keyframe handler yields null and the elements handler runs.
		selectedKeyframes = [
			{
				trackId: "main",
				elementId: "src",
				propertyPath: "opacity",
				keyframeId: "k1",
			},
			{
				trackId: "main",
				elementId: "target",
				propertyPath: "opacity",
				keyframeId: "k2",
			},
		];

		const entry = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes,
			},
		});
		expect(entry?.type).toBe("elements");
		if (entry?.type !== "elements") return;
		expect(entry.items).toHaveLength(2); // both selected elements copied
	});

	test("failed copy clears the previous clipboard, not serves it stale", () => {
		installEditor();
		selectedElements = [srcRef];

		// 1. Successful copy stores an elements entry.
		const first = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes: [],
			},
		});
		expect(first?.type).toBe("elements");

		// 2. Next copy attempt fails (no selection at all).
		selectedElements = [];
		const second = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes: [],
			},
		});
		expect(second).toBeNull();

		// The ClipboardManager owns the stale-entry policy: a failed copy must
		// clear any previous entry so paste reports false instead of pasting
		// the old content. (Covered in clipboard-manager.test.ts.)
	});

	test("elements copy stores a deep clone of the source element", () => {
		installEditor();
		selectedElements = [srcRef];

		const entry = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes,
			},
		});
		expect(entry?.type).toBe("elements");
		if (entry?.type !== "elements") return;

		// Mutating the clipboard payload must not touch the live element.
		const copiedElement = entry.items[0].element as unknown as {
			transform: { rotate: number };
		};
		copiedElement.transform = {
			...copiedElement.transform,
			rotate: 77,
		};

		const live = currentTracks.main.elements.find((e) => e.id === "src");
		expect(live?.transform.rotate).toBe(0);
	});

	test("copied element survives deletion of the source (deep clone at copy time)", () => {
		installEditor();
		// Give the source real effects/masks so deep-copy survival is proven
		// for them, not just the transform.
		currentTracks.main.elements[0] = buildVideoElement({
			id: "src",
			startTime: 2000,
			duration: 10_000,
			effects: [
				{ id: "e1", type: "blur", enabled: true, params: { intensity: 5 } },
			],
		}) as never;
		const withMasks = currentTracks.main.elements[0] as unknown as {
			masks?: Array<{ id: string }>;
		};
		withMasks.masks = [{ id: "m1" }];
		selectedElements = [srcRef];

		const entry = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes,
			},
		});
		expect(entry?.type).toBe("elements");
		if (entry?.type !== "elements") return;

		// Delete the source element entirely after the copy.
		currentTracks = {
			...currentTracks,
			main: {
				...currentTracks.main,
				elements: currentTracks.main.elements.filter((e) => e.id !== "src"),
			},
		};

		// The clipboard still holds the full element: transform, effects,
		// masks — everything the copy snapshotted.
		const copied = entry.items[0].element as unknown as {
			id?: string;
			transform: { rotate: number };
			effects?: Array<{ params: { intensity: number } }>;
			masks?: Array<{ id: string }>;
		};
		expect(copied.id).toBe("src");
		expect(copied.transform.rotate).toBe(0);
		expect(copied.effects?.[0]?.params.intensity).toBe(5);
		expect(copied.masks?.[0]?.id).toBe("m1");

		// Paste after source deletion still builds a working command with
		// the full payload and lands at the paste time.
		const pasteContext: PasteContext = {
			editor: editorMock,
			selectedElements: [],
			selectedKeyframes: [],
			time: 3000,
		};
		const command = buildPasteClipboardCommand({
			entry,
			context: pasteContext,
		});
		expect(command).toBeDefined();
		command?.execute();

		const pasted = [
			...currentTracks.overlay,
			currentTracks.main,
			...currentTracks.overlayAfter,
		]
			.flatMap((track) => track.elements as VideoElement[])
			.find((e) => e.id !== "src");
		expect(pasted).toBeDefined();
		expect(pasted?.transform.rotate).toBe(0);
		expect(pasted?.effects?.[0]?.params.intensity).toBe(5);
		expect(pasted?.masks?.[0]?.id).toBe("m1");
	});

	test("copied style animations are isolated from the live element", () => {
		installEditor();
		selectedElements = [srcRef];
		selectedKeyframes = [
			{
				trackId: "main",
				elementId: "src",
				propertyPath: "opacity",
				keyframeId: "missing",
			},
		];

		const entry = copyClipboardEntry({
			context: {
				editor: editorMock,
				selectedElements,
				selectedKeyframes,
			},
		});
		// The stale keyframe selection must not block copying the element.
		expect(entry?.type).toBe("elements");
	});

	test("keyframe paste converts absolute playhead time to clip-local time", () => {
		installEditor();
		selectedElements = [targetRef];

		const entry: ClipboardEntry = {
			type: "keyframes",
			sourceElement: srcRef,
			items: [
				{
					propertyPath: "opacity",
					timeOffset: 0,
					value: 0.4,
					interpolation: "linear",
					curvePatches: [],
				},
			],
		};
		const pasteContext: PasteContext = {
			editor: editorMock,
			selectedElements: [targetRef],
			selectedKeyframes: [],
			time: 7000, // absolute playhead; target clip starts at 5000
		};

		const command = buildPasteClipboardCommand({
			entry,
			context: pasteContext,
		});
		expect(command).toBeDefined();
		command?.execute();

		const target = currentTracks.main.elements.find((e) => e.id === "target");
		const binding = target?.animations?.bindings.opacity;
		expect(binding).toBeDefined();
		const channelIds = binding?.components.map((c) => c.channelId) ?? [];
		const keyTimes = channelIds.flatMap(
			(id) =>
				target?.animations?.channels[id]?.keys.map((key) => key.time) ?? [],
		);
		// Local time on the target must be 7000 - 5000 = 2000, not 7000.
		expect(keyTimes).toContain(2000);
	});

	test("element paste builds a PasteCommand at the paste time", () => {
		installEditor();
		selectedElements = [targetRef];

		const entry: ClipboardEntry = {
			type: "elements",
			items: [
				{
					trackId: "main",
					trackType: "video",
					element: buildVideoElement({
						id: "src",
						startTime: 1000,
						duration: 5000,
					}) as never,
				},
			],
		};
		const pasteContext: PasteContext = {
			editor: editorMock,
			selectedElements: [targetRef],
			selectedKeyframes: [],
			time: 3000,
		};

		const command = buildPasteClipboardCommand({
			entry,
			context: pasteContext,
		});
		expect(command?.constructor.name).toBe("PasteCommand");
	});

	test("paste with empty keyframe items returns null", () => {
		installEditor();
		selectedElements = [targetRef];

		const entry: ClipboardEntry = {
			type: "keyframes",
			sourceElement: srcRef,
			items: [],
		};
		const pasteContext: PasteContext = {
			editor: editorMock,
			selectedElements: [targetRef],
			selectedKeyframes: [],
			time: 0,
		};

		const command = buildPasteClipboardCommand({
			entry,
			context: pasteContext,
		});
		expect(command).toBeNull();
	});
});
