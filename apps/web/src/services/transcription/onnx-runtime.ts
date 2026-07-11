import type { TranscriptionBackend } from "./backend";

type OnnxRuntimeEnvironment = {
	useWasmCache: boolean;
	backends: {
		onnx: {
			wasm?: {
				numThreads?: number;
				proxy?: boolean;
			};
		};
	};
};

/** Avoids blob-backed ONNX modules that violate the application's CSP. */
export function configureOnnxRuntime({
	runtime,
	backend,
}: {
	runtime: OnnxRuntimeEnvironment;
	backend: TranscriptionBackend;
}): void {
	runtime.useWasmCache = false;

	if (backend !== "wasm") return;

	const wasm = runtime.backends.onnx.wasm;
	if (!wasm) return;

	wasm.numThreads = 1;
	wasm.proxy = false;
}
