import { describe, expect, test, mock, afterAll, spyOn } from "bun:test";
import { createElement, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import type { EffectDragData } from "@/lib/timeline/drag";

afterAll(() => {
	mock.restore();
});

mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
	lastFrameTime: ({ duration }: { duration: number }) => duration,
	mediaTimeToSeconds: ({ time }: { time: number }) => time / 120_000,
	formatTimecode: ({ time }: { time: number }) => String(time),
	// Renderer modules statically import the GPU entry points; bun module
	// mocks persist across test files, so a partial stub breaks linking for
	// sibling suites (e.g. effect-preview.test.ts).
	initializeGpu: () => Promise.resolve(),
	destroyGpu: () => {},
	applyEffectPasses: () => [0, 0, 0],
	applyMaskFeather: () => [0, 0, 0],
}));

mock.module("sonner", () => ({
	toast: { error: mock(() => {}), success: mock(() => {}) },
}));

mock.module("@/lib/media/processing", () => ({
	processMediaAssets: async () => [],
}));

mock.module("@/lib/presets", () => ({
	presetToClipboardItems: () => [],
}));

mock.module("@/stores/presets-store", () => ({
	usePresetsStore: { getState: () => ({ presets: [] }) },
}));

mock.module("@/lib/i18n", () => ({
	useI18n: () => ({ t: (key: string) => key }),
}));

const insertedTrackIds: string[] = [];

const editorMock = {
	project: {
		getActive: () => ({ settings: { fps: 30 } }),
	},
	scenes: {
		getActiveScene: () => ({
			tracks: {
				overlay: [],
				main: {
					id: "main-track",
					name: "Main",
					type: "video",
					elements: [],
					muted: false,
					hidden: false,
				},
				overlayAfter: [],
				audio: [],
			},
		}),
	},
	playback: {
		getCurrentTime: () => 0,
	},
	command: {
		execute: () => {},
	},
	timeline: {
		insertElement: () => {},
		addClipEffect: () => {},
		getTrackById: () => null,
		updateTracks: () => {},
		insertElementWithTrack: (params: { trackId: string }) => {
			insertedTrackIds.push(params.trackId);
		},
	},
	media: {
		getAssets: () => [],
	},
};

mock.module("@/hooks/use-editor", () => ({
	useEditor: () => editorMock,
}));

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

mock.module("@/stores/timeline-store", () => ({
	useTimelineStore: (selector: (state: unknown) => unknown) => {
		const state = {
			snappingEnabled: true,
			trackHeights: {},
			expandedElementIds: new Set<string>(),
		};
		return selector ? selector(state) : state;
	},
}));

// Two effect tracks: the ghost (drop-line) points at the hovered one
// (trackIndex 1 = "fx-2"), so the commit must land there — not on the
// first effect track ("fx-1").
const dropTarget = await import(
	"@/components/editor/panels/timeline/drop-target"
);
const orderedTracks = await import("@/lib/timeline");
spyOn(dropTarget, "computeDropTarget").mockImplementation(() => ({
	trackIndex: 1,
	isNewTrack: false,
	insertPosition: null,
	xPosition: 120_000,
	targetElement: null,
}));
spyOn(orderedTracks, "getOrderedTracks").mockImplementation(
	() =>
		[
			{ id: "fx-1", name: "FX 1", type: "effect", elements: [] },
			{ id: "fx-2", name: "FX 2", type: "effect", elements: [] },
		] as never,
);

const elementUtils = await import("@/lib/timeline/element-utils");
const inserted: Array<{ trackId: string }> = [];
spyOn(editorMock.timeline, "insertElement").mockImplementation(
	(params: { placement: { trackId: string } }) => {
		inserted.push({ trackId: params.placement.trackId });
	},
);
// buildEffectElement hits the real effects registry, which needs async
// init in a browser — stub the element build so the test stays logic-level.
spyOn(elementUtils, "buildEffectElement").mockImplementation(
	({ effectType, startTime }) =>
		({
			type: "effect",
			name: effectType,
			effectType,
			params: {},
			duration: 120_000,
			startTime,
			trimStart: 0,
			trimEnd: 0,
		}) as never,
);

const { useTimelineDragDrop } = await import("./use-timeline-drag-drop");

const MIME_TYPE = "application/x-timeline-drag";

function makeEffectDragEvent(): {
	preventDefault: () => void;
	clientX: number;
	clientY: number;
	dataTransfer: {
		types: string[];
		dropEffect: string;
		files: File[];
		getData: (type: string) => string;
	};
} {
	const dragData: EffectDragData = {
		type: "effect",
		id: "effect-1",
		name: "Blur",
		effectType: "blur",
		targetElementTypes: ["video", "image", "text", "sticker", "graphic"],
	};

	return {
		preventDefault: () => {},
		clientX: 120,
		clientY: 30,
		dataTransfer: {
			types: [MIME_TYPE],
			dropEffect: "none",
			files: [],
			getData: (type: string) => {
				if (type === MIME_TYPE || type === "text/plain") {
					return JSON.stringify(dragData);
				}
				return "";
			},
		},
	};
}

describe("useTimelineDragDrop effect-track preference (bughunt R01)", () => {
	test("effect dropped while hovering the second effect track lands on the second track", () => {
		function Test() {
			const containerRef = useRef<HTMLDivElement>(null);
			const result = useTimelineDragDrop({
				containerRef:
					containerRef as unknown as React.RefObject<HTMLDivElement>,
				zoomLevel: 1,
			});
			const [phase, setPhase] = useState("dragover");

			containerRef.current = {
				getBoundingClientRect: () =>
					({
						left: 0,
						top: 0,
						right: 1200,
						bottom: 800,
						width: 1200,
						height: 800,
						x: 0,
						y: 0,
						toJSON: () => {},
					}) as unknown as DOMRect,
			} as unknown as HTMLDivElement;

			if (phase === "dragover") {
				result.dragProps.onDragOver(makeEffectDragEvent() as never);
				setPhase("drop");
			} else if (phase === "drop") {
				result.dragProps.onDrop(makeEffectDragEvent() as never);
				setPhase("done");
			}

			return createElement("div", null, phase === "done" ? "done" : "running");
		}

		renderToString(createElement(Test));

		expect(inserted.length).toBe(1);
		expect(inserted[0]?.trackId).toBe("fx-2");
	});
});
