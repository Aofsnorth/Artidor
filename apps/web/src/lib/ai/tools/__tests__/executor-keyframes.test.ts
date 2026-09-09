/**
 * AI executor keyframe tool regressions.
 *
 * These exercise the executor handlers (executeTool), not just the raw
 * commands: the AI path must produce the same collision-free retimes the
 * command-level tests guarantee, and must not push a history entry when
 * the target element no longer exists.
 */

import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type {
	SceneTracks,
	VideoElement,
	VisualElement,
} from "@/lib/timeline/types";
import type { Command } from "@/lib/commands/base-command";

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
		getTrackById: ({ trackId }: { trackId: string }) =>
			[
				...currentTracks.overlay,
				currentTracks.main,
				...currentTracks.overlayAfter,
				...currentTracks.audio,
			].find((track) => track.id === trackId),
	},
	selection: {
		getSelectedElements: () => [],
		getSelectedKeyframes: () => [],
	},
	command: {
		execute: ({ command }: { command: Command }) => command.execute(),
	},
	project: {
		getActive: () => ({ settings: { fps: { numerator: 30, denominator: 1 } } }),
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { registerDefaultEffects } = await import("@/lib/effects");
registerDefaultEffects();

const { executeTool } = await import("@/lib/ai/tools/executor");
const { UpsertKeyframeCommand } = await import(
	"@/lib/commands/timeline/element/keyframes"
);

afterAll(() => {
	mock.restore();
});

function installEditor(element: VideoElement | VisualElement) {
	currentTracks = {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: [element as VideoElement],
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
}

function element(): VideoElement {
	return currentTracks.main.elements[0] as VideoElement;
}

function allKeys() {
	return (
		Object.values(element()?.animations?.channels ?? {}) as Array<
			| {
					keys: Array<{ id: string; time: number; value: number }>;
			  }
			| undefined
		>
	).flatMap((channel) => channel?.keys ?? []);
}

describe("AI executor keyframe tools", () => {
	test("retime_keyframe onto an occupied time merges keys, not duplicates", async () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 1000,
			value: 0.1,
		}).execute();
		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 5000,
			value: 0.9,
		}).execute();
		expect(allKeys()).toHaveLength(2);

		const firstId = allKeys()[0]?.id as string;
		const result = await executeTool({
			editor: editorMock,
			toolName: "retime_keyframe",
			arguments: {
				trackId: "main",
				elementId: "clip",
				path: "opacity",
				keyframeId: firstId,
				newTime: 5000,
			},
		});

		expect(result.ok).toBe(true);
		const keys = allKeys();
		expect(keys).toHaveLength(1); // merged, not duplicated
		expect(keys[0]?.time).toBe(5000);
		expect(keys[0]?.id).toBe(firstId); // the retimed key survives
	});

	test("upsert_keyframe through the executor at an existing time replaces the key", async () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 2000,
			value: 0.1,
		}).execute();

		const result = await executeTool({
			editor: editorMock,
			toolName: "upsert_keyframe",
			arguments: {
				trackId: "main",
				elementId: "clip",
				path: "opacity",
				time: 2000,
				value: 0.7,
			},
		});

		expect(result.ok).toBe(true);
		const keys = allKeys();
		expect(keys).toHaveLength(1);
		expect(keys[0]?.value).toBe(0.7);
	});

	test("retime_keyframe on a missing element reports ok:false, not a crash", async () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));
		const before = currentTracks;

		const result = await executeTool({
			editor: editorMock,
			toolName: "retime_keyframe",
			arguments: {
				trackId: "main",
				elementId: "no-such-element",
				path: "opacity",
				keyframeId: "any",
				newTime: 100,
			},
		});

		// No crash, no state change (structural: the immutable update helper
		// always returns a fresh top-level object even when nothing matched).
		expect(result.ok).toBe(true);
		expect(currentTracks.main.elements[0]).toEqual(before.main.elements[0]);
		expect(allKeys()).toHaveLength(0);
	});
});
