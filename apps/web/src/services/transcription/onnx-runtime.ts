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
export function configureOnnxRuntime(
	transformersEnv: OnnxRuntimeEnvironment,
): void {
	transformersEnv.useWasmCache = false;

	const wasm = transformersEnv.backends.onnx.wasm;
	if (!wasm) return;

	wasm.numThreads = 1;
	wasm.proxy = false;
}
