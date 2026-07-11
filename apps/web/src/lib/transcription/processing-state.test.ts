import { expect, test } from "bun:test";
import { getProcessingUpdate } from "./processing-state";

test("keeps model download percentage", () => {
	expect(
		getProcessingUpdate({
			status: "loading-model",
			progress: 42,
			backend: "webgpu",
		}),
	).toEqual({
		step: "Loading model",
		progress: 42,
		backend: "webgpu",
	});
});

test("keeps inference progress indeterminate", () => {
	expect(
		getProcessingUpdate({
			status: "transcribing",
			progress: 0,
			backend: "wasm",
			isIndeterminate: true,
		}),
	).toEqual({
		step: "Transcribing audio",
		progress: null,
		backend: "wasm",
	});
});
