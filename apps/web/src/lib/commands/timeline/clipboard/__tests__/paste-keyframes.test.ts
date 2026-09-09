import { afterAll, describe, expect, mock, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import { upsertPathKeyframe } from "@/lib/animation";
import type { EditorCore } from "@/core";
import type { KeyframeClipboardItem } from "@/lib/clipboard/types";
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

const { PasteKeyframesCommand } = await import("../paste-keyframes");
const { getKeyframeAtTime } = await import("@/lib/animation");

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

function elementById(id: string): VideoElement | undefined {
	return currentTracks.main.elements.find((candidate) => candidate.id === id) as
		| VideoElement
		| undefined;
}

function keyframeItem(
	propertyPath: KeyframeClipboardItem["propertyPath"],
	timeOffset: number,
	value: number,
): KeyframeClipboardItem {
	return {
		propertyPath,
		timeOffset,
		value,
		interpolation: "linear",
		curvePatches: [],
	};
}

describe("PasteKeyframesCommand regressions", () => {
	test("pasted keys land at the given clip-local time", () => {
		installEditor(
			buildVideoElement({ id: "clip", startTime: 0, duration: 10_000 }),
		);

		new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 4000,
			clipboardItems: [keyframeItem("opacity", 0, 0.5)],
		}).execute();

		const pasted = getKeyframeAtTime({
			animations: element().animations,
			propertyPath: "opacity",
			time: 4000,
		});
		expect(pasted?.value).toBe(0.5);
	});

	test("keyframe times beyond the clip duration are omitted, not clamped", () => {
		installEditor(
			buildVideoElement({ id: "clip", startTime: 0, duration: 10_000 }),
		);

		new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 9000,
			clipboardItems: [
				keyframeItem("opacity", 0, 0.1),
				keyframeItem("opacity", 3000, 0.9),
			],
		}).execute();

		const animations = element().animations;
		expect(
			getKeyframeAtTime({
				animations,
				propertyPath: "opacity",
				time: 9000,
			})?.value,
		).toBe(0.1);
		// The 12000-tick key must not be clamped onto the 10000-tick boundary.
		expect(
			getKeyframeAtTime({
				animations,
				propertyPath: "opacity",
				time: 10_000,
			}),
		).toBeNull();
	});

	test("relative spacing between copied keyframes is preserved", () => {
		installEditor(
			buildVideoElement({ id: "clip", startTime: 0, duration: 100_000 }),
		);

		new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 10_000,
			clipboardItems: [
				keyframeItem("opacity", 0, 0.2),
				keyframeItem("opacity", 5000, 0.5),
				keyframeItem("opacity", 9000, 0.9),
			],
		}).execute();

		const animations = element().animations;
		expect(
			getKeyframeAtTime({ animations, propertyPath: "opacity", time: 10_000 })
				?.value,
		).toBe(0.2);
		expect(
			getKeyframeAtTime({ animations, propertyPath: "opacity", time: 15_000 })
				?.value,
		).toBe(0.5);
		expect(
			getKeyframeAtTime({ animations, propertyPath: "opacity", time: 19_000 })
				?.value,
		).toBe(0.9);
	});

	test("negative keyframe times are omitted", () => {
		installEditor(
			buildVideoElement({ id: "clip", startTime: 0, duration: 10_000 }),
		);

		new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 1000,
			clipboardItems: [
				keyframeItem("opacity", -5000, 0.4),
				keyframeItem("opacity", 0, 0.6),
			],
		}).execute();

		const animations = element().animations;
		expect(
			getKeyframeAtTime({ animations, propertyPath: "opacity", time: 1000 })
				?.value,
		).toBe(0.6);
		expect(
			getKeyframeAtTime({ animations, propertyPath: "opacity", time: 0 }),
		).toBeNull();
	});

	test("existing keyframe at the same time is replaced, not duplicated", () => {
		installEditor(
			buildVideoElement({
				id: "clip",
				startTime: 0,
				duration: 10_000,
				animations: upsertPathKeyframe({
					animations: undefined,
					propertyPath: "opacity",
					time: 2000,
					value: 0.1,
					kind: "number",
					defaultInterpolation: "linear",
					coerceValue: ({ value }) => value,
				}),
			}),
		);

		new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 2000,
			clipboardItems: [keyframeItem("opacity", 0, 0.7)],
		}).execute();

		const keyframes = (
			Object.values(element().animations?.channels ?? {}) as Array<
				| {
						keys: Array<{ id: string }>;
				  }
				| undefined
			>
		).flatMap((channel) => channel?.keys ?? []);
		expect(keyframes).toHaveLength(1);
		expect(
			getKeyframeAtTime({
				animations: element().animations,
				propertyPath: "opacity",
				time: 2000,
			})?.value,
		).toBe(0.7);
	});

	test("undo restores the pre-paste element and redo replays identical keyframes", () => {
		installEditor(
			buildVideoElement({ id: "clip", startTime: 0, duration: 100_000 }),
		);
		const before = currentTracks;

		const command = new PasteKeyframesCommand({
			targets: [{ trackId: "main", elementId: "clip" }],
			time: 5000,
			clipboardItems: [keyframeItem("opacity", 0, 0.3)],
		});
		command.execute();
		const pastedId = getKeyframeAtTime({
			animations: element().animations,
			propertyPath: "opacity",
			time: 5000,
		})?.id;

		command.undo();
		expect(currentTracks).toBe(before);
		expect(element().animations?.bindings.opacity).toBeUndefined();

		command.redo();
		const redoneId = getKeyframeAtTime({
			animations: element().animations,
			propertyPath: "opacity",
			time: 5000,
		})?.id;
		expect(redoneId).toBe(pastedId);
	});

	test("multi-target paste applies keys to every selected element in one command", () => {
		installEditor(
			buildVideoElement({ id: "clip-a", startTime: 0, duration: 100_000 }),
		);
		// Add a second clip onto the main track for a real multi-target paste.
		currentTracks.main.elements.push(
			buildVideoElement({ id: "clip-b", startTime: 0, duration: 100_000 }),
		);

		const command = new PasteKeyframesCommand({
			targets: [
				{ trackId: "main", elementId: "clip-a" },
				{ trackId: "main", elementId: "clip-b" },
			],
			time: 5000,
			clipboardItems: [
				keyframeItem("opacity", 0, 0.3),
				keyframeItem("opacity", 2000, 0.8),
			],
		});
		command.execute();

		for (const id of ["clip-a", "clip-b"]) {
			const animations = elementById(id)?.animations;
			expect(
				getKeyframeAtTime({
					animations,
					propertyPath: "opacity",
					time: 5000,
				})?.value,
			).toBe(0.3);
			expect(
				getKeyframeAtTime({
					animations,
					propertyPath: "opacity",
					time: 7000,
				})?.value,
			).toBe(0.8);
		}

		// One undo restores BOTH targets — the paste is a single history entry.
		command.undo();
		for (const id of ["clip-a", "clip-b"]) {
			expect(elementById(id)?.animations?.bindings.opacity).toBeUndefined();
		}
	});

	test("keys past a shorter target's duration are omitted for that target only", () => {
		installEditor(
			buildVideoElement({ id: "long", startTime: 0, duration: 100_000 }),
		);
		currentTracks.main.elements.push(
			buildVideoElement({ id: "short", startTime: 0, duration: 6000 }),
		);

		new PasteKeyframesCommand({
			targets: [
				{ trackId: "main", elementId: "long" },
				{ trackId: "main", elementId: "short" },
			],
			time: 5000,
			clipboardItems: [
				keyframeItem("opacity", 0, 0.3),
				keyframeItem("opacity", 10_000, 0.9), // only fits on `long`
			],
		}).execute();

		const longAnimations = elementById("long")?.animations;
		const shortAnimations = elementById("short")?.animations;
		expect(
			getKeyframeAtTime({
				animations: longAnimations,
				propertyPath: "opacity",
				time: 15_000,
			})?.value,
		).toBe(0.9);
		// The 15000-tick key is beyond `short`'s duration — omitted there.
		expect(
			getKeyframeAtTime({
				animations: shortAnimations,
				propertyPath: "opacity",
				time: 15_000,
			}),
		).toBeNull();
		expect(
			getKeyframeAtTime({
				animations: shortAnimations,
				propertyPath: "opacity",
				time: 5000,
			})?.value,
		).toBe(0.3);
	});

	test("a target deleted between copy and paste is skipped, others still paste", () => {
		installEditor(
			buildVideoElement({ id: "clip-a", startTime: 0, duration: 100_000 }),
		);
		currentTracks.main.elements.push(
			buildVideoElement({ id: "clip-b", startTime: 0, duration: 100_000 }),
		);

		// clip-b is deleted after the copy — the paste references it anyway.
		const command = new PasteKeyframesCommand({
			targets: [
				{ trackId: "main", elementId: "clip-a" },
				{ trackId: "main", elementId: "deleted" },
			],
			time: 5000,
			clipboardItems: [keyframeItem("opacity", 0, 0.4)],
		});
		command.execute();

		expect(
			getKeyframeAtTime({
				animations: elementById("clip-a")?.animations,
				propertyPath: "opacity",
				time: 5000,
			})?.value,
		).toBe(0.4);
		// No crash, no phantom binding.
		expect(elementById("clip-b")?.animations?.bindings.opacity).toBeUndefined();
	});
});
