/**
 * Element command regressions (editor-100-pass, commands scope): duplicate,
 * insert, split. Only the EditorCore singleton boundary is mocked (pattern:
 * lib/commands/timeline/track/remove-track.test.ts).
 */
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type {
	ElementRef,
	SceneTracks,
	TimelineElement,
	VideoElement,
} from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

let currentTracks: SceneTracks;
let selectedElements: ElementRef[] = [];
let projectSettings: {
	canvasSize: { width: number; height: number };
	originalCanvasSize?: { width: number; height: number };
	fps: { numerator: number; denominator: number };
};
const settingsCalls: Array<Record<string, unknown>> = [];

const updateTracksMock = mock((tracks: SceneTracks) => {
	currentTracks = tracks;
});

const editorMock = {
	scenes: {
		getActiveScene: () => ({ tracks: currentTracks }),
		getActiveSceneOrNull: () => ({ tracks: currentTracks }),
	},
	timeline: {
		updateTracks: updateTracksMock,
	},
	selection: {
		getSelectedElements: () => selectedElements,
		setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
			selectedElements = elements;
		},
	},
	project: {
		getActiveOrNull: () => ({ settings: projectSettings }),
		getActive: () => ({ settings: projectSettings }),
		updateSettings: ({ settings }: { settings: Record<string, unknown> }) => {
			settingsCalls.push(settings);
			projectSettings = { ...projectSettings, ...settings } as typeof projectSettings;
		},
	},
	media: {
		getAssets: () => [] as Array<Record<string, unknown>>,
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

// PlaybackManager imports roundToFrame from artidor-wasm; bun:test never
// instantiates the wasm module, so mock it with a fixed tick rate.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => Math.round(time / 4_000) * 4_000,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

const { CommandManager } = await import("@/core/managers/commands");
const { DuplicateElementsCommand } = await import(
	"../element/duplicate-elements"
);
const { InsertElementCommand } = await import("../element/insert-element");
const { SplitElementsCommand } = await import("../element/split-elements");

afterAll(() => {
	mock.restore();
});

beforeEach(() => {
	updateTracksMock.mockClear();
	selectedElements = [];
	settingsCalls.length = 0;
	projectSettings = {
		canvasSize: { width: 1920, height: 1080 },
		fps: { numerator: 30, denominator: 1 },
	};
});

function resetTracks(tracks: SceneTracks) {
	currentTracks = tracks;
}

function allElements(): TimelineElement[] {
	return [
		...currentTracks.overlay,
		currentTracks.main,
		...currentTracks.overlayAfter,
		...currentTracks.audio,
	].flatMap((track) => track.elements);
}

function findElement(id: string): TimelineElement | undefined {
	return allElements().find((element) => element.id === id);
}

/* ------------------------------------------------------------------ */
/* Duplicate: overlayAfter coverage + group remap + stable redo       */
/* ------------------------------------------------------------------ */

test("duplicating an overlayAfter element is no longer a silent no-op", () => {
	resetTracks(
		buildSceneTracks({
			overlayAfter: [
				buildVideoTrack({
					id: "below",
					elements: [buildVideoElement({ id: "o2", startTime: 0 })],
				}),
			],
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new DuplicateElementsCommand({
			elements: [{ trackId: "below", elementId: "o2" }],
		}),
	});

	const duplicated = manager // selection carries the fresh ids
		? selectedElements
		: [];
	expect(duplicated).toHaveLength(1);
	// The original still exists and a copy landed on a new lane.
	const copyId = duplicated[0]?.elementId as string;
	expect(findElement("o2")).toBeDefined();
	expect(findElement(copyId)).toBeDefined();
	expect(copyId).not.toBe("o2");
});

test("duplicates get a fresh groupId and never stay grouped with the source", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({ id: "a", startTime: 0, groupId: "src" } as never),
					buildVideoElement({
						id: "b",
						startTime: 60_000,
						groupId: "src",
					} as never),
				],
			}),
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new DuplicateElementsCommand({
			elements: [
				{ trackId: "main", elementId: "a" },
				{ trackId: "main", elementId: "b" },
			],
		}),
	});

	const copies = selectedElements
		.map((ref) => findElement(ref.elementId))
		.filter((element): element is TimelineElement => Boolean(element));
	// Two copies exist, both grouped, but NOT with the source group id.
	expect(copies).toHaveLength(2);
	const freshGroupIds = new Set(
		copies.map((element) => (element as { groupId?: string }).groupId),
	);
	expect(freshGroupIds.has("src")).toBe(false);
	// ONE fresh tag shared by both copies (they stay grouped together).
	expect(freshGroupIds.size).toBe(1);
});

test("duplicate undo/redo round-trips with stable ids", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [buildVideoElement({ id: "a", startTime: 0 })],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const command = new DuplicateElementsCommand({
		elements: [{ trackId: "main", elementId: "a" }],
	});
	manager.execute({ command });
	const copyId = command.getDuplicatedElements()[0]?.elementId as string;
	expect(findElement(copyId)).toBeDefined();

	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement(copyId)).toBeUndefined();

	// Redo re-creates the SAME id (snapshot replay, not re-execute).
	manager.redo();
	expect(findElement(copyId)).toBeDefined();
	expect(allElements()).toHaveLength(2);
});

/* ------------------------------------------------------------------ */
/* Insert: overlayAfter-aware first-element detection + settings undo  */
/* ------------------------------------------------------------------ */

