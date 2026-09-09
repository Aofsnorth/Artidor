import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type { SceneTracks, VideoElement } from "@/lib/timeline/types";

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
	UpsertKeyframeCommand,
	UpsertEffectParamKeyframeCommand,
	RetimeKeyframeCommand,
} = await import("../index");

afterAll(() => {
	mock.restore();
});

function installEditor(element: VideoElement) {
	currentTracks = {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: [element],
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
	return Object.values(element()?.animations?.channels ?? {}).flatMap(
		(channel) => channel?.keys ?? [],
	);
}

describe("keyframe upsert/retime regressions", () => {
	test("upsert at an existing time replaces the key, never duplicates", () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 2000,
			value: 0.2,
		}).execute();

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 2000,
			value: 0.8,
		}).execute();

		const keys = allKeys();
		expect(keys.filter((key) => key.time === 2000)).toHaveLength(1);
		expect(keys).toHaveLength(1);
	});

	test("upsert by id retimes and revalues the same key", () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 2000,
			value: 0.2,
		}).execute();
		const firstId = allKeys()[0]?.id as string;

		new UpsertKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			time: 4000,
			value: 0.6,
			keyframeId: firstId,
		}).execute();

		const keys = allKeys();
		expect(keys).toHaveLength(1);
		expect(keys[0]?.id).toBe(firstId);
		expect(keys[0]?.time).toBe(4000);
		expect(keys[0]?.value).toBe(0.6);
	});

	test("effect param keyframe upsert at the same time replaces, not duplicates", () => {
		installEditor(
			buildVideoElement({
				id: "clip",
				duration: 10_000,
				effects: [
					{
						id: "fx",
						type: "blur",
						enabled: true,
						params: { intensity: 1 },
					},
				],
			}),
		);

		const upsert = (value: number) =>
			new UpsertEffectParamKeyframeCommand({
					trackId: "main",
					elementId: "clip",
					effectId: "fx",
					paramKey: "intensity",
					time: 3000,
					value,
				}).execute();

		upsert(3);
		upsert(7);

		const keys = allKeys();
		expect(keys.filter((key) => key.time === 3000)).toHaveLength(1);
		expect(keys).toHaveLength(1);
	});

	test("retime to an occupied time does not create a duplicate key", () => {
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

		const firstId = allKeys()[0]?.id as string;
		new RetimeKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			propertyPath: "opacity",
			keyframeId: firstId,
			nextTime: 5000,
		}).execute();

		const keys = allKeys();
		expect(keys).toHaveLength(1);
		expect(keys[0]?.time).toBe(5000);
	});

	test("upsert with an unsupported path is a no-op on the element", () => {
		installEditor(buildVideoElement({ id: "clip", duration: 10_000 }));
		const before = currentTracks;

		new UpsertEffectParamKeyframeCommand({
			trackId: "main",
			elementId: "clip",
			effectId: "missing",
			paramKey: "intensity",
			time: 1000,
			value: 5,
		}).execute();

		expect(allKeys()).toHaveLength(0);
		expect(currentTracks.main.elements[0]).toEqual(before.main.elements[0]);
	});
});
