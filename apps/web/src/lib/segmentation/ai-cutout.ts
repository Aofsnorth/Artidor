/**
 * AI background removal service — uses transformers.js (ONNX runtime)
 * with the RMBG-1.4 model to remove backgrounds from any subject
 * (people, products, objects). Runs fully in-browser, no server, no
 * telemetry. The model (~44MB) is fetched once from the HuggingFace
 * Hub and cached by the browser.
 *
 * Performance characteristics:
 *  - Lazy dynamic import: zero initial bundle cost. transformers.js
 *    + the RMBG-1.4 ONNX model are only fetched when the user first
 *    invokes "AI cutout".
 *  - Inference runs in a dedicated worker (`ai-cutout.worker.ts`), so
 *    WASM/WebGPU execution never blocks the editor UI. Pixels cross the
 *    boundary as transferable ImageBitmaps (zero-copy).
 *
 * NOTE: the transformers.js import must stay inside the worker. A dynamic
 * import from this module would land in the SSR graph and make Turbopack
 * create a Windows junction under `.next/dev/node_modules`, which panics
 * on exFAT drives (see ai-cutout.worker.ts).
 */

import type {
	SegmentationResult,
	SegmentationSource,
} from "./person-segmenter";
import type {
	AiCutoutWorkerRequest,
	AiCutoutWorkerResponse,
} from "./ai-cutout.worker";

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<
	number,
	{ resolve: (bitmap: ImageBitmap) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
	if (worker) return worker;

	worker = new Worker(new URL("./ai-cutout.worker.ts", import.meta.url), {
		type: "module",
	});
	worker.onmessage = (event: MessageEvent<AiCutoutWorkerResponse>) => {
		const message = event.data;
		const entry = pending.get(message.requestId);
		if (!entry) return;
		pending.delete(message.requestId);
		if (message.type === "cutout-complete") {
			entry.resolve(message.bitmap);
		} else {
			entry.reject(new Error(message.error));
		}
	};
	worker.onerror = (event) => {
		const error = new Error(
			event.message || "AI cutout worker crashed before completing",
		);
		for (const entry of pending.values()) {
			entry.reject(error);
		}
		pending.clear();
	};
	if (typeof window !== "undefined") {
		window.addEventListener("pagehide", () => releaseAiCutout(), {
			once: true,
		});
	}
	return worker;
}

/**
 * Remove the background from an image source, returning a transparent
 * canvas where only the subject is visible. Works on any subject
 * (people, products, objects).
 *
 * @param source - An HTMLImageElement, HTMLCanvasElement, HTMLVideoElement,
 *                 ImageBitmap, or ImageData.
 */
export async function removeBackground({
	source,
}: {
	source: SegmentationSource;
}): Promise<SegmentationResult> {
	const srcWidth =
		(source as HTMLImageElement).naturalWidth ??
		(source as HTMLCanvasElement).width ??
		(source as HTMLVideoElement).videoWidth ??
		256;
	const srcHeight =
		(source as HTMLImageElement).naturalHeight ??
		(source as HTMLCanvasElement).height ??
		(source as HTMLVideoElement).videoHeight ??
		256;

	// The worker owns inference; hand it the pixels as a transferable
	// ImageBitmap so nothing is copied.
	const bitmap = await createImageBitmap(source as ImageBitmapSource);
	const activeWorker = getWorker();
	requestId += 1;
	const id = requestId;

	const resultBitmap = await new Promise<ImageBitmap>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		const request: AiCutoutWorkerRequest = {
			type: "cutout",
			requestId: id,
			bitmap,
		};
		activeWorker.postMessage(request, { transfer: [bitmap] });
	});

	// Scale back to the original resolution. The model runs at
	// 1024px internally; larger inputs were downscaled before inference.
	const canvas = document.createElement("canvas");
	canvas.width = srcWidth;
	canvas.height = srcHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get 2d context for AI cutout output");
	}
	ctx.drawImage(resultBitmap, 0, 0, srcWidth, srcHeight);
	resultBitmap.close();

	return { canvas, width: srcWidth, height: srcHeight };
}

/**
 * Terminate the worker and free ONNX memory.
 * Call this when background removal is no longer needed.
 */
export function releaseAiCutout(): void {
	if (!worker) return;
	for (const entry of pending.values()) {
		entry.reject(new Error("AI cutout worker released"));
	}
	pending.clear();
	worker.terminate();
	worker = null;
}
