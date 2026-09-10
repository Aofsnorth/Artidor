/**
 * Preset + keybinding-store bughunt-2 regressions.
 *
 * - presetToClipboardItems drops items on unplaceable track types (a preset
 *   saved by an older build / hand-edited storage must not silently lose
 *   clips through an ok:true PasteCommand that skips the lane).
 * - Preset insert is a single PasteCommand (one undo step): pasting N items
 *   then undoing once restores the pre-paste tracks.
 * - keybindings importKeybindings rejects unknown actions (stale exports
 *   referencing renamed/removed actions must fail loudly, not plant dead
 *   bindings the shortcuts help skips silently).
 * - v5→v6 and v6→v7 migrations rewrite the renamed actions and compose.
 */
import { afterAll, describe, expect, mock, test } from "bun:test";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SceneTracks } from "@/lib/timeline/types";
import type { UserPreset } from "@/lib/presets/types";

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
	command: {
		execute: ({ command }: { command: { execute: () => unknown } }) =>
			command.execute(),
	},
	selection: {
		getSelectedElements: () => [],
		setSelectedElements: () => {},
	},
	playback: { getCurrentTime: () => 0 },
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { presetToClipboardItems } = await import("@/lib/presets/manager");
const { PasteCommand } = await import(
	"@/lib/commands/timeline/clipboard/paste"
);
const { runMigrations } = await import("@/stores/keybindings/migrations/index");
const { v5ToV6 } = await import("@/stores/keybindings/migrations/v5-to-v6");
const { v6ToV7 } = await import("@/stores/keybindings/migrations/v6-to-v7");

afterAll(() => {
	mock.restore();
});

function presetWithTrackTypes(trackTypes: string[]): UserPreset {
	return {
		id: "preset",
		name: "probe",
		kind: "group",
		thumbnail: null,
		duration: 1000,
		createdAt: 0,
		items: trackTypes.map((trackType, i) => ({
			trackType: trackType as never,
			sourceTrackKey: `src-${i}`,
			relativeStartTime: i * 100,
			element: {
				type: "video",
				name: `clip-${i}`,
				startTime: i * 100,
				duration: 1000,
				trimStart: 0,
				trimEnd: 0,
			} as never,
		})),
	};
}

describe("presetToClipboardItems filtering", () => {
	test("items on placeable lanes survive with relative offsets intact", () => {
		const items = presetToClipboardItems({
			preset: presetWithTrackTypes(["video", "text", "audio"]),
		});
		expect(items.length).toBe(3);
		expect(items.map((i) => i.element.startTime)).toEqual([0, 100, 200]);
		// Shared source lane stays shared: distinct synthetic ids per lane.
		expect(new Set(items.map((i) => i.trackId)).size).toBe(3);
	});

	test("items on an unknown lane are dropped so the caller can report honestly", () => {
		const items = presetToClipboardItems({
			preset: presetWithTrackTypes(["video", "hologram-lane", "text"]),
		});
		expect(items.length).toBe(2);
		expect(items.every((i) => i.trackType !== "hologram-lane")).toBe(true);
	});

	test("all-dropped preset yields [] (insert path must toast failure, not ok:true)", () => {
		const items = presetToClipboardItems({
			preset: presetWithTrackTypes(["hologram-lane"]),
		});
		expect(items).toEqual([]);
	});
});

describe("preset insert undo contract (single PasteCommand)", () => {
	test("one insert + one undo restores pre-paste tracks", () => {
		currentTracks = buildSceneTracks({
			main: buildVideoTrack({ id: "main", elements: [] }),
		});
		const before = currentTracks;
		const items = presetToClipboardItems({
			preset: presetWithTrackTypes(["video", "video"]),
		});
		expect(items.length).toBe(2);
		const cmd = new PasteCommand({ time: 0, clipboardItems: items });
		(
			editorMock as unknown as { command: { execute: (a: unknown) => void } }
		).command.execute({ command: cmd });
		const pastedCount = [
			...currentTracks.overlay,
			currentTracks.main,
			...currentTracks.overlayAfter,
			...currentTracks.audio,
		].reduce((n, t) => n + t.elements.length, 0);
		expect(pastedCount).toBe(2);
		cmd.undo();
		const afterUndo = [
			...currentTracks.overlay,
			currentTracks.main,
			...currentTracks.overlayAfter,
			...currentTracks.audio,
		].reduce((n, t) => n + t.elements.length, 0);
		expect(afterUndo).toBe(0);
		expect(currentTracks).toEqual(before);
	});

	test("multi-item preset keeps internal timing offsets after paste", () => {
		currentTracks = buildSceneTracks({
			main: buildVideoTrack({ id: "main", elements: [] }),
		});
		const items = presetToClipboardItems({
			preset: presetWithTrackTypes(["video", "video"]),
		});
		const cmd = new PasteCommand({ time: 5000, clipboardItems: items });
		(
			editorMock as unknown as { command: { execute: (a: unknown) => void } }
		).command.execute({ command: cmd });
		const starts = [
			...currentTracks.overlay,
			currentTracks.main,
			...currentTracks.overlayAfter,
			...currentTracks.audio,
		]
			.flatMap((t) => t.elements)
			.map((e) => e.startTime)
			.sort((a, b) => a - b);
		// Items carried relative offsets 0 and 100 → pasted 100 apart.
		expect(starts.length).toBe(2);
		expect(starts[1]! - starts[0]!).toBe(100);
	});
});

