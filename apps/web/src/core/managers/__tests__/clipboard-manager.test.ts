import { describe, expect, test } from "bun:test";
import { ClipboardManager } from "@/core/managers/clipboard-manager";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SceneTracks, VisualElement } from "@/lib/timeline/types";
import type { Command } from "@/lib/commands/base-command";

/**
 * ClipboardManager regression tests: deep-copy isolation for the style and
 * effect clipboard slots. A minimal EditorCore stand-in is injected; the
 * manager under test is the real production class.
 */

function buildEditor(
	selectedElements: { trackId: string; elementId: string }[],
): {
	editor: EditorCore;
	getTracks: () => SceneTracks;
	executed: Command[];
	/** Push a clip so copy() has something to snapshot. */
	addClip: (element: VisualElement) => void;
} {
	const tracks: SceneTracks = {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: [],
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
	const state = { tracks };
	const executed: Command[] = [];
	const editor = {
		scenes: {
			getActiveScene: () => ({ id: "scene", tracks: state.tracks }),
			getActiveSceneOrNull: () => ({ id: "scene", tracks: state.tracks }),
		},
		timeline: {
			updateTracks: (next: SceneTracks) => {
				state.tracks = next;
			},
			getElementsWithTracks: ({
				elements,
			}: {
				elements: { trackId: string; elementId: string }[];
			}) =>
				elements.flatMap((ref) => {
					const track = [
						...state.tracks.overlay,
						state.tracks.main,
						...state.tracks.overlayAfter,
						...state.tracks.audio,
					].find((candidate) => candidate.id === ref.trackId);
					const element = track?.elements.find(
						(candidate) => candidate.id === ref.elementId,
					);
					return track && element ? [{ track, element }] : [];
				}),
		},
		selection: {
			getSelectedElements: () => selectedElements,
			getSelectedKeyframes: () => [],
		},
		command: {
			execute: ({ command }: { command: Command }) => {
				executed.push(command);
				command.execute();
			},
		},
		playback: {
			getCurrentTime: () => 0,
		},
	} as unknown as EditorCore;
	return {
		editor,
		getTracks: () => state.tracks,
		executed,
		addClip: (element: VisualElement) => {
			state.tracks.main.elements.push(element as never);
		},
	};
}

function withClip(tracks: SceneTracks, element: VisualElement): SceneTracks {
	return {
		...tracks,
		main: { ...tracks.main, elements: [element] } as SceneTracks["main"],
	};
}

describe("ClipboardManager regressions", () => {
	test("failed copy clears the previous clipboard instead of serving it stale", () => {
		// 1. Seed a manager with a valid elements copy.
		const seeded = buildEditor([{ trackId: "main", elementId: "clip" }]);
		seeded.addClip(
			buildVideoElement({ id: "clip" }) as unknown as VisualElement,
		);
		const seededManager = new ClipboardManager(seeded.editor);
		expect(seededManager.copy()).toBe(true);
		expect(seededManager.hasEntry()).toBe(true);

		// 2. A copy with an empty selection fails and must clear the entry,
		// so paste can't silently serve the previous copy.
		const { editor } = buildEditor([]);
		const manager = new ClipboardManager(editor);
		// Transfer the seeded entry to prove the SAME manager clears it.
		(manager as unknown as { entry: unknown }).entry = seededManager.getEntry();
		expect(manager.copy()).toBe(false);
		expect(manager.hasEntry()).toBe(false);
		expect(manager.getEntry()).toBeNull();
	});

	test("copied effect params are isolated from the source effect", () => {
		const source = {
			id: "clip",
			type: "video",
			effects: [
				{ id: "e1", type: "blur", enabled: true, params: { blurAmount: 5 } },
			],
		} as unknown as VisualElement;
		const { editor, addClip } = buildEditor([
			{ trackId: "main", elementId: "clip" },
		]);
		addClip(source);

		const manager = new ClipboardManager(editor);
		expect(
			manager.copyEffect({
				type: "blur",
				params: { blurAmount: 5 },
				enabled: true,
			}),
		).toBe(true);

		// Mutate the live source after copying.
		(
			source.effects as unknown as { params: { blurAmount: number } }[]
		)[0].params.blurAmount = 99;
		expect(manager.getEffectEntry()?.params.blurAmount).toBe(5);
	});

	test("copied style effects are isolated from the live element", () => {
		const source = buildVideoElement({
			id: "clip",
			effects: [
				{ id: "e1", type: "blur", enabled: true, params: { blurAmount: 5 } },
			],
		}) as unknown as VisualElement;
		const { editor, getTracks } = buildEditor([
			{ trackId: "main", elementId: "clip" },
		]);
		const tracks = withClip(getTracks(), source);
		getTracks().main = tracks.main;

		const manager = new ClipboardManager(editor);
		expect(manager.copyStyle()).toBe(true);

		const liveBefore = getTracks().main.elements[0] as unknown as {
			effects: { params: { blurAmount: number } }[];
		};
		liveBefore.effects[0].params.blurAmount = 42;

		expect(manager.getStyleEntry()?.style.effects?.[0]?.params.blurAmount).toBe(
			5,
		);
	});

	test("copied style masks are isolated from the live element", () => {
		const source = buildVideoElement({
			id: "clip",
			masks: [
				{
					id: "m1",
					type: "rectangle",
					params: {
						feather: 0,
						inverted: false,
						strokeColor: "#ffffff",
						strokeWidth: 0,
						strokeAlign: "center",
						centerX: 1,
						centerY: 1,
						width: 10,
						height: 10,
						rotation: 0,
						scale: 1,
					},
				},
			],
		}) as unknown as VisualElement;
		const { editor, getTracks } = buildEditor([
			{ trackId: "main", elementId: "clip" },
		]);
		const tracks = withClip(getTracks(), source);
		getTracks().main = tracks.main;

		const manager = new ClipboardManager(editor);
		expect(manager.copyStyle()).toBe(true);

		const live = source as unknown as {
			masks: { params: { centerX: number } }[];
		};
		live.masks[0].params.centerX = 77;

		expect(manager.getStyleEntry()?.style.masks?.[0]?.params?.centerX).toBe(1);
	});

	test("copy with no selection returns false and stores nothing", () => {
		const { editor } = buildEditor([]);
		const manager = new ClipboardManager(editor);

		expect(manager.copyStyle()).toBe(false);
		expect(manager.getStyleEntry()).toBeNull();
	});
});
