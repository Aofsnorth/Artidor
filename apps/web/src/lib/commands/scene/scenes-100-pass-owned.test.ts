/**
 * Scene/track/transition/preview regressions (editor-100-pass, scenes scope).
 *
 * System under test: the real RemoveTrackCommand / DeleteElementsCommand /
 * ToggleTrackMuteCommand / ToggleTrackVisibilityCommand /
 * Add+UpdateTransitionCommand + getTransitionOverlapWindow +
 * getVisibleElementsWithBounds, driven through the real CommandManager where
 * history matters. Only the EditorCore singleton boundary is mocked (pattern:
 * lib/commands/timeline/track/remove-track.test.ts).
 *
 * In-memory scenes state: the mock keeps a scene list (id + tracks +
 * transitions) so setScenes/getScenes round-trip like ScenesManager. The
 * CommandManager mock boundary matches production: execute() applies the
 * selection override and pushes history; undo() restores prior selection only
 * when the command declared a selection override.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type {
	AudioTrack,
	ElementRef,
	SceneTracks,
	TextTrack,
	Transition,
	VideoTrack,
} from "@/lib/timeline";

interface MockScene {
	id: string;
	tracks: SceneTracks;
	transitions: Transition[];
}

let scenes: MockScene[];
let activeSceneId: string;
let selectedElements: ElementRef[] = [];

const activeScene = (): MockScene =>
	scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];

const editorMock = {
	scenes: {
		getActiveScene: () => activeScene(),
		getActiveSceneOrNull: () => activeScene(),
		getScenes: () => scenes,
		setScenes: ({ scenes: next }: { scenes: MockScene[] }) => {
			scenes = next;
		},
	},
	timeline: {
		updateTracks: (tracks: SceneTracks) => {
			activeScene().tracks = tracks;
		},
	},
	selection: {
		getSelectedElements: () => selectedElements,
		setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
			selectedElements = elements;
		},
		clearSelection: () => {
			selectedElements = [];
		},
	},
	playback: {
		getCurrentTime: () => currentTime,
		seek: ({ time }: { time: number }) => {
			currentTime = time;
			seekCalls.push(time);
		},
	},
	command: {
		history: [] as { previousSelection: ElementRef[]; select?: ElementRef[] }[],
	},
} as unknown as EditorCore;

let currentTime = 0;
let seekCalls: number[] = [];

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

mock.module("@/lib/transitions/registry", () => ({
	transitionsRegistry: {
		get: (type: string) => {
			if (type !== "fade") throw new Error(`Unknown transition: ${type}`);
			return { type: "fade", minDuration: 100, maxDuration: 3000 };
		},
	},
}));

const { RemoveTrackCommand } = await import(
	"@/lib/commands/timeline/track/remove-track"
);
const { DeleteElementsCommand } = await import(
	"@/lib/commands/timeline/element/delete-elements"
);
const { ToggleTrackMuteCommand } = await import(
	"@/lib/commands/timeline/track/toggle-track-mute"
);
const { ToggleTrackVisibilityCommand } = await import(
	"@/lib/commands/timeline/track/toggle-track-visibility"
);
const {
	AddTransitionCommand,
	UpdateTransitionCommand,
	getTransitionOverlapWindow,
	clampTransitionToOverlap,
} = await import("@/lib/commands/scene/transition");

afterAll(() => {
	mock.restore();
});

function buildVideoTrack(id: string): VideoTrack {
	return {
		id,
		name: id,
		type: "video",
		elements: [],
		muted: false,
		hidden: false,
	};
}

function buildTextTrack(id: string): TextTrack {
	return {
		id,
		name: id,
		type: "text",
		elements: [],
		hidden: false,
	};
}

function buildAudioTrack(id: string): AudioTrack {
	return {
		id,
		name: id,
		type: "audio",
		elements: [],
		muted: false,
	};
}

function buildSceneTracks(overrides: Partial<SceneTracks> = {}): SceneTracks {
	return {
		overlay: [],
		main: buildVideoTrack("main-track"),
		overlayAfter: [],
		audio: [],
		...overrides,
	};
}

function resetScenes(next: MockScene[], active = next[0].id) {
	scenes = next;
	activeSceneId = active;
	selectedElements = [];
	currentTime = 0;
	seekCalls = [];
}

function scene(
	id: string,
	tracks: SceneTracks,
	transitions: Transition[] = [],
) {
	return { id, tracks, transitions };
}

beforeEach(() => {
	resetScenes([scene("s1", buildSceneTracks())]);
});

/** Execute through a production-shaped history: selection override applies,
 * every execute pushes (even no-ops — the dead-step tests pin the count). */
