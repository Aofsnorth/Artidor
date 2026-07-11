/**
 * Full-pipeline beat analysis — moves the ENTIRE audio pipeline off the
 * main thread to prevent UI freeze.
 *
 * Old pipeline (froze UI):
 *  extractClipAudio (mediabunny, main thread) →
 *  decodeAudioToFloat32 (AudioContext, main thread) →
 *  detectBeatsAsync (worker)
 *
 * New pipeline (zero UI freeze):
 *  analyzeBeats(worker) — decode + trim + mixdown + detect, all in worker
 *
 * Usage:
 *   const beats = await analyzeBeats({
 *     file: mediaAsset.file,
 *     trimStartSeconds: element.trimStart / TICKS_PER_SECOND,
 *     durationSeconds: element.duration / TICKS_PER_SECOND,
 *     targetSampleRate: 8000,
 *     onProgress: (p) => toast.loading(`Analyzing… ${Math.round(p*100)}%`),
 *   });
 */

import type {
	BeatDetectionOptions,
	DetectedBeat,
} from "./beat-detection-types";
import { createBeatAnalysisGate } from "./beat-analysis-gate";
import type {
	BeatAnalysisRequest,
	BeatAnalysisResponse,
} from "./beat-analysis-worker";

let worker: Worker | null = null;
const analysisGate = createBeatAnalysisGate();

function getWorker(): Worker {
	if (worker) return worker;
	worker = new Worker(new URL("./beat-analysis-worker.ts", import.meta.url), {
		type: "module",
	});
	if (typeof window !== "undefined") {
		window.addEventListener("pagehide", () => terminateAnalysisWorker(), {
			once: true,
		});
	}
	return worker;
}

/** Terminate the singleton analysis worker. Safe to call multiple times. */
export function terminateAnalysisWorker(): void {
	if (worker) {
		worker.terminate();
		worker = null;
	}
}

export async function analyzeBeats({
	file,
	trimStartSeconds,
	durationSeconds,
	targetSampleRate = 8000,
	options,
	onProgress,
	signal,
}: {
	file: File;
	trimStartSeconds: number;
	durationSeconds: number;
	targetSampleRate?: number;
	options?: BeatDetectionOptions;
	onProgress?: (progress: number) => void;
	signal?: AbortSignal;
}): Promise<DetectedBeat[]> {
	const w = getWorker();

	return analysisGate.run(
		() =>
			new Promise<DetectedBeat[]>((resolve, reject) => {
				let settled = false;

				const handleMessage = (event: MessageEvent<BeatAnalysisResponse>) => {
					const res = event.data;
					switch (res.type) {
						case "progress":
							onProgress?.(res.progress);
							break;
						case "complete":
							cleanup();
							settled = true;
							resolve(res.beats);
							break;
						case "error":
							cleanup();
							settled = true;
							reject(new Error(res.error));
							break;
						case "cancelled":
							cleanup();
							settled = true;
							reject(new DOMException("Beat analysis cancelled", "AbortError"));
							break;
					}
				};

				const handleAbort = () => {
					if (settled) return;
					w.postMessage({ type: "cancel" });
				};

				function cleanup(): void {
					w.removeEventListener("message", handleMessage);
					signal?.removeEventListener("abort", handleAbort);
				}

				w.addEventListener("message", handleMessage);
				signal?.addEventListener("abort", handleAbort);

				const request: BeatAnalysisRequest = {
					type: "analyze",
					file,
					trimStartSeconds,
					durationSeconds,
					targetSampleRate,
					options,
				};
				// File is cloneable (not transferable), so we just post it.
				w.postMessage(request);
			}),
	);
}
