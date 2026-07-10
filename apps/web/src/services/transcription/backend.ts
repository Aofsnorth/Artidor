export type TranscriptionBackend = "webgpu" | "wasm";

export function getTranscriptionBackends({
	webGpuAvailable,
}: {
	webGpuAvailable: boolean;
}): TranscriptionBackend[] {
	return webGpuAvailable ? ["webgpu", "wasm"] : ["wasm"];
}
