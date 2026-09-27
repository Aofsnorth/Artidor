import { describe, expect, test, mock, afterAll, spyOn } from "bun:test";
import { createElement, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import type { MediaDragData } from "@/lib/timeline/drag";
import type { SnapPoint } from "@/lib/timeline/snap-utils";

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

// Main track has clip-1 from 0 to 120_000 ticks (1s)
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
					elements: [
						{
							id: "clip-1",
							startTime: 0,
							duration: 120_000,
							type: "video",
							name: "Clip 1",
						},
					],
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
	},
	media: {
		getAssets: () => [
			{
				id: "asset-2",
				name: "Clip 2",
				type: "video",
				duration: 1, // 1 second = 120_000 ticks
			},
		],
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

let capturedDropTargetParams: Record<string, unknown> | null = null;
const dropTargetModule = await import(
	"@/components/editor/panels/timeline/drop-target"
);
spyOn(dropTargetModule, "computeDropTarget").mockImplementation((params) => {
	capturedDropTargetParams = params as unknown as Record<string, unknown>;
	return {
		trackIndex: 0,
		isNewTrack: false,
		insertPosition: null,
		xPosition:
			(params as { startTimeOverride?: number }).startTimeOverride ?? 0,
		targetElement: null,
	};
});

const { useTimelineDragDrop } = await import("./use-timeline-drag-drop");

const MIME_TYPE = "application/x-timeline-drag";

function makeMediaDragEvent(clientX: number): {
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
	const dragData: MediaDragData = {
		type: "media",
		id: "asset-2",
		mediaType: "video",
	};

	return {
		preventDefault: () => {},
		clientX,
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

describe("useTimelineDragDrop adjacent snap (bughunt)", () => {
	test("media drag over clip-1 does not force an adjacent-edge snap", () => {
		let reportedSnapPoint: SnapPoint | null = null;

		function Test() {
			const containerRef = useRef<HTMLDivElement>(null);
			const [fired, setFired] = useState(false);
			const result = useTimelineDragDrop({
				containerRef:
					containerRef as unknown as React.RefObject<HTMLDivElement>,
				zoomLevel: 1,
				onSnapPointChange: (pt) => {
					reportedSnapPoint = pt;
				},
			});

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

			if (!fired) {
				setFired(true);
				result.dragProps.onDragOver(makeMediaDragEvent(35) as never);
			}

			return createElement("div", null, "running");
		}

		renderToString(createElement(Test));

		// Cursor over clip 1 must keep its cursor-derived position. The drop
		// resolver decides whether the overlapping media needs another track.
		expect(capturedDropTargetParams?.startTimeOverride).toBe(64_800);
		expect(reportedSnapPoint).toBeNull();
	});

	test("media drag right of clip-1 within import radius snaps start to clip-1 end", () => {
		let reportedSnapPoint: SnapPoint | null = null;

		function Test() {
			const containerRef = useRef<HTMLDivElement>(null);
			const [fired, setFired] = useState(false);
			const result = useTimelineDragDrop({
				containerRef:
					containerRef as unknown as React.RefObject<HTMLDivElement>,
				zoomLevel: 1,
				onSnapPointChange: (pt) => {
					reportedSnapPoint = pt;
				},
			});

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

			// BASE_TIMELINE_PIXELS_PER_SECOND = 50. Inset = 8.
			// Clip 1 ends at clientX = 58. The new clip starts at clientX = 105,
			// 47px to its right: close enough for the 64px import-snap radius.
			if (!fired) {
				setFired(true);
				result.dragProps.onDragOver(makeMediaDragEvent(105) as never);
			}

			return createElement("div", null, "running");
		}

		renderToString(createElement(Test));

		// Snapped time passed to computeDropTarget should be exactly clip-1's end time (120_000)
		expect(capturedDropTargetParams?.startTimeOverride).toBe(120_000);
		// A media edge snap must insert at the edge, not replace the clip under
		// the cursor when the cursor is still inside that clip.
		expect(capturedDropTargetParams?.targetElementTypes).toBeUndefined();
		// Snap point should be reported to onSnapPointChange
		expect(reportedSnapPoint).not.toBeNull();
		expect(reportedSnapPoint?.time).toBe(120_000);
		expect(reportedSnapPoint?.type).toBe("element-end");
	});

	test("magnet off does not snap to adjacent clip", () => {
		let reportedSnapPoint: SnapPoint | null = null;

		// Mock snapping disabled
		mock.module("@/stores/timeline-store", () => ({
			useTimelineStore: (selector: (state: unknown) => unknown) => {
				const state = {
					snappingEnabled: false,
					trackHeights: {},
					expandedElementIds: new Set<string>(),
				};
				return selector ? selector(state) : state;
			},
		}));

		function TestNoSnap() {
			const containerRef = useRef<HTMLDivElement>(null);
			const [fired, setFired] = useState(false);
			const result = useTimelineDragDrop({
				containerRef:
					containerRef as unknown as React.RefObject<HTMLDivElement>,
				zoomLevel: 1,
				onSnapPointChange: (pt) => {
					reportedSnapPoint = pt;
				},
			});

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

			if (!fired) {
				setFired(true);
				result.dragProps.onDragOver(makeMediaDragEvent(60) as never);
			}

			return createElement("div", null, "running");
		}

		renderToString(createElement(TestNoSnap));

		// When magnet is off, startTimeOverride stays at 124_800 (not snapped to 120_000)
		expect(capturedDropTargetParams?.startTimeOverride).toBe(124_800);
		expect(reportedSnapPoint).toBeNull();
	});
});
