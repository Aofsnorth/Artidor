/**
 * KCF-inspired object tracking on downscaled grayscale frames.
 * The output is a sequence of bounding boxes the user can attach text/effects
 * to. It's a simplified version of Kernelized Correlation Filter tracking
 * (Henriques et al. 2015) using normalized cross-correlation over a template.
 *
 * The math is heavy on the CPU; we work on 96x96 templates and use a small
 * search region.
 */

export interface TrackingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TrackingResult {
	frameIndex: number;
	timeSeconds: number;
	box: TrackingBox;
	confidence: number;
}

export interface TrackingOptions {
	templateSize?: number; // px
	searchPadding?: number; // px around the previous box
	learningRate?: number; // 0..1 — higher = more responsive
}

export async function trackObject({
	videoUrl,
	duration,
	initialBox,
	options,
}: {
	videoUrl: string;
	duration: number;
	initialBox: TrackingBox;
	options?: Partial<TrackingOptions>;
}): Promise<TrackingResult[]> {
	const opts: Required<TrackingOptions> = {
		templateSize: 64,
		searchPadding: 32,
		learningRate: 0.1,
		...options,
	};

	const video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	video.src = videoUrl;

	await new Promise<void>((resolve, reject) => {
		video.addEventListener("loadeddata", () => resolve(), { once: true });
		video.addEventListener(
			"error",
			() => reject(new Error("Video load failed")),
			{ once: true },
		);
	});

	const width = video.videoWidth;
	const height = video.videoHeight;
	if (width === 0 || height === 0) return [];

	const sampleFps = 10;
	const samples = Math.max(2, Math.ceil(duration * sampleFps));

	const tmpCanvas = document.createElement("canvas");
	tmpCanvas.width = width;
	tmpCanvas.height = height;
	const ctx = tmpCanvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return [];

	const results: TrackingResult[] = [];
	const template = await extractTemplate({
		video,
		ctx,
		canvas: tmpCanvas,
		timeSeconds: 0,
		box: clampBox(initialBox, width, height),
		templateSize: opts.templateSize,
	});

	for (let i = 0; i < samples; i++) {
		const t = Math.min(
			duration - 0.05,
			(i * duration) / Math.max(1, samples - 1),
		);
		video.currentTime = t;
		await new Promise<void>((resolve) => {
			video.addEventListener("seeked", () => resolve(), { once: true });
		});
		ctx.drawImage(video, 0, 0, width, height);
		const gray = rgbToGray(ctx.getImageData(0, 0, width, height).data, width, height);

		const prevBox = results.length > 0 ? results[results.length - 1]?.box : initialBox;
		const newBox = searchTemplate({
			image: gray,
			imageWidth: width,
			imageHeight: height,
			template,
			searchBox: expandBox(prevBox, opts.searchPadding, width, height),
			templateSize: opts.templateSize,
		});

		results.push({
			frameIndex: i,
			timeSeconds: t,
			box: newBox,
			confidence: 0,
		});

		// Update template
		const newTemplate = extractSubImage(
			gray,
			width,
			height,
			clampBox(newBox, width, height),
			opts.templateSize,
		);
		for (let k = 0; k < template.length; k++) {
			template[k] = template[k]! * (1 - opts.learningRate) + newTemplate[k]! * opts.learningRate;
		}
	}

	return results;
}

function clampBox(box: TrackingBox, w: number, h: number): TrackingBox {
	return {
		x: Math.max(0, Math.min(w - 1, box.x)),
		y: Math.max(0, Math.min(h - 1, box.y)),
		width: Math.max(1, Math.min(w, box.width)),
		height: Math.max(1, Math.min(h, box.height)),
	};
}

function expandBox(
	box: TrackingBox,
	padding: number,
	w: number,
	h: number,
): TrackingBox {
	return clampBox(
		{
			x: box.x - padding,
			y: box.y - padding,
			width: box.width + padding * 2,
			height: box.height + padding * 2,
		},
		w,
		h,
	);
}

