/**
 * AI cutout worker — runs the transformers.js background-removal pipeline
 * (RMBG/MODNet via @xenova/transformers) off the main thread.
 *
 * The dynamic `import("@xenova/transformers")` MUST live here and only here:
 * Turbopack compiles worker graphs as browser-only runtimes, so the package
 * is bundled instead of being externalized into the SSR graph. An SSR-side
 * dynamic import of this ESM package makes Turbopack materialize a Windows
 * junction under `.next/dev/node_modules`, which hard-panics on exFAT drives.
 *
 * Data flows as transferable ImageBitmaps in both directions, so no pixel
 * data is copied across the boundary.
 */

import type { RawImage } from "@xenova/transformers";

export type AiCutoutWorkerRequest = {
	type: "cutout";
	requestId: number;
	bitmap: ImageBitmap;
};

export type AiCutoutWorkerResponse =
	| {
			type: "cutout-complete";
			requestId: number;
			bitmap: ImageBitmap;
			width: number;
			height: number;
	  }
	| { type: "cutout-error"; requestId: number; error: string };

const MAX_LONG_EDGE = 1024;

let transformersModule: typeof import("@xenova/transformers") | null = null;
let pipelineInstance: unknown | null = null;
let pipelinePromise: Promise<unknown> | null = null;

type CutoutPipeline = (input: RawImage) => Promise<RawImageLike>;

type RawImageLike = RawImage & {
	toCanvas?: () => OffscreenCanvas | HTMLCanvasElement;
};

async function loadTransformers(): Promise<
	typeof import("@xenova/transformers")
> {
	if (!transformersModule) {
		transformersModule = await import("@xenova/transformers");
	}
	return transformersModule;
}

/**
 * Lazily load transformers.js and initialise the background-removal
 * pipeline. The ONNX runtime and model are fetched on first use and
 * cached for subsequent cutouts.
 */
async function getPipeline(): Promise<CutoutPipeline> {
	if (pipelineInstance) {
		return pipelineInstance as CutoutPipeline;
	}
	if (!pipelinePromise) {
		pipelinePromise = (async () => {
			const { pipeline } = await loadTransformers();
			// The RMBG/MODNet model produces a soft alpha matte. transformers.js
			// exposes it via the "image-segmentation" pipeline with the
			// Xenova/modnet model, which returns a mask as a RawImage.
			const created = await pipeline("image-segmentation", "Xenova/modnet");
			pipelineInstance = created;
			return created;
		})();
	}
	try {
		return (await pipelinePromise) as CutoutPipeline;
	} catch (error) {
		// Allow a retry after a failed initialisation instead of caching the
		// rejection forever.
		pipelinePromise = null;
		throw error;
	}
}

/** Convert a pipeline RawImage result into a transferable ImageBitmap. */
async function toImageBitmap(result: RawImageLike): Promise<ImageBitmap> {
	if (typeof result.toCanvas === "function") {
		return createImageBitmap(result.toCanvas());
	}

	// Fallback: construct the bitmap from raw RGBA data.
	if (result.data && result.width && result.height) {
		const canvas = new OffscreenCanvas(result.width, result.height);
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get 2d context for AI cutout output");
		}
		ctx.putImageData(
			new ImageData(
				new Uint8ClampedArray(result.data),
				result.width,
				result.height,
			),
			0,
			0,
		);
		return canvas.transferToImageBitmap();
	}

	throw new Error("AI cutout pipeline returned unexpected result format");
}

async function handleCutout({
	requestId,
	bitmap,
}: AiCutoutWorkerRequest): Promise<void> {
	try {
		const pipeline = await getPipeline();

		// Cap the input resolution for performance. The model works at
		// 1024px internally; larger inputs are downscaled before inference.
		const longEdge = Math.max(bitmap.width, bitmap.height);
		const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
		const targetWidth = Math.round(bitmap.width * scale);
		const targetHeight = Math.round(bitmap.height * scale);

		const inputCanvas = new OffscreenCanvas(targetWidth, targetHeight);
		const inputCtx = inputCanvas.getContext("2d");
		if (!inputCtx) {
			throw new Error("Failed to get 2d context for AI cutout input");
		}
		inputCtx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
		bitmap.close();

		const imageData = inputCtx.getImageData(0, 0, targetWidth, targetHeight);
		const { RawImage } = await loadTransformers();
		const input = new RawImage(
			new Uint8ClampedArray(imageData.data),
			targetWidth,
			targetHeight,
			4,
		);

		const result = await pipeline(input);
		const outputBitmap = await toImageBitmap(result);

		self.postMessage(
			{
				type: "cutout-complete",
				requestId,
				bitmap: outputBitmap,
				width: outputBitmap.width,
				height: outputBitmap.height,
			} satisfies AiCutoutWorkerResponse,
			{ transfer: [outputBitmap] },
		);
	} catch (error) {
		self.postMessage({
			type: "cutout-error",
			requestId,
			error: error instanceof Error ? error.message : "AI cutout failed",
		} satisfies AiCutoutWorkerResponse);
	}
}

self.onmessage = (event: MessageEvent<AiCutoutWorkerRequest>) => {
	const message = event.data;
	if (message.type === "cutout") {
		void handleCutout(message);
	}
};
