import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SceneTracks, VisualElement } from "@/lib/timeline/types";

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

const { registerDefaultEffects } = await import("@/lib/effects");
registerDefaultEffects();

const {
	AddClipEffectCommand,
	ReorderClipEffectsCommand,
	UpdateClipEffectParamsCommand,
} = await import("../index");

afterAll(() => {
	mock.restore();
});

function installEditor(elements: VisualElement[]) {
	currentTracks = {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements,
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	} as SceneTracks;
}

function visualElement(id = "clip"): VisualElement {
	return buildVideoElement({ id, duration: 10_000 }) as VisualElement;
}

function effectsOf(elementId: string) {
	const element = [...currentTracks.overlay, currentTracks.main]
		.flatMap((track) => track.elements)
		.find((candidate) => candidate.id === elementId) as VisualElement;
	return element?.effects ?? [];
}

describe("effect stack regressions", () => {
	test("added default effect params are private to each clip", () => {
		installEditor([visualElement("a"), visualElement("b")]);

		new AddClipEffectCommand({
			trackId: "main",
			elementId: "a",
			effectType: "blur",
		}).execute();
		new AddClipEffectCommand({
			trackId: "main",
			elementId: "b",
			effectType: "blur",
		}).execute();

		const effectA = effectsOf("a")[0];
		const effectB = effectsOf("b")[0];
		expect(effectA).toBeDefined();
		expect(effectB).toBeDefined();
		// Distinct instances: mutating one clip's params must not affect the other.
		const amountKey = Object.keys(effectA.params)[0] as string;
		effectA.params[amountKey] = 123;
		expect(effectB.params[amountKey]).not.toBe(123);
	});

	test("reorder with out-of-range indices is a no-op (no undefined entries)", () => {
		installEditor([visualElement()]);

		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		}).execute();
		const before = currentTracks;

		new ReorderClipEffectsCommand({
			trackId: "main",
			elementId: "clip",
			fromIndex: 5,
			toIndex: 0,
		}).execute();

		const effects = effectsOf("clip");
		expect(effects).toHaveLength(1);
		expect(effects.every((effect) => effect != null)).toBe(true);
		expect(currentTracks.main.elements[0]).toEqual(before.main.elements[0]);
	});

	test("reorder with negative indices is a no-op", () => {
		installEditor([visualElement()]);

		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		}).execute();

		new ReorderClipEffectsCommand({
			trackId: "main",
			elementId: "clip",
			fromIndex: -1,
			toIndex: 0,
		}).execute();

		const effects = effectsOf("clip");
		expect(effects).toHaveLength(1);
		expect(effects.every((effect) => effect != null)).toBe(true);
	});

	test("reorder to the same index is a no-op", () => {
		installEditor([visualElement()]);

		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		}).execute();
		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "brightness",
		}).execute();
		const before = currentTracks;

		new ReorderClipEffectsCommand({
			trackId: "main",
			elementId: "clip",
			fromIndex: 1,
			toIndex: 1,
		}).execute();

		expect(currentTracks.main.elements[0]).toEqual(before.main.elements[0]);
	});

	test("valid reorder still moves the effect", () => {
		installEditor([visualElement()]);

		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		}).execute();
		new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "brightness",
		}).execute();

		const firstId = effectsOf("clip")[0]?.id;

		new ReorderClipEffectsCommand({
			trackId: "main",
			elementId: "clip",
			fromIndex: 0,
			toIndex: 1,
		}).execute();

		const after = effectsOf("clip");
		expect(after[1]?.id).toBe(firstId);
		expect(after).toHaveLength(2);
	});

	test("add effect undo/redo keeps the effect id stable", () => {
		installEditor([visualElement()]);

		const command = new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		});
		command.execute();
		const effectId = command.getEffectId();
		expect(effectId).toBeTruthy();

		command.undo();
		expect(effectsOf("clip")).toHaveLength(0);

		command.redo();
		const effects = effectsOf("clip");
		expect(effects).toHaveLength(1);
		expect(effects[0]?.id).toBe(effectId);
	});

	test("update effect params clamps to the effect definition (min/max/step)", () => {
		installEditor([visualElement()]);

		const add = new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur", // intensity: min 0, max 100, step 1, default 15
		});
		add.execute();
		const effectId = add.getEffectId() as string;

		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId,
			params: { intensity: 9999 },
		}).execute();
		expect(effectsOf("clip")[0]?.params.intensity).toBe(100); // clamped to max

		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId,
			params: { intensity: -50 },
		}).execute();
		expect(effectsOf("clip")[0]?.params.intensity).toBe(0); // clamped to min

		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId,
			params: { intensity: 15.6 },
		}).execute();
		expect(effectsOf("clip")[0]?.params.intensity).toBe(16); // snapped to step 1
	});

	test("update effect params rejects values of the wrong type instead of storing them", () => {
		installEditor([visualElement()]);

		const add = new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		});
		add.execute();
		const effectId = add.getEffectId() as string;
		const before = effectsOf("clip")[0]?.params.intensity;

		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId,
			params: { intensity: "lots" },
		}).execute();
		// The string is dropped, not stored — the renderer only reads numbers.
		expect(effectsOf("clip")[0]?.params.intensity).toBe(before);
	});

	test("update effect params leaves unknown keys and unknown effect types untouched", () => {
		installEditor([visualElement()]);

		const add = new AddClipEffectCommand({
			trackId: "main",
			elementId: "clip",
			effectType: "blur",
		});
		add.execute();
		const effectId = add.getEffectId() as string;

		// Unknown param key (no definition) passes through verbatim.
		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId,
			params: { customKey: 7 },
		}).execute();
		expect(effectsOf("clip")[0]?.params.customKey).toBe(7);

		// Unknown effect type: nothing to clamp against, params applied as-is.
		const custom = {
			id: "custom-effect",
			type: "no-such-effect-type",
			enabled: true,
			params: { anything: 123 },
		};
		const element = currentTracks.main.elements.find(
			(candidate) => candidate.id === "clip",
		) as VisualElement;
		element.effects = [custom];

		new UpdateClipEffectParamsCommand({
			trackId: "main",
			elementId: "clip",
			effectId: "custom-effect",
			params: { anything: 1e9 },
		}).execute();
		expect(effectsOf("clip")[0]?.params.anything).toBe(1e9);
	});
});