function executeWithHistory(command: {
	execute: () => { select?: ElementRef[] } | undefined;
}) {
	const previousSelection = [...selectedElements];
	const result = command.execute();
	if (result?.select !== undefined) {
		selectedElements = [...result.select];
	}
	editorMock.command.history.push({
		previousSelection,
		select: result?.select ? [...result.select] : undefined,
	});
	return result;
}

function historyLength(): number {
	return editorMock.command.history.length;
}

describe("remove-track selection + transitions", () => {
	test("ordered groups incl overlayAfter: only the named lane is removed", () => {
		resetScenes([
			scene(
				"s1",
				buildSceneTracks({
					overlay: [buildTextTrack("top")],
					main: {
						...buildVideoTrack("main-track"),
						elements: [
							{
								id: "m1",
								name: "m1",
								type: "video",
								mediaId: "media",
								startTime: 0,
								duration: 120_000,
								trimStart: 0,
								trimEnd: 0,
								transform: {
									scaleX: 1,
									scaleY: 1,
									position: { x: 0, y: 0 },
									rotate: 0,
								},
								opacity: 1,
							},
						],
					},
					overlayAfter: [buildVideoTrack("below")],
					audio: [buildAudioTrack("audio-1")],
				}),
			),
		]);
		const result = executeWithHistory(new RemoveTrackCommand("below"));
		expect(result).toEqual({ select: [] });
		const tracks = activeScene().tracks;
		expect(tracks.overlay.map((t) => t.id)).toEqual(["top"]);
		expect(tracks.main.elements.map((e) => e.id)).toEqual(["m1"]);
		expect(tracks.overlayAfter).toHaveLength(0);
		expect(tracks.audio.map((t) => t.id)).toEqual(["audio-1"]);
	});

	test("stale selection into the removed lane is cleared", () => {
		resetScenes([
			scene("s1", buildSceneTracks({ overlay: [buildTextTrack("top")] })),
		]);
		selectedElements = [{ trackId: "top", elementId: "clip-1" }];
		const result = executeWithHistory(new RemoveTrackCommand("top"));
		expect(result).toEqual({ select: [] });
		expect(selectedElements).toEqual([]);
	});

	test("transitions referencing the removed track/elements are stripped", () => {
		const tracks = buildSceneTracks({ overlay: [buildTextTrack("top")] });
		resetScenes([
			scene("s1", tracks, [
				{
					id: "t-keep",
					transitionType: "fade",
					fromTrackId: "main-track",
					fromElementId: "m1",
					toTrackId: "main-track",
					toElementId: "m2",
					startTime: 0,
					duration: 100,
				},
				{
					id: "t-drop",
					transitionType: "fade",
					fromTrackId: "top",
					fromElementId: "c1",
					toTrackId: "main-track",
					toElementId: "m1",
					startTime: 0,
					duration: 100,
				},
			]),
		]);
		executeWithHistory(new RemoveTrackCommand("top"));
		expect(activeScene().transitions.map((t) => t.id)).toEqual(["t-keep"]);
	});

	test("no-op redo stability: unknown id writes nothing and clears nothing", () => {
		resetScenes([
			scene("s1", buildSceneTracks({ overlay: [buildTextTrack("top")] })),
		]);
		selectedElements = [{ trackId: "main-track", elementId: "m1" }];
		const before = historyLength();
		const result = executeWithHistory(new RemoveTrackCommand("nope"));
		expect(result).toBeUndefined();
		expect(historyLength()).toBe(before + 1);
		expect(activeScene().tracks.overlay.map((t) => t.id)).toEqual(["top"]);
		expect(selectedElements).toEqual([
			{ trackId: "main-track", elementId: "m1" },
		]);
		const redo = new RemoveTrackCommand("nope");
		expect(redo.execute()).toBeUndefined();
		expect(activeScene().tracks.overlay.map((t) => t.id)).toEqual(["top"]);
	});
});

