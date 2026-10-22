/**
 * Person segmentation service — uses MediaPipe SelfieSegmenter to isolate
 * people in images/video frames. Runs fully in-browser (WASM), no server,
 * no telemetry. Models are fetched once from Google's CDN and cached by
 * the browser.
 *
 * Performance characteristics:
 *  - Lazy dynamic import: zero initial bundle cost. The MediaPipe WASM
 *    + model (~10MB) is only fetched when the user first invokes
 *    "cutout person".
 *  - Segmentation runs at 256px internally, mask is upscaled to source
 *    resolution. A single image segmentation takes ~100-300ms on a
 *    typical laptop.
 *  - All processing is off-main-thread when called from a Worker, or
 *    non-blocking when called from the main thread (WASM).
 */

export type SegmentationSource =
	| HTMLImageElement
	| HTMLCanvasElement
	| HTMLVideoElement
	| ImageBitmap
	| ImageData;

export interface SegmentationResult {
	/** RGBA canvas where background pixels are transparent (alpha=0). */
	canvas: HTMLCanvasElement | OffscreenCanvas;
	/** Width of the output canvas (matches source). */
	width: number;
	/** Height of the output canvas (matches source). */
	height: number;
}

let segmenterInstance: unknown | null = null;
let segmenterPromise: Promise<unknown> | null = null;

/**
 * Lazily load and initialise the MediaPipe SelfieSegmenter.
 * The WASM fileset and model are fetched on first call and cached
 * by the browser. Subsequent calls return the cached instance.
 */
async function getSegmenter(): Promise<unknown> {
	if (segmenterInstance) return segmenterInstance;
	if (segmenterPromise) return segmenterPromise;

	segmenterPromise = (async () => {
		const vision = await import("@mediapipe/tasks-vision");
		const filesetResolver = await vision.FilesetResolver.forVisionTasks(
			"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
		);
		const segmenter = await vision.ImageSegmenter.createFromOptions(
			filesetResolver,
			{
				baseOptions: {
					modelAssetPath:
						"https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",
					delegate: "GPU",
				},
				outputCategoryMask: true,
				outputConfidenceMasks: false,
			},
		);
		segmenterInstance = segmenter;
		return segmenter;
	})();

	return segmenterPromise;
}

/**
 * Run person segmentation on an image source and return a transparent
 * canvas where only the person pixels are visible.
 *
 * @param source - An HTMLImageElement, HTMLCanvasElement, HTMLVideoElement,
 *                 ImageBitmap, or ImageData.
 * @param width  - Output canvas width (defaults to source width).
 * @param height - Output canvas height (defaults to source height).
 */
export async function segmentPerson({
	source,
	width,
	height,
}: {
	source: SegmentationSource;
	width?: number;
	height?: number;
}): Promise<SegmentationResult> {
	const segmenter = (await getSegmenter()) as {
		segment: (input: SegmentationSource) => Promise<{
			categoryMask?: {
				getAsUint8Array: () => Uint8Array;
				readonly width: number;
				readonly height: number;
				close: () => void;
			} | null;
		}>;
	};

	const srcWidth =
		width ??
		(source as HTMLImageElement).naturalWidth ??
		(source as HTMLCanvasElement).width ??
		(source as HTMLVideoElement).videoWidth ??
		256;
	const srcHeight =
		height ??
		(source as HTMLImageElement).naturalHeight ??
		(source as HTMLCanvasElement).height ??
		(source as HTMLVideoElement).videoHeight ??
		256;

	// Run segmentation — MediaPipe handles resizing internally.
	const result = await segmenter.segment(source);
	const mask = result.categoryMask;
	if (!mask) {
		throw new Error("Person segmentation returned no category mask");
	}

	// @mediapipe/tasks-vision 0.10.35 exposes MPMask.getAsUint8Array(), not
	// getViews(). The mask is owned by the underlying C++ task, so release it
	// as soon as the pixel data has been copied out.
	let maskData: Uint8Array | null = null;
	let maskW = 0;
	let maskH = 0;
	try {
		maskData = mask.getAsUint8Array();
		maskW = mask.width;
		maskH = mask.height;
	} finally {
		mask.close();
	}
	if (!maskData) {
		throw new Error("Person segmentation mask has no pixel data");
	}

	// Draw the original image to a canvas, then apply the mask as alpha.
	const canvas = document.createElement("canvas");
	canvas.width = srcWidth;
	canvas.height = srcHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2d context for segmentation output");

	// Draw the source image.
	ctx.drawImage(source as CanvasImageSource, 0, 0, srcWidth, srcHeight);

	// Read the image data and apply the mask.
	const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
	const pixels = imageData.data;

	// The category mask is a 1-channel Uint8Array at the model's internal
	// resolution. Map it to the output resolution using its actual size.
	const scaleX = maskW / srcWidth;
	const scaleY = maskH / srcHeight;

	for (let y = 0; y < srcHeight; y++) {
		for (let x = 0; x < srcWidth; x++) {
			const maskX = Math.min(maskW - 1, Math.floor(x * scaleX));
			const maskY = Math.min(maskH - 1, Math.floor(y * scaleY));
			const maskVal = maskData[maskY * maskW + maskX];
			const pixelIdx = (y * srcWidth + x) * 4;
			// categoryMask: 0 = background, 1 = person.
			// Scale to 0-255 alpha.
			pixels[pixelIdx + 3] = maskVal > 0 ? 255 : 0;
		}
	}

	ctx.putImageData(imageData, 0, 0);

	return { canvas, width: srcWidth, height: srcHeight };
}

/**
 * Release the segmenter instance and free WASM memory.
 * Call this when background removal is no longer needed (e.g. on
 * editor unmount) to release ~10MB of WASM heap.
 */
export function releasePersonSegmenter(): void {
	if (segmenterInstance) {
		const segmenter = segmenterInstance as { close?: () => void };
		segmenter.close?.();
		segmenterInstance = null;
		segmenterPromise = null;
	}
}
