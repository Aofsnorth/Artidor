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

	configureOnnxRuntime({ runtime, backend: "wasm" });

	expect(runtime.useWasmCache).toBeFalse();
	expect(runtime.backends.onnx.wasm?.numThreads).toBe(1);
	expect(runtime.backends.onnx.wasm?.proxy).toBeFalse();
});

test("only applies WASM restrictions to the WASM fallback", () => {
	const runtime = {
		useWasmCache: true,
		backends: { onnx: { wasm: { numThreads: 4, proxy: true } } },
	};
	configureOnnxRuntime({ runtime, backend: "webgpu" });
	expect(runtime.useWasmCache).toBeFalse();
	expect(runtime.backends.onnx.wasm?.numThreads).toBe(4);
	expect(runtime.backends.onnx.wasm?.proxy).toBeTrue();
});