describe("delete-elements transitions", () => {
	test("deleting a clip strips transitions referencing it", () => {
		const tracks = buildSceneTracks({
			main: {
				...buildVideoTrack("main-track"),
				elements: [
					{
						id: "a",
						name: "a",
						type: "video",
						mediaId: "media",
						startTime: 0,
						duration: 120_000,
						trimStart: 0,
						trimEnd: 0,
						transform: {
							scaleX: 1,
							scaleY: 1,
							position: { x: 0, y: 0 },
							rotate: 0,
						},
						opacity: 1,
					},
					{
						id: "b",
						name: "b",
						type: "video",
						mediaId: "media",
						startTime: 60_000,
						duration: 120_000,
						trimStart: 0,
						trimEnd: 0,
						transform: {
							scaleX: 1,
							scaleY: 1,
							position: { x: 0, y: 0 },
							rotate: 0,
						},
						opacity: 1,
					},
				],
			},
		});
		resetScenes([
			scene("s1", tracks, [
				{
					id: "t-ab",
					transitionType: "fade",
					fromTrackId: "main-track",
					fromElementId: "a",
					toTrackId: "main-track",
					toElementId: "b",
					startTime: 60_000,
					duration: 100,
				},
			]),
		]);
		const result = executeWithHistory(
			new DeleteElementsCommand({
				elements: [{ trackId: "main-track", elementId: "a" }],
			}),
		);
		expect(result).toEqual({ select: [] });
		expect(activeScene().tracks.main.elements.map((e) => e.id)).toEqual(["b"]);
		expect(activeScene().transitions).toEqual([]);
	});
});

describe("toggle mute/visibility dead steps", () => {
	test("mute on an incompatible (text) track writes nothing", () => {
		resetScenes([
			scene("s1", buildSceneTracks({ overlay: [buildTextTrack("top")] })),
		]);
		const before = JSON.stringify(activeScene().tracks);
		const result = executeWithHistory(new ToggleTrackMuteCommand("top"));
		expect(result).toBeUndefined();
		expect(JSON.stringify(activeScene().tracks)).toBe(before);
	});

	test("visibility on an audio track writes nothing", () => {
		resetScenes([
			scene("s1", buildSceneTracks({ audio: [buildAudioTrack("a1")] })),
		]);
		const before = JSON.stringify(activeScene().tracks);
		const result = executeWithHistory(new ToggleTrackVisibilityCommand("a1"));
		expect(result).toBeUndefined();
		expect(JSON.stringify(activeScene().tracks)).toBe(before);
	});

	test("compatible toggles still flip and undo", async () => {
		resetScenes([
			scene(
				"s1",
				buildSceneTracks({
					overlay: [buildTextTrack("top")],
					audio: [buildAudioTrack("a1")],
				}),
			),
		]);
		const mute = new ToggleTrackMuteCommand("a1");
		mute.execute();
		expect(activeScene().tracks.audio.find((t) => t.id === "a1")?.muted).toBe(
			true,
		);
		mute.undo();
		expect(activeScene().tracks.audio.find((t) => t.id === "a1")?.muted).toBe(
			false,
		);
		const vis = new ToggleTrackVisibilityCommand("top");
		vis.execute();
		expect(
			activeScene().tracks.overlay.find((t) => t.id === "top"),
		).toMatchObject({ hidden: true });
		vis.undo();
		expect(
			activeScene().tracks.overlay.find((t) => t.id === "top"),
		).toMatchObject({ hidden: false });
	});
});

