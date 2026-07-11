import { describe, expect, test } from "bun:test";
import { getTranscriptionBackends } from "./backend";

describe("getTranscriptionBackends", () => {
	test("prefers WebGPU and preserves a WASM fallback", () => {
		expect(getTranscriptionBackends({ webGpuAvailable: true })).toEqual([
			"webgpu",
			"wasm",
		]);
	});

	test("uses WASM when WebGPU is unavailable", () => {
		expect(getTranscriptionBackends({ webGpuAvailable: false })).toEqual([
			"wasm",
		]);
	});
});
