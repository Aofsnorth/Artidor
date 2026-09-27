/**
 * Regression: the Image Adjust sliders snapped back to neutral the moment the
 * scrub ended.
 *
 * The symptom is that the controlled value in the inspector is derived from
 * `element.effects`, so if the write that `onScrub` performs does not survive
 * the command pipeline, the field shows the live scrub preview while dragging
 * and then falls back to the (unchanged) neutral position on release.
 *
 * This drives the REAL `UpdateElementsCommand` against the REAL
 * `applyElementUpdate` pipeline, because the bug is exactly the kind that only
 * shows up between "patch built" and "patch stored".
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";
import type { SceneTracks, Transition } from "@/lib/timeline/types";
import type { Effect } from "@/lib/effects/types";
import {
	buildDefaultEffectInstance,
	registerDefaultEffects,
} from "@/lib/effects";
import {
	BASIC_ADJUST_CONTROLS,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "@/lib/effects/basic-adjust";

// The registry is populated by EditorCore at init, not by import side effect.
// This test replaces EditorCore with a mock, so populate it here instead.
registerDefaultEffects();

let currentTracks: SceneTracks;
const transitions: Transition[] = [];

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
	selection: { getSelectedElements: () => [] },
	command: {
		execute: ({ command }: { command: { execute: () => unknown } }) =>
			command.execute(),
	},
	project: {
		getActive: () => null,
		getActiveOrNull: () => null,
		setActiveProject: () => {},
	},
};

/**
 * Byte-for-byte the write `BasicAdjustTab.setSliderValue` performs. Kept as a
 * local copy on purpose: the point of the test is to pin the behaviour of the
 * sequence the tab runs today, so a refactor cannot quietly make it pass.
 */
function setSliderValue({
	element,
	trackId,
	effectType,
	sliderValue,
	sliderMin,
	sliderMax,
}: {
	element: { id: string; effects?: Effect[] };
	trackId: string;
	effectType: string;
	sliderValue: number;
	sliderMin: number;
	sliderMax: number;
}): void {
	const { UpdateElementsCommand } =
		require("@/lib/commands/timeline/element/update-elements") as {
			UpdateElementsCommand: new (input: {
				updates: Array<{
					trackId: string;
					elementId: string;
					patch: Record<string, unknown>;
				}>;
			}) => { execute: () => unknown };
		};

	const effects = element.effects ?? [];
	const existingIndex = effects.findIndex((e) => e.type === effectType);
	const amount = resolveBasicAdjustAmount({
		effectType,
		sliderValue,
		sliderMin,
		sliderMax,
	});

	if (amount === null) {
		if (existingIndex === -1) return;
		const nextEffects = [...effects];
		nextEffects.splice(existingIndex, 1);
		new UpdateElementsCommand({
			updates: [
				{ trackId, elementId: element.id, patch: { effects: nextEffects } },
			],
		}).execute();
		return;
	}

	const nextEffects =
		existingIndex === -1
			? [
					...effects,
					{
						...buildDefaultEffectInstance({ effectType }),
						params: { amount },
					},
				]
			: effects.map((effect, index) =>
					index === existingIndex
						? { ...effect, params: { ...effect.params, amount } }
						: effect,
				);

	new UpdateElementsCommand({
		updates: [
			{ trackId, elementId: element.id, patch: { effects: nextEffects } },
		],
	}).execute();
}

function readEffects(elementId: string): Effect[] {
	const track = currentTracks.main;
	const el = track.elements.find((e) => e.id === elementId) as unknown as {
		effects?: Effect[];
	};
	return el.effects ?? [];
}

beforeEach(() => {
	mock.module("@/core", () => ({
		EditorCore: { getInstance: () => editorMock },
	}));
	currentTracks = buildSceneTracks({
		main: buildVideoTrack({
			id: "main",
			elements: [buildVideoElement({ id: "img-1", startTime: 0 })],
		}),
	});
});

describe("basic adjust slider round-trip", () => {
	test("a scrubbed value survives the command pipeline", () => {
		const exposure = BASIC_ADJUST_CONTROLS.find((c) => c.label === "Exposure");
		if (!exposure) throw new Error("Exposure control missing");

		setSliderValue({
			element: { id: "img-1" },
			trackId: "main",
			effectType: exposure.effectType,
			sliderValue: 60,
			sliderMin: exposure.sliderMin,
			sliderMax: exposure.sliderMax,
		});

		const stored = readEffects("img-1");
		expect(stored.length).toBe(1);
		expect(stored[0]?.type).toBe(exposure.effectType);

		// The whole point: what the inspector reads back must be what was set.
		const amount = stored[0]?.params?.amount as number;
		const sliderValue = resolveBasicAdjustSliderValue({
			effectType: exposure.effectType,
			amount,
			sliderMin: exposure.sliderMin,
			sliderMax: exposure.sliderMax,
		});
		expect(Math.round(sliderValue)).toBe(60);
	});

	test("every control round-trips its slider position", () => {
		for (const control of BASIC_ADJUST_CONTROLS) {
			currentTracks = buildSceneTracks({
				main: buildVideoTrack({
					id: "main",
					elements: [buildVideoElement({ id: "img-1", startTime: 0 })],
				}),
			});

			const target = Math.round((control.sliderMin + control.sliderMax) / 2);
			setSliderValue({
				element: { id: "img-1" },
				trackId: "main",
				effectType: control.effectType,
				sliderValue: target,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});

			const stored = readEffects("img-1");
			const amount = stored[0]?.params?.amount as number | undefined;
			const back = resolveBasicAdjustSliderValue({
				effectType: control.effectType,
				amount,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});
			expect({ label: control.label, back: Math.round(back) }).toEqual({
				label: control.label,
				back: target,
			});
		}
	});
});