describe("transitions overlap + validation", () => {
	const twoClips = () =>
		buildSceneTracks({
			main: {
				...buildVideoTrack("main-track"),
				elements: [
					{
						id: "a",
						name: "a",
						type: "video",
						mediaId: "media",
						startTime: 0,
						duration: 120_000,
						trimStart: 0,
						trimEnd: 0,
						transform: {
							scaleX: 1,
							scaleY: 1,
							position: { x: 0, y: 0 },
							rotate: 0,
						},
						opacity: 1,
					},
					{
						id: "b",
						name: "b",
						type: "video",
						mediaId: "media",
						startTime: 60_000,
						duration: 120_000,
						trimStart: 0,
						trimEnd: 0,
						transform: {
							scaleX: 1,
							scaleY: 1,
							position: { x: 0, y: 0 },
							rotate: 0,
						},
						opacity: 1,
					},
				],
			},
		});

	test("overlap window is min(end)-max(start), not the from-clip end", () => {
		const window = getTransitionOverlapWindow({
			tracks: twoClips(),
			fromTrackId: "main-track",
			fromElementId: "a",
			toTrackId: "main-track",
			toElementId: "b",
		});
		expect(window).toEqual({ overlapStart: 60_000, overlapEnd: 120_000 });
	});

	test("add clamps an outside startTime into the overlap + caps duration", () => {
		resetScenes([scene("s1", twoClips())]);
		const cmd = new AddTransitionCommand({
			id: "t1",
			transitionType: "fade",
			fromTrackId: "main-track",
			fromElementId: "a",
			toTrackId: "main-track",
			toElementId: "b",
			startTime: 120_000,
			duration: 1_000_000,
		});
		cmd.execute();
		const stored = activeScene().transitions.find((t) => t.id === "t1");
		expect(stored?.startTime).toBeGreaterThanOrEqual(60_000);
		expect(
			(stored?.startTime ?? 0) + (stored?.duration ?? 0),
		).toBeLessThanOrEqual(120_000);
		expect(stored?.duration).toBeLessThanOrEqual(3000);
	});

	test("add rejects missing clips and non-overlapping clips", () => {
		resetScenes([scene("s1", twoClips())]);
		expect(() =>
			new AddTransitionCommand({
				id: "t-missing",
				transitionType: "fade",
				fromTrackId: "main-track",
				fromElementId: "ghost",
				toTrackId: "main-track",
				toElementId: "b",
				startTime: 60_000,
				duration: 500,
			}).execute(),
		).toThrow();
		const disjoint = twoClips();
		disjoint.main.elements[1] = {
			...disjoint.main.elements[1],
			startTime: 200_000,
		};
		resetScenes([scene("s1", disjoint)]);
		expect(() =>
			new AddTransitionCommand({
				id: "t-disjoint",
				transitionType: "fade",
				fromTrackId: "main-track",
				fromElementId: "a",
				toTrackId: "main-track",
				toElementId: "b",
				startTime: 120_000,
				duration: 500,
			}).execute(),
		).toThrow();
	});

	test("update re-validates patched endpoints and clamps geometry", () => {
		resetScenes([scene("s1", twoClips())]);
		new AddTransitionCommand({
			id: "t1",
			transitionType: "fade",
			fromTrackId: "main-track",
			fromElementId: "a",
			toTrackId: "main-track",
			toElementId: "b",
			startTime: 60_000,
			duration: 500,
		}).execute();
		expect(() =>
			new UpdateTransitionCommand("t1", { fromElementId: "ghost" }).execute(),
		).toThrow();
		new UpdateTransitionCommand("t1", {
			startTime: 0,
			duration: 1_000_000,
		}).execute();
		const stored = activeScene().transitions.find((t) => t.id === "t1");
		expect(stored?.startTime).toBeGreaterThanOrEqual(60_000);
		expect(
			(stored?.startTime ?? 0) + (stored?.duration ?? 0),
		).toBeLessThanOrEqual(120_000);
	});

	test("clamp helper caps to definition maxDuration", () => {
		const clamped = clampTransitionToOverlap({
			tracks: twoClips(),
			transitionType: "fade",
			fromTrackId: "main-track",
			fromElementId: "a",
			toTrackId: "main-track",
			toElementId: "b",
			startTime: 60_000,
			duration: 60_000,
		});
		expect(clamped.duration).toBe(3000);
		expect(clamped.startTime).toBe(60_000);
	});
});