function rgbToGray(
	data: Uint8ClampedArray,
	width: number,
	height: number,
): Float32Array {
	const gray = new Float32Array(width * height);
	for (let i = 0; i < width * height; i++) {
		const idx = i * 4;
		const r = data[idx] ?? 0;
		const g = data[idx + 1] ?? 0;
		const b = data[idx + 2] ?? 0;
		gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
	}
	return gray;
}

async function extractTemplate({
	video,
	ctx,
	canvas,
	timeSeconds,
	box,
	templateSize,
}: {
	video: HTMLVideoElement;
	ctx: CanvasRenderingContext2D;
	canvas: HTMLCanvasElement;
	timeSeconds: number;
	box: TrackingBox;
	templateSize: number;
}): Promise<Float32Array> {
	video.currentTime = timeSeconds;
	await new Promise<void>((resolve) => {
		video.addEventListener("seeked", () => resolve(), { once: true });
	});
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	const gray = rgbToGray(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
	return extractSubImage(gray, canvas.width, canvas.height, box, templateSize);
}

function extractSubImage(
	gray: Float32Array,
	width: number,
	_height: number,
	box: TrackingBox,
	templateSize: number,
): Float32Array {
	const out = new Float32Array(templateSize * templateSize);
	const boxWidth = Math.max(1, box.width);
	const boxHeight = Math.max(1, box.height);
	for (let y = 0; y < templateSize; y++) {
		for (let x = 0; x < templateSize; x++) {
			const srcX = Math.floor(box.x + (x / templateSize) * boxWidth);
			const srcY = Math.floor(box.y + (y / templateSize) * boxHeight);
			const idx = Math.max(0, Math.min(gray.length - 1, srcY * width + srcX));
			out[y * templateSize + x] = gray[idx] ?? 0;
		}
	}
	// Normalize
	const mean = out.reduce((a, b) => a + b, 0) / out.length;
	for (let i = 0; i < out.length; i++) {
		out[i] = (out[i] ?? 0) - mean;
	}
	return out;
}

function searchTemplate({
	image,
	imageWidth,
	imageHeight,
	template,
	searchBox,
	templateSize,
}: {
	image: Float32Array;
	imageWidth: number;
	imageHeight: number;
	template: Float32Array;
	searchBox: TrackingBox;
	templateSize: number;
}): TrackingBox {
	let bestX = 0;
	let bestY = 0;
	let bestScore = -1;
	const stride = 2;
	for (let y = 0; y <= searchBox.height - templateSize / searchBox.width * searchBox.width; y += stride) {
		for (let x = 0; x <= searchBox.width - templateSize; x += stride) {
			const score = correlationAt({
				image,
				imageWidth,
				imageHeight,
				template,
				boxX: searchBox.x + x,
				boxY: searchBox.y + y,
				templateSize,
			});
			if (score > bestScore) {
				bestScore = score;
				bestX = x;
				bestY = y;
			}
		}
	}
	// Map back to original box dimensions
	const scaleX = searchBox.width / templateSize;
	const scaleY = searchBox.height / templateSize;
	return {
		x: searchBox.x + bestX * scaleX,
		y: searchBox.y + bestY * scaleY,
		width: templateSize * scaleX,
		height: templateSize * scaleY,
	};
}

function correlationAt({
	image,
	imageWidth,
	template,
	boxX,
	boxY,
	templateSize,
}: {
	image: Float32Array;
	imageWidth: number;
	imageHeight: number;
	template: Float32Array;
	boxX: number;
	boxY: number;
	templateSize: number;
}): number {
	let sum = 0;
	let sumSq = 0;
	for (let y = 0; y < templateSize; y++) {
		for (let x = 0; x < templateSize; x++) {
			const srcX = Math.floor(boxX + x);
			const srcY = Math.floor(boxY + y);
			const idx = Math.max(0, Math.min(image.length - 1, srcY * imageWidth + srcX));
			const v = image[idx] ?? 0;
			sum += v * (template[y * templateSize + x] ?? 0);
			sumSq += v * v;
		}
	}
	return sum / Math.max(1, Math.sqrt(sumSq));
}
