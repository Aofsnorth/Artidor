/**
 * PasteStyleCommand regressions: animation adaptation across element types.
 *
 * A copied style must not plant dead animation bindings on a target that
 * can't resolve them, and keys copied from a longer source must clamp to
 * the target's duration.
 */

import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import type { EditorCore } from "@/core";
import type {
	AudioElement,
	SceneTracks,
	VisualElement,
} from "@/lib/timeline/types";
import type { ElementStyle } from "@/lib/clipboard/types";
import { upsertPathKeyframe } from "@/lib/animation";

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

const { PasteStyleCommand } = await import("../paste-style");

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
	} as unknown as SceneTracks;
}

/** Build an opacity animation with keys at the given times. */
function buildOpacityAnimations(times: number[]) {
	let animations = upsertPathKeyframe({
		animations: undefined,
		propertyPath: "opacity",
		time: 0,
		value: 1,
		kind: "number",
		defaultInterpolation: "linear",
		coerceValue: ({ value }) => value,
	});
	for (const time of times) {
		animations = upsertPathKeyframe({
			animations,
			propertyPath: "opacity",
			time,
			value: 0.2,
			kind: "number",
			defaultInterpolation: "linear",
			coerceValue: ({ value }) => value,
		});
	}
	return animations ?? undefined;
}

function elementAnimationsOf(
	elementId: string,
): NonNullable<ElementStyle["animations"]> | undefined {
	const element = allElements().find(
		(candidate) => candidate.id === elementId,
	) as VisualElement | undefined;
	return element?.animations;
}

function allElements(): VisualElement[] {
	return [
		...currentTracks.overlay,
		currentTracks.main,
		...currentTracks.overlayAfter,
	].flatMap((track) => track.elements as VisualElement[]);
}

describe("PasteStyleCommand animation adaptation", () => {
	test("bindings that don't resolve on the target type are dropped (text → audio)", () => {
		const audio = {
			id: "audio-1",
			type: "audio",
			name: "Audio",
			startTime: 0,
			duration: 10_000,
			trimStart: 0,
			trimEnd: 0,
			sourceType: "upload",
			mediaId: "media",
		} as unknown as AudioElement;
		installEditor([audio as unknown as VisualElement]);

		// Style copied from a text element: transform.positionX resolves on
		// text/visual elements but NOT on audio, and opacity does NOT exist
		// on audio elements either (audio has volume/pan).
		const style: ElementStyle = {
			animations: buildOpacityAnimations([1000, 2000]),
		};

		new PasteStyleCommand({
			targets: [{ trackId: "main", elementId: "audio-1" }],
			style,
		}).execute();

		const targetAnimations = elementAnimationsOf("audio-1");
		// No binding survived: audio cannot resolve opacity or transform paths.
		expect(Object.keys(targetAnimations?.bindings ?? {}).length).toBe(0);
	});

	test("bindings that DO resolve on the target survive with fresh keyframe ids", () => {
		const video = buildVideoElement({ id: "video-1", duration: 10_000 });
		installEditor([video as unknown as VisualElement]);

		const sourceAnimations = buildOpacityAnimations([1000, 2000]);
		const source = buildVideoElement({
			id: "src",
			duration: 10_000,
			animations: sourceAnimations,
		});
		const style: ElementStyle = { animations: source.animations };

		new PasteStyleCommand({
			targets: [{ trackId: "main", elementId: "video-1" }],
			style,
		}).execute();

		const pasted = elementAnimationsOf("video-1");
		expect(pasted?.bindings.opacity).toBeDefined();

		const binding = pasted?.bindings.opacity;
		const channels =
			binding?.components
				.map((component) => pasted?.channels[component.channelId])
				.filter((channel) => channel !== undefined) ?? [];
		const keyTimes = channels.flatMap((channel) =>
			channel.keys.map((key) => key.time),
		);
		expect(keyTimes).toContain(1000);
		expect(keyTimes).toContain(2000);
		// Keyframe ids are fresh — never shared with the source clip.
		if (!sourceAnimations) {
			throw new Error("test fixture: source animations missing");
		}
		const sourceTimes = sourceAnimations.channels;
		const sourceIds = new Set(
			Object.values(sourceTimes).flatMap(
				(channel) => channel?.keys.map((key) => key.id) ?? [],
			),
		);
		const pastedIds = channels.flatMap((channel) =>
			channel.keys.map((key) => key.id),
		);
		for (const id of pastedIds) {
			expect(sourceIds.has(id)).toBe(false);
		}
	});

	test("keys from a longer source clamp to the shorter target's duration", () => {
		const longSource = buildVideoElement({
			id: "src",
			duration: 100_000,
			animations: buildOpacityAnimations([1000, 50_000, 90_000]),
		});
		const shortTarget = buildVideoElement({
			id: "short",
			duration: 10_000,
		});
		installEditor([shortTarget as unknown as VisualElement]);

		new PasteStyleCommand({
			targets: [{ trackId: "main", elementId: "short" }],
			style: { animations: longSource.animations },
		}).execute();

		const pasted = elementAnimationsOf("short");
		const binding = pasted?.bindings.opacity;
		const keyTimes =
			binding?.components
				.map((component) => pasted?.channels[component.channelId]?.keys)
				.flatMap((keys) => keys?.map((key) => key.time) ?? []) ?? [];
		// The 1000-tick key survives; everything beyond duration 10000 is gone.
		expect(keyTimes).toContain(1000);
		for (const time of keyTimes) {
			expect(time).toBeLessThanOrEqual(10_000);
		}
		expect(keyTimes).not.toContain(50_000);
		expect(keyTimes).not.toContain(90_000);
	});

	test("style with no animations leaves the target untouched", () => {
		const target = buildVideoElement({
			id: "video-1",
			duration: 10_000,
			animations: buildOpacityAnimations([500]),
		});
		installEditor([target as unknown as VisualElement]);
		const before = elementAnimationsOf("video-1");

		new PasteStyleCommand({
			targets: [{ trackId: "main", elementId: "video-1" }],
			style: { opacity: 0.5 },
		}).execute();

		const after = elementAnimationsOf("video-1");
		expect(after).toBe(before);
	});
});
