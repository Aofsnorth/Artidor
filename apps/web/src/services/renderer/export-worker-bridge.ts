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
import type { ExportAudioCodec, ExportVideoCodec } from "./export-codec";

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
	startFrame,
	endFrame,
	videoOnly,
	videoCodec,
	audioCodec,
	transferFiles = true,
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
	/** Inclusive start frame for segment exports (parallel pipeline). */
	startFrame?: number;
	/** Exclusive end frame for segment exports (parallel pipeline). */
	endFrame?: number;
	/** Encode video only and skip audio (parallel segments). */
	videoOnly?: boolean;
	/** Pinned video codec so all segments stay bitstream-compatible. */
	videoCodec?: ExportVideoCodec;
	/** Pinned audio codec. */
	audioCodec?: ExportAudioCodec;
	/**
	 * Whether to *transfer* the media File objects into the worker. The
	 * single-worker path transfers them (cheapest). The parallel path shares
	 * the same Files across many workers, so they must be cloned (structured
	 * clone shares the underlying Blob data cheaply) rather than transferred —
	 * a transferred File would be detached for every subsequent worker.
	 */
	transferFiles?: boolean;
	onProgress?: ({ progress }: { progress: number }) => void;
	getCancelled?: () => boolean;
}): Promise<ExportWorkerResult> {
	return new Promise((resolve) => {
		const worker = new Worker(new URL("./export-worker.ts", import.meta.url), {
			type: "module",
		});

		// Build transferables: OffscreenCanvas is always transferred. Files and
		// the audio buffer are only transferred for the single-worker path; the
		// parallel path clones them so they can be reused across workers.
		const transferables: Transferable[] = [canvas];
		if (transferFiles) {
			for (const { file } of files) {
				transferables.push(file);
			}
			if (audioBuffer) {
				transferables.push(audioBuffer);
			}
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
				startFrame,
				endFrame,
				videoOnly,
				videoCodec,
				audioCodec,
			},
			transferables,
		);
	});
}
