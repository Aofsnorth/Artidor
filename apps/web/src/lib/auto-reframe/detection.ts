import { TICKS_PER_SECOND } from "@/lib/wasm";
import type { SubjectFrame } from "./index-impl";

/**
 * Detect subject center over time using simple frame-difference analysis.
 * The result is a per-frame center point (0..1 normalized) that can be fed
 * to the auto-reframe pipeline.
 *
 * This is a fallback method that does not require ML — it picks the region
 * with the most motion energy, which usually corresponds to the subject.
 */
export interface SubjectDetectionOptions {
	sampleInterval: number; // seconds between samples
	regionSize: number; // pixels — sample cell size for the energy map
}

export async function detectSubjectCenter({
	videoUrl,
	duration,
	options,
}: {
	videoUrl: string;
	duration: number;
	options?: Partial<SubjectDetectionOptions>;
}): Promise<SubjectFrame[]> {
	const opts: SubjectDetectionOptions = {
		sampleInterval: 0.5,
		regionSize: 64,
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
			{
				once: true,
			},
		);
	});

	const samples: number = Math.max(
		2,
		Math.ceil(duration / opts.sampleInterval),
	);
	const tmpCanvas = document.createElement("canvas");
	const tmpW = 320;
	const tmpH = Math.round(320 * (video.videoHeight / video.videoWidth));
	tmpCanvas.width = tmpW;
	tmpCanvas.height = tmpH;
	const ctx = tmpCanvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return [];

	const cellW = Math.max(8, Math.floor(tmpW / (tmpW / opts.regionSize)));
	const cellH = Math.max(8, Math.floor(tmpH / (tmpH / opts.regionSize)));
	const cols = Math.floor(tmpW / cellW);
	const rows = Math.floor(tmpH / cellH);

	const frames: SubjectFrame[] = [];
	let prevEnergy: Float32Array | null = null;

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
		const imageData = ctx.getImageData(0, 0, tmpW, tmpH);
		const data = imageData.data;

		const energy = new Float32Array(cols * rows);
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const startX = c * cellW;
				const startY = r * cellH;
				let sum = 0;
				let count = 0;
				for (let y = 0; y < cellH; y += 2) {
					for (let x = 0; x < cellW; x += 2) {
						const idx = ((startY + y) * tmpW + (startX + x)) * 4;
						const rC = data[idx] ?? 0;
						const gC = data[idx + 1] ?? 0;
						const bC = data[idx + 2] ?? 0;
						sum += 0.299 * rC + 0.587 * gC + 0.114 * bC;
						count++;
					}
				}
				energy[r * cols + c] = sum / Math.max(1, count);
			}
		}

		if (prevEnergy) {
			// Compute motion energy as difference vs previous
			const motion = new Float32Array(energy.length);
			for (let k = 0; k < energy.length; k++) {
				motion[k] = Math.abs(energy[k] - (prevEnergy[k] ?? 0));
			}
			// Find weighted center of mass of motion
			let totalWeight = 0;
			let sumX = 0;
			let sumY = 0;
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const w = motion[r * cols + c] ?? 0;
					sumX += c * w;
					sumY += r * w;
					totalWeight += w;
				}
			}
			if (totalWeight > 0) {
				const cx = (sumX / totalWeight + 0.5) / cols;
				const cy = (sumY / totalWeight + 0.5) / rows;
				frames.push({
					timeSeconds: t,
					centerX: Math.max(0, Math.min(1, cx)),
					centerY: Math.max(0, Math.min(1, cy)),
					confidence: Math.min(1, totalWeight / 5000),
				});
			}
		} else {
			// First frame — use the center of the brightest region
			let maxIdx = 0;
			let maxVal = -1;
			for (let k = 0; k < energy.length; k++) {
				if (energy[k] > maxVal) {
					maxVal = energy[k];
					maxIdx = k;
				}
			}
			const c = maxIdx % cols;
			const r = Math.floor(maxIdx / cols);
			frames.push({
				timeSeconds: t,
				centerX: (c + 0.5) / cols,
				centerY: (r + 0.5) / rows,
				confidence: 0.5,
			});
		}
		prevEnergy = energy;
	}

	return frames;
}

export function subjectFramesToKeyframeTimes({
	frames,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: fps reserved for future frame-time conversion
	fps,
}: {
	frames: SubjectFrame[];
	fps: number;
}): Array<{ ticks: number; centerX: number; centerY: number }> {
	return frames.map((f) => ({
		ticks: Math.round(f.timeSeconds * TICKS_PER_SECOND),
		centerX: f.centerX,
		centerY: f.centerY,
	}));
}
