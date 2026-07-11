import { describe, expect, test } from "bun:test";
import {
	getMediaTypeFromFile,
	mediaSupportsAudio,
} from "@/lib/media/media-utils";

describe("getMediaTypeFromFile", () => {
	test("detects audio by MIME type", () => {
		expect(
			getMediaTypeFromFile({ file: new File([], "x.mp3", { type: "audio/mpeg" }) }),
		).toBe("audio");
		expect(
			getMediaTypeFromFile({ file: new File([], "x.flac", { type: "audio/flac" }) }),
		).toBe("audio");
	});

	test("detects FLAC audio by extension when MIME type is missing", () => {
		expect(
			getMediaTypeFromFile({ file: new File([], "track.flac", { type: "" }) }),
		).toBe("audio");
		expect(
			getMediaTypeFromFile({
				file: new File([], "track.FLAC", { type: "application/octet-stream" }),
			}),
		).toBe("audio");
	});

	test("detects common audio extensions when MIME type is missing", () => {
		const names = ["a.wav", "b.mp3", "c.m4a", "d.aac", "e.ogg", "f.oga", "g.opus"];
		for (const name of names) {
			expect(
				getMediaTypeFromFile({ file: new File([], name, { type: "" }) }),
			).toBe("audio");
		}
	});

	test("detects image and video by MIME type", () => {
		expect(
			getMediaTypeFromFile({ file: new File([], "x.png", { type: "image/png" }) }),
		).toBe("image");
		expect(
			getMediaTypeFromFile({ file: new File([], "x.mp4", { type: "video/mp4" }) }),
		).toBe("video");
	});

	test("returns null for unrecognized files", () => {
		expect(getMediaTypeFromFile({ file: new File([], "x.xyz", { type: "" }) })).toBeNull();
	});
});

describe("mediaSupportsAudio", () => {
	test("audio and video assets support audio", () => {
		expect(mediaSupportsAudio({ media: { type: "audio" } as const })).toBe(true);
		expect(mediaSupportsAudio({ media: { type: "video" } as const })).toBe(true);
		expect(mediaSupportsAudio({ media: { type: "image" } as const })).toBe(false);
		expect(mediaSupportsAudio({ media: null })).toBe(false);
	});
});
