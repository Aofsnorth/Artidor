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

const dropTarget = await import("@/components/editor/panels/timeline/drop-target");
spyOn(dropTarget, "computeDropTarget").mockImplementation(() => ({
	trackIndex: 0,
	isNewTrack: false,
	insertPosition: null,
	xPosition: 0,
	targetElement: null,
}));

const { useTimelineDragDrop } = await import("./use-timeline-drag-drop");
const { toast } = await import("sonner");

const MIME_TYPE = "application/x-timeline-drag";

function makeDragEvent(): {
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

describe("useTimelineDragDrop", () => {
	test("shows toast error when dropping an effect on a non-effect track", () => {
		function Test() {
			const containerRef = useRef<HTMLDivElement>(null);
			const result = useTimelineDragDrop({
				containerRef: containerRef as unknown as React.RefObject<HTMLDivElement>,
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
					} as unknown as DOMRect),
			} as unknown as HTMLDivElement;

			if (phase === "dragover") {
				result.dragProps.onDragOver(makeDragEvent() as never);
				setPhase("drop");
			} else if (phase === "drop") {
				result.dragProps.onDrop(makeDragEvent() as never);
				setPhase("done");
			}

			return createElement("div", null, phase === "done" ? "done" : "running");
		}

		renderToString(createElement(Test));

		expect(toast.error).toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"timeline.error.invalidEffectTrack",
		);
	});
});
