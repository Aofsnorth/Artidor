import { expect, test } from "bun:test";
import { configureOnnxRuntime } from "./onnx-runtime";

test("avoids blob-backed ONNX WASM modules", () => {
	const runtime = {
		useWasmCache: true,
		backends: {
			onnx: {
				wasm: {
					numThreads: 4,
					proxy: true,
				},
			},
		},
	};

	configureOnnxRuntime(runtime);

	expect(runtime.useWasmCache).toBeFalse();
	expect(runtime.backends.onnx.wasm?.numThreads).toBe(1);
	expect(runtime.backends.onnx.wasm?.proxy).toBeFalse();
});
