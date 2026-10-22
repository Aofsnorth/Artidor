/**
 * Frame capture — the HTMLVideoElement seek must never hang.
 *
 * A corrupt/unsupported file used to leave the `seeked` promise pending
 * forever, so thumbnail generation never settled. These tests drive a fake
 * video element: one seek errors, one never fires `seeked` and must hit the
 * timeout instead.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { captureFrameFromVideo } from "./frame-capture";

class FakeVideo extends EventTarget {
	crossOrigin = "";
	muted = false;
	playsInline = false;
	preload = "";
	src = "";
	currentTime = 0;
	duration = 10;
	videoWidth = 640;
	videoHeight = 360;
	removed = false;

	remove(): void {
		this.removed = true;
	}
}

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;
const originalDocument = globals.document;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
let video: FakeVideo | null = null;

beforeEach(() => {
	video = null;
	globals.document = {
		createElement: (tag: string) => {
			if (tag !== "video") throw new Error(`unexpected element: ${tag}`);
			video = new FakeVideo();
			return video;
		},
	};
	URL.createObjectURL = () => "blob:fake-video";
	URL.revokeObjectURL = () => {};
});

afterEach(() => {
	if (originalDocument === undefined) {
		delete globals.document;
	} else {
		globals.document = originalDocument;
	}
	URL.createObjectURL = originalCreateObjectURL;
	URL.revokeObjectURL = originalRevokeObjectURL;
});

function file(): File {
	return new File(["video-bytes"], "clip.mp4", { type: "video/mp4" });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("captureFrameFromVideo seek guard", () => {
	test("rejects instead of hanging when the video errors during seek", async () => {
		const promise = captureFrameFromVideo({
			file: file(),
			timeSeconds: 1,
			fileName: "frame.png",
			seekTimeoutMs: 1_000,
		});
		const element = video;
		if (!element) throw new Error("video was not created");

		element.dispatchEvent(new Event("loadeddata"));
		await flush();
		element.dispatchEvent(new Event("error"));

		await expect(promise).rejects.toThrow("Could not seek video");
		expect(element.removed).toBe(true);
	});

	test("rejects with a timeout when seeked never fires", async () => {
		const promise = captureFrameFromVideo({
			file: file(),
			timeSeconds: 1,
			fileName: "frame.png",
			seekTimeoutMs: 5,
		});
		const element = video;
		if (!element) throw new Error("video was not created");

		element.dispatchEvent(new Event("loadeddata"));

		await expect(promise).rejects.toThrow(/Timed out seeking video/);
		expect(element.removed).toBe(true);
	});
});