describe("scene switch selection + playhead", () => {
	test("switch clears stale selection and resets the shared playhead", async () => {
		const { ScenesManager } = await import("@/core/managers/scenes-manager");
		const manager = new ScenesManager(editorMock);
		resetScenes([
			scene("s1", buildSceneTracks()),
			scene("s2", buildSceneTracks()),
		]);
		activeSceneId = "s1";
		selectedElements = [{ trackId: "main-track", elementId: "old" }];
		currentTime = 90_000;
		const project = {
			currentSceneId: "s1",
			metadata: {},
			scenes: [],
		};
		(
			editorMock as unknown as {
				project: {
					getActive: () => unknown;
					setActiveProject: (arg: unknown) => void;
				};
			}
		).project = {
			getActive: () => project,
			setActiveProject: () => undefined,
		};
		Object.defineProperty(manager, "list", { value: scenes });
		await manager.switchToScene({ sceneId: "s2" });
		expect(selectedElements).toEqual([]);
		expect(currentTime).toBe(0);
		expect(seekCalls).toEqual([0]);
	});
});

describe("preview bounds include overlayAfter", () => {
	test("overlayAfter elements are listed in render-stack order (hit-test hits them)", async () => {
		const { getVisibleElementsWithBounds } = await import(
			"@/lib/preview/element-bounds"
		);
		const { hitTest } = await import("@/lib/preview/hit-test");
		const graphicElement = (id: string) => ({
			id,
			name: id,
			type: "graphic",
			definitionId: "rect",
			params: {},
			startTime: 0,
			duration: 120_000,
			trimStart: 0,
			trimEnd: 0,
			transform: {
				scaleX: 1,
				scaleY: 1,
				position: { x: 0, y: 0 },
				rotate: 0,
			},
			opacity: 1,
		});
		const graphicTrack = (id: string, elementId: string) => ({
			id,
			name: id,
			type: "graphic",
			elements: [graphicElement(elementId)],
			hidden: false,
		});
		const tracks = buildSceneTracks({
			overlay: [graphicTrack("top", "el-top")],
			overlayAfter: [graphicTrack("below", "el-below")],
		}) as unknown as SceneTracks;
		const withBounds = getVisibleElementsWithBounds({
			tracks,
			currentTime: 1000,
			canvasSize: { width: 1920, height: 1080 },
			mediaAssets: [],
		});
		const ids = withBounds.map((entry) => entry.elementId);
		// overlayAfter present (was omitted before the fix) and ordered
		// bottom-to-top per the render stack: below, main(empty), top.
		expect(ids).toContain("el-below");
		expect(ids).toContain("el-top");
		expect(ids.indexOf("el-below")).toBeLessThan(ids.indexOf("el-top"));
		// Center of the canvas hits both stacked elements; topmost wins.
		const hit = hitTest({
			canvasX: 960,
			canvasY: 540,
			elementsWithBounds: withBounds,
		});
		expect(hit?.elementId).toBe("el-top");
	});
});
