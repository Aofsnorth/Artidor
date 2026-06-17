import type { TCanvasSize } from "@/lib/project/types";

/**
 * Auto reframe: given a subject-tracking timeline (in normalized coordinates
 * 0-1) and a target aspect ratio, produce a per-frame transform that crops
 * and centers the subject.
 *
 * This is a pure utility — the actual subject detection happens elsewhere
 * (e.g. via mediabunny/motion analysis or MediaPipe).
 */
export interface SubjectFrame {
	timeSeconds: number;
	centerX: number; // 0..1
	centerY: number; // 0..1
	confidence: number; // 0..1
}

export interface ReframeOptions {
	sourceSize: TCanvasSize;
	targetSize: TCanvasSize;
	padding: number; // 0..1 padding around subject
	smoothing: number; // 0..1 temporal smoothing
	easing: "linear" | "ease-in-out" | "ease-out";
}

export interface ReframeFrame {
	timeSeconds: number;
	centerX: number;
	centerY: number;
	cropWidth: number; // pixels in source space
	cropHeight: number; // pixels in source space
	scale: number; // factor to apply to source rect to fit target
}

export function computeReframeFrames({
	frames,
	options,
}: {
	frames: SubjectFrame[];
	options: ReframeOptions;
}): ReframeFrame[] {
	if (frames.length === 0) return [];

	const targetRatio = options.targetSize.width / options.targetSize.height;
	const sourceRatio = options.sourceSize.width / options.sourceSize.height;

	// Determine crop rectangle size in source pixels
	let cropWidth: number;
	let cropHeight: number;
	if (targetRatio > sourceRatio) {
		cropHeight = options.sourceSize.height;
		cropWidth = cropHeight * targetRatio;
	} else {
		cropWidth = options.sourceSize.width;
		cropHeight = cropWidth / targetRatio;
	}

	const paddedWidth = cropWidth * (1 + options.padding);
	const paddedHeight = cropHeight * (1 + options.padding);
	cropWidth = Math.min(paddedWidth, options.sourceSize.width);
	cropHeight = Math.min(paddedHeight, options.sourceSize.height);

	const scale = options.targetSize.width / cropWidth;

	const smoothedCenters: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < frames.length; i++) {
		const cur = frames[i];
		const prev = i > 0 ? frames[i - 1] : null;
		const t = options.smoothing;
		if (prev) {
			smoothedCenters.push({
				x: prev.centerX * t + cur.centerX * (1 - t),
				y: prev.centerY * t + cur.centerY * (1 - t),
			});
		} else {
			smoothedCenters.push({ x: cur.centerX, y: cur.centerY });
		}
	}

	const halfW = cropWidth / 2 / options.sourceSize.width;
	const halfH = cropHeight / 2 / options.sourceSize.height;

	return frames.map((frame, i) => {
		const smoothed = smoothedCenters[i] ?? {
			x: frame.centerX,
			y: frame.centerY,
		};
		const centerX = Math.max(halfW, Math.min(1 - halfW, smoothed.x));
		const centerY = Math.max(halfH, Math.min(1 - halfH, smoothed.y));
		return {
			timeSeconds: frame.timeSeconds,
			centerX,
			centerY,
			cropWidth,
			cropHeight,
			scale,
		};
	});
}

/**
 * Convert reframe frames into a list of keyframes for the transform animation
 * channel of a video element.
 */
export function reframeFramesToKeyframes({
	reframes,
	canvasHeight,
}: {
	reframes: ReframeFrame[];
	canvasHeight: number;
}): Array<{ timeSeconds: number; positionX: number; positionY: number }> {
	return reframes.map((r) => {
		const positionX = (r.centerX - 0.5) * 100;
		const positionY = (r.centerY - 0.5) * canvasHeight;
		return {
			timeSeconds: r.timeSeconds,
			positionX,
			positionY,
		};
	});
}
