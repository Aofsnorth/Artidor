/**
 * 2D video stabilization: estimate per-frame jitter and produce a
 * smoothing transform path that, when applied, removes the high-frequency
 * shake while preserving the low-frequency intentional motion.
 *
 * This implementation uses a simple optical-flow estimation on downscaled
 * frames and a Gaussian-weighted moving average to smooth the path.
 */

export interface StabilizationOptions {
	smoothingStrength: number; // 0..1 — higher removes more jitter
	maxCropRatio: number; // 0..0.2 — max extra zoom used to cover stabilized edges
}

export interface StabilizationFrame {
	timeSeconds: number;
	offsetX: number; // pixels to translate to stabilize
	offsetY: number;
}

export interface StabilizationResult {
	frames: StabilizationFrame[];
	originalWidth: number;
	originalHeight: number;
	croppedWidth: number;
	croppedHeight: number;
}

export async function stabilizeVideo({
	videoUrl,
	duration,
	sampleFps = 15,
	options,
}: {
	videoUrl: string;
	duration: number;
	sampleFps?: number;
	options?: Partial<StabilizationOptions>;
}): Promise<StabilizationResult> {
	const opts: StabilizationOptions = {
		smoothingStrength: 0.6,
		maxCropRatio: 0.1,
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
	if (width === 0 || height === 0) {
		return {
			frames: [],
			originalWidth: 0,
			originalHeight: 0,
			croppedWidth: 0,
			croppedHeight: 0,
		};
	}

	const samples: number = Math.max(2, Math.ceil(duration * sampleFps));
	const tmpCanvas = document.createElement("canvas");
	const tmpW = 128;
	const tmpH = Math.round(128 * (height / width));
	tmpCanvas.width = tmpW;
	tmpCanvas.height = tmpH;
	const ctx = tmpCanvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) {
		return {
			frames: [],
			originalWidth: width,
			originalHeight: height,
			croppedWidth: width,
			croppedHeight: height,
		};
	}

	const offsets: Array<{ x: number; y: number }> = [];
	let prevGray: Float32Array | null = null;

	for (let i = 0; i < samples; i++) {
		const t = Math.min(
			duration - 0.05,
			(i * duration) / Math.max(1, samples - 1),
		);
		video.currentTime = t;
		await new Promise<void>((resolve) => {
			video.addEventListener("seeked", () => resolve(), { once: true });
		});
		ctx.drawImage(video, 0, 0, tmpW, tmpH);
		const img = ctx.getImageData(0, 0, tmpW, tmpH);
		const gray = rgbToGray(img.data, tmpW, tmpH);

		if (prevGray) {
			const motion = estimateTranslation(prevGray, gray, tmpW, tmpH);
			const previous = offsets[i - 1] ?? { x: 0, y: 0 };
			offsets.push({ x: previous.x + motion.x, y: previous.y + motion.y });
		} else {
			offsets.push({ x: 0, y: 0 });
		}
		prevGray = gray;
	}

	// Smooth with a moving average. Window = samples * strength.
	const windowSize = Math.max(3, Math.floor(samples * opts.smoothingStrength));
	const smoothed: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < offsets.length; i++) {
		let sumX = 0;
		let sumY = 0;
		let count = 0;
		for (
			let j = Math.max(0, i - windowSize);
			j <= Math.min(offsets.length - 1, i + windowSize);
			j++
		) {
			sumX += offsets[j]?.x ?? 0;
			sumY += offsets[j]?.y ?? 0;
			count++;
		}
		smoothed.push({ x: sumX / count, y: sumY / count });
	}

	// The compensation is the negative of the smoothed offset
	const frames: StabilizationFrame[] = [];
	for (let i = 0; i < smoothed.length; i++) {
		const off = smoothed[i] ?? { x: 0, y: 0 };
		frames.push({
			timeSeconds: (i * duration) / Math.max(1, samples - 1),
			offsetX: -off.x,
			offsetY: -off.y,
		});
	}

	const croppedWidth = Math.round(width * (1 - opts.maxCropRatio));
	const croppedHeight = Math.round(height * (1 - opts.maxCropRatio));

	return {
		frames,
		originalWidth: width,
		originalHeight: height,
		croppedWidth,
		croppedHeight,
	};
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

function estimateTranslation(
	prev: Float32Array,
	curr: Float32Array,
	width: number,
	height: number,
): { x: number; y: number } {
	// Simple block-matching: try offsets in [-2..2] px and find the minimum SAD.
	let bestX = 0;
	let bestY = 0;
	let bestSAD = Number.POSITIVE_INFINITY;
	for (let dy = -3; dy <= 3; dy++) {
		for (let dx = -3; dx <= 3; dx++) {
			let sad = 0;
			let count = 0;
			for (let y = 8; y < height - 8; y += 2) {
				for (let x = 8; x < width - 8; x += 2) {
					const a = prev[y * width + x] ?? 0;
					const b = curr[(y + dy) * width + (x + dx)] ?? 0;
					sad += Math.abs(a - b);
					count++;
				}
			}
			const normalized = sad / Math.max(1, count);
			if (normalized < bestSAD) {
				bestSAD = normalized;
				bestX = dx;
				bestY = dy;
			}
		}
	}
	return { x: bestX, y: bestY };
}
