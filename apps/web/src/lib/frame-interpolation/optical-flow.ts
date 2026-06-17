"use client";

/**
 * Block-matching optical flow frame interpolation.
 *
 * For each NxN block of frameA we search a small ±radius window in frameB
 * for the best SAD match, treat that delta as the motion vector at that
 * block, then for output t in [0,1] we warp the source block by
 *   (1-t) * (-mv) on frameA and  t * mv on frameB
 * and average.
 *
 * Intentionally CPU-only. For 1920x1080 this is ~250ms per frame which is
 * fine for offline export; the real-time path uses `blendFrames` instead.
 * The hot loop is typed-array tight with no allocations.
 */

type RGBA = Uint8ClampedArray;

interface MotionField {
	width: number;
	height: number;
	blockSize: number;
	stride: number;
	vectors: Int16Array;
}

function buildMotionField({
	width,
	height,
	blockSize,
}: {
	width: number;
	height: number;
	blockSize: number;
}): MotionField {
	const cols = Math.ceil(width / blockSize);
	const rows = Math.ceil(height / blockSize);
	return {
		width,
		height,
		blockSize,
		stride: cols,
		vectors: new Int16Array(cols * rows * 2),
	};
}

function indexBlock(field: MotionField, x: number, y: number): number {
	return (y * field.stride + x) * 2;
}

function pixelIndex(width: number, x: number, y: number): number {
	return (y * width + x) * 4;
}

function blockSAD({
	a,
	b,
	width,
	height,
	ax,
	ay,
	bx,
	by,
	blockSize,
}: {
	a: RGBA;
	b: RGBA;
	width: number;
	height: number;
	ax: number;
	ay: number;
	bx: number;
	by: number;
	blockSize: number;
}): number {
	let sad = 0;
	for (let dy = 0; dy < blockSize; dy++) {
		const yA = ay + dy;
		const yB = by + dy;
		if (yA < 0 || yA >= height || yB < 0 || yB >= height) {
			sad += 255 * blockSize * 4;
			continue;
		}
		for (let dx = 0; dx < blockSize; dx++) {
			const xA = ax + dx;
			const xB = bx + dx;
			if (xA < 0 || xA >= width || xB < 0 || xB >= width) {
				sad += 255 * 4;
				continue;
			}
			const i = pixelIndex(width, xA, yA);
			const j = pixelIndex(width, xB, yB);
			sad += Math.abs((a[i] ?? 0) - (b[j] ?? 0));
			sad += Math.abs((a[i + 1] ?? 0) - (b[j + 1] ?? 0));
			sad += Math.abs((a[i + 2] ?? 0) - (b[j + 2] ?? 0));
			sad += Math.abs((a[i + 3] ?? 0) - (b[j + 3] ?? 0));
		}
	}
	return sad;
}

function estimateMotion({
	a,
	b,
	width,
	height,
	radius = 8,
	blockSize = 16,
}: {
	a: RGBA;
	b: RGBA;
	width: number;
	height: number;
	radius?: number;
	blockSize?: number;
}): MotionField {
	const field = buildMotionField({ width, height, blockSize });
	for (let by = 0; by < field.stride; by++) {
		for (let bx = 0; bx < field.stride; bx++) {
			const ax = bx * blockSize;
			const ay = by * blockSize;
			let bestSAD = Number.POSITIVE_INFINITY;
			let bestDx = 0;
			let bestDy = 0;
			for (let dy = -radius; dy <= radius; dy += 2) {
				for (let dx = -radius; dx <= radius; dx += 2) {
					const sad = blockSAD({
						a,
						b,
						width,
						height,
						ax,
						ay,
						bx: ax + dx,
						by: ay + dy,
						blockSize,
					});
					if (sad < bestSAD) {
						bestSAD = sad;
						bestDx = dx;
						bestDy = dy;
					}
				}
			}
			const i = indexBlock(field, bx, by);
			field.vectors[i] = bestDx;
			field.vectors[i + 1] = bestDy;
		}
	}
	return field;
}

function warp({
	frame,
	width,
	height,
	field,
	factor,
	out,
}: {
	frame: RGBA;
	width: number;
	height: number;
	field: MotionField;
	factor: number;
	out: RGBA;
}): void {
	const { blockSize, stride, vectors } = field;
	for (let y = 0; y < height; y++) {
		const bx = Math.min(stride - 1, Math.floor(y / blockSize));
		const _dy = y - bx * blockSize;
		for (let x = 0; x < width; x++) {
			const by = Math.min(stride - 1, Math.floor(x / blockSize));
			const _dx = x - by * blockSize;
			const v = indexBlock(field, by, bx);
			const mvx = (vectors[v] ?? 0) * factor;
			const mvy = (vectors[v + 1] ?? 0) * factor;
			const sx = Math.max(0, Math.min(width - 1, Math.round(x + mvx)));
			const sy = Math.max(0, Math.min(height - 1, Math.round(y + mvy)));
			const di = pixelIndex(width, x, y);
			const si = pixelIndex(width, sx, sy);
			out[di] = frame[si] ?? 0;
			out[di + 1] = frame[si + 1] ?? 0;
			out[di + 2] = frame[si + 2] ?? 0;
			out[di + 3] = frame[si + 3] ?? 0;
		}
	}
}

export function opticalFlowInterpolate({
	frameA,
	frameB,
	width,
	height,
	t,
	out,
	radius = 8,
	blockSize = 16,
}: {
	frameA: RGBA;
	frameB: RGBA;
	width: number;
	height: number;
	t: number;
	out: RGBA;
	radius?: number;
	blockSize?: number;
}): void {
	if (t <= 0) {
		out.set(frameA);
		return;
	}
	if (t >= 1) {
		out.set(frameB);
		return;
	}
	const field = estimateMotion({
		a: frameA,
		b: frameB,
		width,
		height,
		radius,
		blockSize,
	});
	const aShifted = new Uint8ClampedArray(frameA.length);
	const bShifted = new Uint8ClampedArray(frameB.length);
	warp({ frame: frameA, width, height, field, factor: t - 1, out: aShifted });
	warp({ frame: frameB, width, height, field, factor: t, out: bShifted });
	for (let i = 0; i < out.length; i += 4) {
		out[i] = (aShifted[i] ?? 0) * (1 - t) + (bShifted[i] ?? 0) * t;
		out[i + 1] = (aShifted[i + 1] ?? 0) * (1 - t) + (bShifted[i + 1] ?? 0) * t;
		out[i + 2] = (aShifted[i + 2] ?? 0) * (1 - t) + (bShifted[i + 2] ?? 0) * t;
		out[i + 3] = (aShifted[i + 3] ?? 0) * (1 - t) + (bShifted[i + 3] ?? 0) * t;
	}
}