describe("presetToClipboardItems element fixtures", () => {
	test("grouped multi-item presets mint one fresh groupId per insertion", () => {
		const withGroup: UserPreset = {
			...presetWithTrackTypes(["video", "video"]),
			items: presetWithTrackTypes(["video", "video"]).items.map((item) => ({
				...item,
				element: { ...item.element, groupId: "old-group" } as never,
			})),
		};
		const first = presetToClipboardItems({ preset: withGroup });
		const second = presetToClipboardItems({ preset: withGroup });
		const g1 = (first[0]?.element as { groupId?: string }).groupId;
		const g2 = (second[0]?.element as { groupId?: string }).groupId;
		expect(g1).toBeDefined();
		expect(g2).toBeDefined();
		expect(g1).not.toBe("old-group");
		expect(g1).not.toBe(g2);
		// Both members of one insertion share the fresh tag.
		expect((first[1]?.element as { groupId?: string }).groupId).toBe(g1);
	});
});

describe("keybindings import validation", () => {
	test("importKeybindings throws on unknown actions (stale export)", async () => {
		const { useKeybindingsStore } = await import("@/stores/keybindings-store");
		const before = useKeybindingsStore.getState().keybindings;
		expect(() =>
			useKeybindingsStore.getState().importKeybindings({
				// split-element was renamed to split in v7; an old export
				// carrying it must be rejected, not installed silently.
				s: "split-element",
			} as never),
		).toThrow(/Unknown action/);
		// Failed import leaves the live map untouched.
		expect(useKeybindingsStore.getState().keybindings).toBe(before);
	});

	test("importKeybindings still accepts known actions", async () => {
		const { useKeybindingsStore } = await import("@/stores/keybindings-store");
		const snapshot = { ...useKeybindingsStore.getState().keybindings };
		useKeybindingsStore.getState().importKeybindings({ s: "split" } as never);
		expect(useKeybindingsStore.getState().keybindings["s" as never]).toBe(
			"split",
		);
		useKeybindingsStore.getState().importKeybindings(snapshot);
	});
});

describe("keybindings migrations v5→v6→v7", () => {
	test("v5ToV6 renames escape deselect-all → cancel-interaction", () => {
		const out = v5ToV6({
			state: {
				keybindings: { escape: "deselect-all", s: "split" },
				isCustomized: true,
			},
		}) as { keybindings: Record<string, string> };
		expect(out.keybindings["escape"]).toBe("cancel-interaction");
		expect(out.keybindings["s"]).toBe("split");
	});

	test("v6ToV7 renames split-element → split", () => {
		const out = v6ToV7({
			state: {
				keybindings: { s: "split-element" },
				isCustomized: true,
			},
		}) as { keybindings: Record<string, string> };
		expect(out.keybindings["s"]).toBe("split");
	});

	test("runMigrations composes v5→v7 across both renames", () => {
		const out = runMigrations({
			state: {
				keybindings: { escape: "deselect-all", s: "split-element" },
				isCustomized: false,
			},
			fromVersion: 5,
		}) as { keybindings: Record<string, string> };
		expect(out.keybindings["escape"]).toBe("cancel-interaction");
		expect(out.keybindings["s"]).toBe("split");
	});
});

describe("video fixture sanity", () => {
	test("factory clip exposes the ids/timing the preset tests assume", () => {
		const el = buildVideoElement({ id: "probe", startTime: 10, duration: 50 });
		expect(el.id).toBe("probe");
		expect(el.startTime).toBe(10);
		expect(el.duration).toBe(50);
	});
});