test("a project whose only elements are on overlayAfter is NOT empty", () => {
	resetTracks(
		buildSceneTracks({
			overlayAfter: [
				buildVideoTrack({
					id: "below",
					elements: [buildVideoElement({ id: "o2", startTime: 0 })],
				}),
			],
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new InsertElementCommand({
			placement: { mode: "explicit", trackId: "below" },
			element: {
				id: "new",
				type: "video",
				mediaId: "media",
				name: "New",
				startTime: 0,
				duration: 50_000,
				trimStart: 0,
				trimEnd: 0,
				transform: { scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, rotate: 0 },
				opacity: 1,
			} as never,
		}),
	});

	// Not "first element" → no canvas adoption happened at all.
	expect(settingsCalls).toHaveLength(0);
});

test("first-element insert restores adopted canvas/fps on undo", () => {
	resetTracks(buildSceneTracks());
	// Make the asset resolvable so the first-element adoption path runs.
	(editorMock.media.getAssets as unknown as () => Array<Record<string, unknown>>) =
		() => [
			{
				id: "media",
				width: 1080,
				height: 1920,
				type: "video",
				fps: 60,
			},
		];

	const manager = new CommandManager(editorMock);
	manager.execute({
		command: new InsertElementCommand({
			placement: { mode: "explicit", trackId: "main" },
			element: {
				id: "new",
				type: "video",
				mediaId: "media",
				name: "New",
				startTime: 0,
				duration: 50_000,
				trimStart: 0,
				trimEnd: 0,
				transform: { scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, rotate: 0 },
				opacity: 1,
			} as never,
		}),
	});

	// Adoption happened (canvas + fps raised to the asset's values).
	expect(projectSettings.canvasSize).toEqual({ width: 1080, height: 1920 });
	expect(projectSettings.fps).toEqual({ numerator: 60, denominator: 1 });

	// Undo must restore BOTH the tracks and the settings.
	manager.undo();
	expect(projectSettings.canvasSize).toEqual({ width: 1920, height: 1080 });
	expect(projectSettings.fps).toEqual({ numerator: 30, denominator: 1 });
	expect(findElement("new")).toBeUndefined();
});

/* ------------------------------------------------------------------ */
/* Split: frame alignment + sub-frame guard + curve slice              */
/* ------------------------------------------------------------------ */

test("split snaps a mid-frame playhead time onto the frame grid", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [buildVideoElement({ id: "a", startTime: 0, duration: 120_000 })],
			}),
		}),
	);
	const manager = new CommandManager(editorMock);

	// 41_000 is mid-frame at 30fps (frames are 4_000 ticks); the split must
	// land on 40_000.
	manager.execute({
		command: new SplitElementsCommand({
			elements: [{ trackId: "main", elementId: "a" }],
			splitTime: 41_000,
		}),
	});

	const elements = currentTracks.main.elements;
	expect(elements).toHaveLength(2);
	// Both halves frame-aligned: left ends at 40_000.
	expect(elements[0]).toMatchObject({ startTime: 0, duration: 40_000 });
	expect(elements[1]).toMatchObject({ startTime: 40_000, duration: 80_000 });
});

test("split whose snapped position leaves under one frame on a side is a no-op", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					// 5.25 frames (21_000 ticks) at 30fps: no frame boundary exists
					// in the last quarter.
					buildVideoElement({ id: "odd", startTime: 0, duration: 21_000 }),
				],
			}),
		}),
	);
	const manager = new CommandManager(editorMock);

	// Raw 20_000 is inside the element and already frame-aligned; the right
	// half would be 1_000 ticks = a quarter of a frame → the guard must no-op.
	manager.execute({
		command: new SplitElementsCommand({
			elements: [{ trackId: "main", elementId: "odd" }],
			splitTime: 20_000,
		}),
	});

	expect(currentTracks.main.elements).toHaveLength(1);
	expect(findElement("odd")).toBeDefined();
});

test("splitting a curve-retimed clip continues the ramp from the cut rate", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({
						id: "a",
						startTime: 0,
						duration: 120_000,
						retime: {
							rate: 1,
							mode: "curve",
							keyframes: [
								{ time: 0, speed: 1 },
								{ time: 1, speed: 4 },
							],
						},
					} as Partial<VideoElement>),
				],
			}),
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new SplitElementsCommand({
			elements: [{ trackId: "main", elementId: "a" }],
			splitTime: 60_000, // mid-clip: t = 0.5, curve speed there = 2.5
		}),
	});

	const elements = currentTracks.main.elements;
	expect(elements).toHaveLength(2);

	const leftRetime = elements[0]?.retime as {
		keyframes?: Array<{ time: number; speed: number }>;
	};
	const rightRetime = elements[1]?.retime as {
		keyframes?: Array<{ time: number; speed: number }>;
	};

	// Left keeps speed(0)=1 at its start and reaches the cut rate at its end.
	const leftFirst = leftRetime.keyframes?.[0];
	const leftLast = leftRetime.keyframes?.[leftRetime.keyframes.length - 1];
	expect(leftFirst).toEqual({ time: 0, speed: 1 });
	// Curve speed at t=0.5 interpolates 1→4: exactly 2.5.
	expect(leftLast?.speed).toBeCloseTo(2.5, 5);
	expect(leftLast?.time).toBe(1);

	// Right CONTINUES from the cut rate (2.5), NOT from the curve's speed(0).
	const rightFirst = rightRetime.keyframes?.[0];
	const rightLast = rightRetime.keyframes?.[rightRetime.keyframes.length - 1];
	expect(rightFirst?.speed).toBeCloseTo(2.5, 5);
	expect(rightFirst?.time).toBe(0);
	expect(rightLast).toEqual({ time: 1, speed: 4 });
});
