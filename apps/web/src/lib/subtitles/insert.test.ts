import { describe, expect, test, mock, beforeEach } from "bun:test";
import { insertCaptionChunksAsTextTrack } from "./insert";

const buildSubtitleTextElement = mock((args: {
	index: number;
	caption: { text: string; startTime: number; duration: number };
	canvasSize: { width: number; height: number };
	captionPresetId?: string;
}) => ({
	...args,
	id: `caption-${args.index}`,
	type: "text" as const,
	content: args.caption.text,
	startTime: 0,
	duration: 100,
	fontSize: 12,
	fontFamily: "Arial",
	color: "#ffffff",
	textAlign: "center" as const,
	fontWeight: "normal" as const,
	fontStyle: "normal" as const,
	textDecoration: "none" as const,
	letterSpacing: 0,
	lineHeight: 1.2,
	background: {
		enabled: false,
		color: "#000000",
		cornerRadius: 0,
		paddingX: 0,
		paddingY: 0,
		offsetX: 0,
		offsetY: 0,
	},
	transform: { position: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotate: 0 },
	opacity: 1,
	animations: [],
	effects: [],
	trimStart: 0,
	trimEnd: 0,
	hidden: false,
}));

mock.module("./build-subtitle-text-element", () => ({
	buildSubtitleTextElement,
}));

beforeEach(() => {
	buildSubtitleTextElement.mockClear();
});

function makeEditor() {
	let tracks = {
		overlay: [],
		main: {
			id: "main",
			type: "video" as const,
			name: "Main",
			elements: [],
			collapsed: false,
			locked: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};

	return {
		project: {
			getActive: () => ({
				settings: { canvasSize: { width: 1920, height: 1080 } },
			}),
		},
		scenes: {
			getActiveScene: () => ({ tracks }),
		},
		command: {
			execute: () => {},
		},
		timeline: {
			updateTracks: (next: typeof tracks) => {
				tracks = next;
			},
		},
	};
}

describe("insertCaptionChunksAsTextTrack", () => {
	test("passes captionPresetId through to buildSubtitleTextElement", () => {
		const editor = makeEditor();

		insertCaptionChunksAsTextTrack({
			editor: editor as never,
			captions: [
				{ text: "Hello", startTime: 0, duration: 1 },
				{ text: "World", startTime: 1, duration: 1 },
			],
			captionPresetId: "caption-pop",
		});

		expect(buildSubtitleTextElement).toHaveBeenCalledTimes(2);
		expect(buildSubtitleTextElement).toHaveBeenCalledWith(
			expect.objectContaining({ captionPresetId: "caption-pop" }),
		);
	});

	test("returns null when there are no captions", () => {
		const editor = makeEditor();
		const result = insertCaptionChunksAsTextTrack({
			editor: editor as never,
			captions: [],
			captionPresetId: "caption-pop",
		});
		expect(result).toBeNull();
		expect(buildSubtitleTextElement).toHaveBeenCalledTimes(0);
	});
});
