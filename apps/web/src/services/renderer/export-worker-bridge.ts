/**
 * Export Worker Bridge.
 *
 * Spawns the export Web Worker, transfers the OffscreenCanvas and
 * serialized scene tree, and listens for progress/completion/error
 * messages. The main thread is 100% unblocked during the export.
 */

import type { FrameRate } from "artidor-wasm";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import type { SerializedNode } from "./scene-serializer";

export type ExportWorkerProgress = {
	progress: number;
};

export type ExportWorkerResult =
	| { success: true; buffer: ArrayBuffer }
	| { success: false; cancelled: true }
	| { success: false; error: string };

/**
 * Feature detection: check if the browser supports the Worker +
 * OffscreenCanvas + WebCodecs pipeline.
 */
export function isExportWorkerSupported(): boolean {
	try {
		// OffscreenCanvas must be transferable to Worker
		if (typeof OffscreenCanvas === "undefined") return false;
		// WebCodecs must be available (for mediabunny)
		if (typeof VideoEncoder === "undefined") return false;
		// Worker must be supported
		if (typeof Worker === "undefined") return false;
		return true;
	} catch {
		return false;
	}
}

/**
 * Run the export pipeline in a Web Worker.
 *
 * @param canvas - OffscreenCanvas transferred to the worker for compositing
 * @param sceneTree - Serialized scene tree (plain data, no class instances)
 * @param files - Media files to transfer to the worker
 * @param audioBuffer - Pre-mixed audio buffer (transferred, not copied)
 * @param config - Export configuration
 * @param onProgress - Progress callback (called on main thread)
 * @param getCancelled - Poll function to check if export was cancelled
 * @returns The final export buffer, or null if cancelled/failed
 */
export async function runExportInWorker({
	canvas,
	sceneTree,
	files,
	audioBuffer,
	width,
	height,
	fps,
	format,
	quality,
	shouldIncludeAudio,
	onProgress,
	getCancelled,
}: {
	canvas: OffscreenCanvas;
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
	onProgress?: ({ progress }: { progress: number }) => void;
	getCancelled?: () => boolean;
}): Promise<ExportWorkerResult> {
	return new Promise((resolve) => {
		const worker = new Worker(
			new URL("./export-worker.ts", import.meta.url),
			{ type: "module" },
		);

		// Build transferables: OffscreenCanvas + media Files + audio ArrayBuffer
		const transferables: Transferable[] = [canvas];
		for (const { file } of files) {
			transferables.push(file);
		}
		if (audioBuffer) {
			transferables.push(audioBuffer);
		}

		// Cancel polling
		let cancelInterval: ReturnType<typeof setInterval> | null = null;
		if (getCancelled) {
			cancelInterval = setInterval(() => {
				if (getCancelled()) {
					worker.postMessage("cancel");
				}
			}, 100);
		}

		const cleanup = () => {
			if (cancelInterval) clearInterval(cancelInterval);
			worker.terminate();
		};

		worker.onmessage = (
			event: MessageEvent<
				| { type: "progress"; progress: number }
				| { type: "complete"; buffer: ArrayBuffer }
				| { type: "error"; error: string }
				| { type: "cancelled" }
			>,
		) => {
			const data = event.data;

			switch (data.type) {
				case "progress":
					onProgress?.({ progress: data.progress });
					break;

				case "complete":
					cleanup();
					resolve({ success: true, buffer: data.buffer });
					break;

				case "error":
					cleanup();
					resolve({ success: false, error: data.error });
					break;

				case "cancelled":
					cleanup();
					resolve({ success: false, cancelled: true });
					break;
			}
		};

		worker.onmessageerror = () => {
			cleanup();
			resolve({
				success: false,
				error: "Worker message could not be deserialized",
			});
		};

		worker.onerror = (event) => {
			cleanup();
			resolve({
				success: false,
				error: event.message || "Worker threw an error",
			});
		};

		// Send init message with all data
		worker.postMessage(
			{
				type: "init",
				canvas,
				sceneTree,
				files,
				audioBuffer,
				width,
				height,
				fps,
				format,
				quality,
				shouldIncludeAudio,
			},
			transferables,
		);
	});
}
