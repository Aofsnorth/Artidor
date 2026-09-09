import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { EditorCore } from "@/core";
import type { SoundEffect } from "@/lib/sounds/types";
import { buildSceneTracks } from "@/tests/factories/editor";
import { useSoundsStore } from "../sounds-store";





const sound: SoundEffect = {
	id: 7, name: "Beep", description: "", url: "", previewUrl: "https://example.test/beep.mp3",
	duration: 5, filesize: 0, type: "audio", channels: 1, bitrate: 0, bitdepth: 0,
	samplerate: 48_000, username: "fixture", tags: [], license: "cc", created: "", downloads: 0, rating: 0, ratingCount: 0,
};
const originalError = console.error;
beforeEach(() => { console.error = mock(() => undefined) as unknown as typeof console.error; });
afterEach(() => { console.error = originalError; });
const originalFetch = globalThis.fetch;
const contextDescriptor = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
const close = mock(() => Promise.resolve());
const decode = mock(() => Promise.resolve({ duration: 5 } as AudioBuffer));
beforeEach(() => {
	close.mockReset(); close.mockResolvedValue(); decode.mockReset(); decode.mockResolvedValue({ duration: 5 } as AudioBuffer);
	Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { decodeAudioData = decode; close = close; } });
});
afterEach(() => {
	mock.restore(); globalThis.fetch = originalFetch;
	if (contextDescriptor) Object.defineProperty(globalThis, "AudioContext", contextDescriptor);
	else Reflect.deleteProperty(globalThis, "AudioContext");
});
function fixture() {
	const state = { projectId: "project", sceneId: "scene", time: 240_000 };
	const insert = mock();
	const tracks = buildSceneTracks({ audio: [{ id: "audio-track", name: "Audio", type: "audio", elements: [], muted: false }] });
	const editor = {
		project: { getActiveOrNull: () => ({ metadata: { id: state.projectId } }) },
		scenes: { getActiveScene: () => ({ id: state.sceneId, tracks }), getActiveSceneOrNull: () => ({ id: state.sceneId, tracks }) },
		playback: { getCurrentTime: () => state.time },
		timeline: { insertElement: insert },
	} as unknown as EditorCore;
	spyOn(EditorCore, "getInstance").mockReturnValue(editor);
	const request = Promise.withResolvers<Response>();
	globalThis.fetch = mock(() => request.promise) as unknown as typeof fetch;
	return { state, insert, request };
}
test("R17a insertion uses post-download playhead and seconds-to-ticks duration", async () => {
	const f = fixture(); const pending = useSoundsStore.getState().addSoundToTimeline({ sound });
	f.state.time = 480_000; f.request.resolve(new Response(new ArrayBuffer(32)));
	const result = await pending; expect(result).toBe(true);
	expect(f.insert).toHaveBeenCalledTimes(1);
	expect(f.insert.mock.calls.at(0)?.at(0)).toMatchObject({ element: { startTime: 480_000, duration: 600_000, sourceDuration: 600_000 } });
	expect(close).toHaveBeenCalledTimes(1);
	expect(f.insert.mock.calls.at(0)?.at(0)).toMatchObject({ element: { startTime: 480_000, duration: 600_000, sourceDuration: 600_000 } });
});
test("R17 workspace switch cancels insertion; decode failure closes context", async () => {
	const f = fixture(); const pending = useSoundsStore.getState().addSoundToTimeline({ sound });
	f.state.projectId = "different-project"; f.request.resolve(new Response(new ArrayBuffer(32)));
	expect(await pending).toBe(false);
	expect(f.insert).not.toHaveBeenCalled();
	expect(close).toHaveBeenCalledTimes(1);
	const failed = fixture();
	decode.mockRejectedValueOnce(new Error("decode failure"));
	const bad = useSoundsStore.getState().addSoundToTimeline({ sound });
	failed.request.resolve(new Response(new ArrayBuffer(64)));
	expect(await bad).toBe(false);
	expect(close).toHaveBeenCalledTimes(2);
	expect(failed.insert).not.toHaveBeenCalled();
});
