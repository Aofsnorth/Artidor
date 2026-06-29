import { describe, expect, test, mock } from "bun:test";
import type { Input, InputAudioTrack } from "mediabunny";

// `@/lib/media/mediabunny` imports `TICKS_PER_SECOND` from `@/lib/wasm`,
// which reads the wasm instance. The wasm instance is not instantiated
// in the bun:test environment, so mock the `artidor-wasm` module with
// the fixed tick rate. This mirrors the pattern in
// `apps/web/src/lib/media/__tests__/audio-silence.test.ts`.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

const { resolveAudioTrackByIndex } = await import("../mediabunny");

/**
 * Builds a mock Input whose getAudioTracks / getPrimaryAudioTrack
 * return the provided tracks. The helper under test only calls those
 * two methods, so we don't need to mock the full Input surface.
 */
function makeMockInput({
	audioTracks,
	primaryTrack,
}: {
	audioTracks: InputAudioTrack[];
	primaryTrack: InputAudioTrack | null;
}): Input {
	return {
		getAudioTracks: () => Promise.resolve(audioTracks),
		getPrimaryAudioTrack: () => Promise.resolve(primaryTrack),
	} as unknown as Input;
}

describe("resolveAudioTrackByIndex", () => {
	test("returns the track at the given index when in range", async () => {
		const track0 = {} as InputAudioTrack;
		const track1 = {} as InputAudioTrack;
		const track2 = {} as InputAudioTrack;
		const input = makeMockInput({
			audioTracks: [track0, track1, track2],
			primaryTrack: track0,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: 1,
		});
		expect(result).toBe(track1);
	});

	test("falls back to primary track when index is undefined", async () => {
		const track0 = {} as InputAudioTrack;
		const track1 = {} as InputAudioTrack;
		const input = makeMockInput({
			audioTracks: [track0, track1],
			primaryTrack: track0,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: undefined,
		});
		expect(result).toBe(track0);
	});

	test("falls back to primary track when index is negative", async () => {
		const track0 = {} as InputAudioTrack;
		const input = makeMockInput({
			audioTracks: [track0],
			primaryTrack: track0,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: -1,
		});
		expect(result).toBe(track0);
	});

	test("clamps to last track when index exceeds track count", async () => {
		const track0 = {} as InputAudioTrack;
		const track1 = {} as InputAudioTrack;
		const input = makeMockInput({
			audioTracks: [track0, track1],
			primaryTrack: track0,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: 5,
		});
		// Should clamp to the last valid index (1), not fall back to
		// primary, so the user still gets a multi-track selection
		// rather than silently reverting to track 0.
		expect(result).toBe(track1);
	});

	test("returns null when the file has no audio tracks", async () => {
		const input = makeMockInput({
			audioTracks: [],
			primaryTrack: null,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: 0,
		});
		expect(result).toBeNull();
	});

	test("returns null when the file has no audio tracks and index is undefined", async () => {
		const input = makeMockInput({
			audioTracks: [],
			primaryTrack: null,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: undefined,
		});
		expect(result).toBeNull();
	});

	test("index 0 returns the first track, not necessarily the primary", async () => {
		const track0 = {} as InputAudioTrack;
		const track1 = {} as InputAudioTrack;
		// Primary is track1 (e.g. disposition-based), but index 0 is
		// track0. The helper should respect the explicit index.
		const input = makeMockInput({
			audioTracks: [track0, track1],
			primaryTrack: track1,
		});

		const result = await resolveAudioTrackByIndex({
			input,
			trackIndex: 0,
		});
		expect(result).toBe(track0);
	});
});
