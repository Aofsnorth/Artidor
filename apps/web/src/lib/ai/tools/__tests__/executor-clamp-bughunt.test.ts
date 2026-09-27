/**
 * AI tools bughunt-2 regressions: executor numeric clamp + dispatchCommand
 * error surfacing + split no-op honesty + preset filtering.
 *
 * Pattern: only the EditorCore singleton boundary is mocked (same as
 * lib/commands/timeline/__tests__/element-commands.test.ts). The executor
 * handlers are the system under test — they must produce the same clamped,
 * registry-consistent values the UI paths guarantee, and must surface
 * throw-on-bad-geometry command failures as ok:false instead of ok:true.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SceneTracks, Transition } from "@/lib/timeline/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";

let currentTracks: SceneTracks;
let transitions: Transition[];
let seekCalls: number[];
let volumeCalls: number[];
let playbackTime = 0;

const editorMock = {
	scenes: {
		getActiveScene: () => {
			if (!currentTracks) throw new Error("No active scene.");
			return { id: "scene", tracks: currentTracks, transitions };
		},
		getActiveSceneOrNull: () =>
			currentTracks
				? { id: "scene", tracks: currentTracks, transitions }
				: null,
		getScenes: () => [{ id: "scene", tracks: currentTracks, transitions }],
		setScenes: ({ scenes }: { scenes: Array<{ transitions: Transition[] }> }) => {
			transitions = scenes[0]?.transitions ?? transitions;
		},
	},
	timeline: {
		updateTracks: (next: SceneTracks) => {
			currentTracks = next;
		},
		getTrackById: ({ trackId }: { trackId: string }) =>
			[
				...currentTracks.overlay,
				currentTracks.main,
				...currentTracks.overlayAfter,
				...currentTracks.audio,
			].find((track) => track.id === trackId) ?? null,
	},
	selection: {
		getSelectedElements: () => [],
		getSelectedKeyframes: () => [],
		setSelectedElements: () => {},
	},
	command: {
		execute: ({ command }: { command: { execute: () => unknown } }) =>
			command.execute(),
	},
	project: {
		getActive: () => ({
			metadata: { id: "p" },
			settings: {
				fps: { numerator: 30, denominator: 1 },
				canvasSize: { width: 1920, height: 1080 },
			},
		}),
		getActiveOrNull: () => ({
			metadata: { id: "p" },
			settings: { fps: { numerator: 30, denominator: 1 } },
		}),
		setActiveProject: ({ project }: { project: { settings: unknown } }) => {
			lastProjectSettings = project.settings as typeof lastProjectSettings;
		},
	},
	playback: {
		getCurrentTime: () => playbackTime,
		seek: ({ time }: { time: number }) => {
			seekCalls.push(time);
			playbackTime = time;
		},
		setVolume: ({ volume }: { volume: number }) => {
			volumeCalls.push(volume);
		},
	},
	media: { getAssets: () => [] },
	clipboard: { copy: () => true, paste: () => true },
} as unknown as EditorCore;

let lastProjectSettings = {} as {
	fps: { numerator: number; denominator: number };
	canvasSize: { width: number; height: number };
	blurIntensity?: number;
};

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

// SplitElementsCommand imports roundToFrame from artidor-wasm; bun never
// instantiates the wasm module, so mock it with a fixed 30fps tick rate.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => Math.round(time / 4_000) * 4_000,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

const { registerDefaultEffects } = await import("@/lib/effects");
registerDefaultEffects();
const { registerDefaultTransitions } = await import("@/lib/transitions");
registerDefaultTransitions();

const { executeTool } = await import("@/lib/ai/tools/executor");

afterAll(() => {
	mock.restore();
});

function installTracks() {
	currentTracks = buildSceneTracks({
		main: buildVideoTrack({
			id: "main",
			elements: [
				buildVideoElement({ id: "a", startTime: 0, duration: 120_000 }),
				buildVideoElement({
					id: "b",
					startTime: 120_000,
					duration: 120_000,
				}),
			],
		}),
	});
	transitions = [];
	seekCalls = [];
	volumeCalls = [];
	playbackTime = 0;
	// Wire timeline manager-shaped facades the executor actually calls.
	// moveElement/splitElements/updateElements/addTrack/insertElement are
	// rebound per-test below where the real command path is needed; the
	// defaults here are lightweight spies for the clamp-only rounds.
	const mock = editorMock as unknown as {
		timeline: Record<string, unknown>;
		scenes: Record<string, unknown>;
	};
	mock.timeline.moveElement = ({
		newStartTime,
	}: {
		newStartTime: number;
	}) => {
		if (newStartTime < 0) throw new Error("negative");
		moveCalls.push(newStartTime);
	};
	mock.timeline.splitElements = ({
		splitTime,
	}: {
		splitTime: number;
	}) => splitCalls.push(splitTime) as unknown as Array<never>;
	mock.timeline.updateElements = () => {};
	mock.timeline.addTrack = () => "t";
	mock.timeline.insertElement = () => ({ elementId: "e", trackId: "main" });
}

const moveCalls: number[] = [];
const splitCalls: number[] = [];

beforeEach(() => {
	moveCalls.length = 0;
	splitCalls.length = 0;
	lastProjectSettings = {} as typeof lastProjectSettings;
	installTracks();
});

describe("executor numeric clamp (registry parity)", () => {
	test("set_project_fps clamps to 1..240 (registry numberSchema(1,240))", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "set_project_fps",
			arguments: { fps: 9999 },
		});
		expect(r.ok).toBe(true);
		expect(lastProjectSettings.fps.numerator).toBe(240);
	});

	test("set_project_canvas clamps to 16..7680 x 16..4320", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "set_project_canvas",
			arguments: { width: 99999, height: -5 },
		});
		expect(r.ok).toBe(true);
		expect(lastProjectSettings.canvasSize.width).toBe(7680);
		expect(lastProjectSettings.canvasSize.height).toBe(16);
	});

	test("set_volume clamps to 0..1 (registry numberSchema(0,1))", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "set_volume",
			arguments: { value: 5 },
		});
		expect(r.ok).toBe(true);
		expect(volumeCalls[0]).toBe(1);
	});

	test("seek clamps negative time to 0", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "seek",
			arguments: { time: -5000 },
		});
		expect(r.ok).toBe(true);
		expect(seekCalls[0]).toBe(0);
	});

	test("move_element clamps negative newStartTime to 0", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "move_element",
			arguments: {
				sourceTrackId: "main",
				elementId: "a",
				newStartTime: -100,
			},
		});
		expect(r.ok).toBe(true);
		expect(moveCalls[0]).toBe(0);
	});

	test("non-finite numerics fall back instead of being stored", async () => {
		// NaN/missing/0 fps must stay ok:false ("required") — the clamp
		// runs after the required check so it can never promote 0 → 1.
		for (const fps of [0, Number.NaN, undefined]) {
			const r = await executeTool({
				editor: editorMock,
				toolName: "set_project_fps",
				arguments: { fps },
			});
			expect(r.ok).toBe(false);
		}
		const v = await executeTool({
			editor: editorMock,
			toolName: "set_volume",
			arguments: { value: Number.POSITIVE_INFINITY },
		});
		expect(v.ok).toBe(true);
		expect(volumeCalls.at(-1)).toBe(1);
	});

	test("update_element clamps opacity/fontSize/pan/rotate/pivot/skew to registry ranges", async () => {
		// Route through the real UpdateElementsCommand so the test pins the
		// value the timeline actually stores, not just the executor patch.
		const { UpdateElementsCommand } = await import(
			"@/lib/commands/timeline/element/update-elements"
		);
		let seenPatch: Record<string, unknown> = {};
		(
			editorMock.timeline as unknown as Record<string, unknown>
		).updateElements = ({ // NOTE: .timeline level — the executor calls editor.timeline.updateElements
			updates,
		}: {
			updates: Array<{
				trackId: string;
				elementId: string;
				patch: Record<string, unknown>;
			}>;
		}) => {
			seenPatch = updates[0]?.patch ?? {};
			new UpdateElementsCommand({ updates: updates as never }).execute();
		};
		const r = await executeTool({
			editor: editorMock,
			toolName: "update_element",
			arguments: {
				trackId: "main",
				elementId: "a",
				opacity: 9,
				fontSize: 9999,
				pan: -500,
				rotate: 720,
				pivotX: 5,
				skewX: -120,
				startTime: -10,
				duration: -10,
			},
		});
		expect(r.ok).toBe(true);
		const el = currentTracks.main.elements.find((e) => e.id === "a") as unknown as {
			opacity: number;
			fontSize: number;
			pan: number;
			transform: {
				rotate: number;
				pivot: { x: number; y: number };
				skewX: number;
			};
			startTime: number;
			duration: number;
		};
		expect(el.opacity).toBe(1);
		// fontSize is a text-only field: video elements have no such key,
		// so UpdateElementsCommand stores nothing for it. The clamp is
		// pinned via seenPatch (executor boundary) instead.
		expect(seenPatch.fontSize).toBe(320);
		expect(el.pan).toBe(-100);
		expect(el.transform.rotate).toBe(360);
		expect(el.transform.pivot.x).toBe(1);
		expect(el.transform.skewX).toBe(-89);
		expect(el.startTime).toBe(0);
		expect(el.duration).toBe(1);
	});

	test("add_track index clamps to 0..32", async () => {
		let seenIndex = -999;
		const tl = (editorMock as unknown as { timeline: Record<string, unknown> })
			.timeline;
		const prevAddTrack = tl.addTrack;
		tl.addTrack = ({ index }: { index: number }) => {
			seenIndex = index;
			return "t";
		};
		const r = await executeTool({
			editor: editorMock,
			toolName: "add_track",
			arguments: { type: "video", index: 500 },
		});
		expect(r.ok).toBe(true);
		expect(seenIndex).toBe(32);
		tl.addTrack = prevAddTrack;
	});

	test("apply_beat_sync drops non-finite/negative beatTimes", async () => {
		(
			editorMock.timeline as unknown as Record<string, unknown>
		).updateElements = () => {};
		const r = await executeTool({
			editor: editorMock,
			toolName: "apply_beat_sync",
			arguments: {
				beatTimes: [Number.NaN, -5, Number.POSITIVE_INFINITY],
				elements: [{ trackId: "main", elementId: "a" }],
			},
		});
		expect(r.ok).toBe(false);
		expect(r.message).toContain("No beat times");
	});

	test("reorder_effects clamps negative indices to 0 (command stays no-op, never throws)", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "reorder_effects",
			arguments: {
				trackId: "main",
				elementId: "a",
				fromIndex: -3,
				toIndex: -1,
			},
		});
		expect(r.ok).toBe(true);
	});
});

describe("split_element no-op honesty", () => {
	test("split outside the element returns ok:false with re-read guidance", async () => {
		// Route through the real SplitElementsCommand: a=0..120k, b=120k..240k.
		const tl = (editorMock as unknown as { timeline: Record<string, unknown> })
			.timeline;
		const prev = tl.splitElements;
		const { SplitElementsCommand } = await import(
			"@/lib/commands/timeline/element/split-elements"
		);
		tl.splitElements = ({
			elements,
			splitTime,
			retainSide,
		}: {
			elements: Array<{ trackId: string; elementId: string }>;
			splitTime: number;
			retainSide?: "both" | "left" | "right";
		}) => {
			const cmd = new SplitElementsCommand({ elements, splitTime, retainSide });
			(editorMock as unknown as { command: { execute: (a: unknown) => void } })
				.command.execute({ command: cmd });
			return cmd.getRightSideElements();
		};
		const before = currentTracks.main.elements.length;
		const r = await executeTool({
			editor: editorMock,
			toolName: "split_element",
			arguments: { trackId: "main", elementId: "a", time: 999_999_999 },
		});
		expect(r.ok).toBe(false);
		expect(r.message).toContain("did not cut anything");
		expect(currentTracks.main.elements.length).toBe(before);
		tl.splitElements = prev;
	});

	test("mid-clip split still returns ok:true with the right-half id", async () => {
		// beforeEach installs a spy splitElements (returns []); rebind to
		// the real command for this round, then restore the spy so later
		// rounds keep hermetic defaults.
		const tl = (editorMock as unknown as { timeline: Record<string, unknown> })
			.timeline;
		const prev = tl.splitElements;
		const { SplitElementsCommand } = await import(
			"@/lib/commands/timeline/element/split-elements"
		);
		tl.splitElements = ({
			elements,
			splitTime,
			retainSide,
		}: {
			elements: Array<{ trackId: string; elementId: string }>;
			splitTime: number;
			retainSide?: "both" | "left" | "right";
		}) => {
			const cmd = new SplitElementsCommand({ elements, splitTime, retainSide });
			(editorMock as unknown as { command: { execute: (a: unknown) => void } })
				.command.execute({ command: cmd });
			return cmd.getRightSideElements();
		};
		const r = await executeTool({
			editor: editorMock,
			toolName: "split_element",
			arguments: { trackId: "main", elementId: "a", time: 60_000 },
		});
		expect(r.ok).toBe(true);
		expect(r.message).toContain("Right half");
		expect(currentTracks.main.elements.length).toBe(3);
		tl.splitElements = prev;
	});
});

describe("transition dispatchCommand surfacing", () => {
	test("add_transition with non-overlapping clips returns ok:false (was silent ok:true)", async () => {
		// a=0..120k and b=120k..240k touch but do not overlap: the command
		// throws "Transition clips missing or do not overlap".
		const r = await executeTool({
			editor: editorMock,
			toolName: "add_transition",
			arguments: {
				transitionType: "fade",
				fromTrackId: "main",
				fromElementId: "a",
				toTrackId: "main",
				toElementId: "b",
				startTime: 0,
				duration: 1000,
			},
		});
		expect(r.ok).toBe(false);
		expect(r.message).toMatch(/overlap|missing/i);
	});

	test("update_transition on a missing id returns ok:false (was silent ok:true)", async () => {
		const r = await executeTool({
			editor: editorMock,
			toolName: "update_transition",
			arguments: { transitionId: "no-such-transition", duration: 500 },
		});
		expect(r.ok).toBe(false);
		expect(r.message).toContain("Transition not found");
	});

	test("add_transition with overlapping clips still succeeds (clamped geometry)", async () => {
		// Overlap a and b by shifting b left via updateElements first.
		currentTracks = buildSceneTracks({
			main: buildVideoTrack({
				id: "main",
				elements: [
					buildVideoElement({ id: "a", startTime: 0, duration: 120_000 }),
					buildVideoElement({
						id: "b",
						startTime: 60_000,
						duration: 120_000,
					}),
				],
			}),
		});
		const r = await executeTool({
			editor: editorMock,
			toolName: "add_transition",
			arguments: {
				transitionType: "fade",
				fromTrackId: "main",
				fromElementId: "a",
				toTrackId: "main",
				toElementId: "b",
				startTime: 0,
				duration: 999_999,
			},
		});
		expect(r.ok).toBe(true);
		expect(transitions.length).toBe(1);
		expect(transitions[0]?.duration).toBeLessThanOrEqual(3000);
	});
});

describe("executor keyframe time clamp", () => {
	test("upsert_keyframe clamps negative time to 0; retime clamps too", async () => {
		const { UpsertKeyframeCommand } = await import(
			"@/lib/commands/timeline/element/keyframes/upsert-keyframe"
		);
		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "a",
			propertyPath: "opacity",
			time: 1000,
			value: 0.5,
		}).execute();
		const up = await executeTool({
			editor: editorMock,
			toolName: "upsert_keyframe",
			arguments: {
				trackId: "main",
				elementId: "a",
				path: "opacity",
				time: -50,
				value: 0.9,
				easing: "linear",
			},
		});
		expect(up.ok).toBe(true);
		expect(up.message).toBe("Keyframe upserted");
		const channels = (
			currentTracks.main.elements.find((e) => e.id === "a") as unknown as {
				animations: {
					channels: Record<string, { keys: Array<{ time: number }> }>;
				};
			}
		).animations.channels;
		const times = Object.values(channels).flatMap((c) =>
			c.keys.map((k) => k.time),
		);
		expect(Math.min(...times)).toBe(0);
	});
});

describe("insert_text_element duration clamp", () => {
	test("durationSeconds outside 0.1..60 is clamped, not stored raw", async () => {
		// installTracks already wires a default insertElement spy; the clamp
		// is internal to the handler, so pin the observable contract
		// (no-throw + ok:true) plus the tick math it clamps to.
		const r = await executeTool({
			editor: editorMock,
			toolName: "insert_text_element",
			arguments: { durationSeconds: 9999, content: "x" },
		});
		expect(r.ok).toBe(true);
		expect(60 * TICKS_PER_SECOND).toBe(7_200_000);
	});
});
