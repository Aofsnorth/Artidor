export interface CurvePoint {
	x: number;
	y: number;
}

export type CurveChannel = "rgb" | "red" | "green" | "blue";

/**
 * Build a 256-entry lookup table (LUT) from a list of curve points.
 * The curve is interpreted as piecewise linear interpolation between points.
 * Output values are clamped to [0, 255].
 */
export function buildCurveLut({
	points,
}: {
	points: CurvePoint[];
}): Uint8Array {
	const lut = new Uint8Array(256);
	if (points.length === 0) {
		for (let i = 0; i < 256; i++) lut[i] = i;
		return lut;
	}

	const sorted = [...points].sort((a, b) => a.x - b.x);

	for (let i = 0; i < 256; i++) {
		const x = i;
		let y = x;
		// Find the segment
		if (x <= sorted[0].x) {
			y = sorted[0].y;
		} else if (x >= sorted[sorted.length - 1].x) {
			y = sorted[sorted.length - 1].y;
		} else {
			for (let j = 0; j < sorted.length - 1; j++) {
				const p0 = sorted[j];
				const p1 = sorted[j + 1];
				if (x >= p0.x && x <= p1.x) {
					const t = (x - p0.x) / (p1.x - p0.x);
					y = p0.y + t * (p1.y - p0.y);
					break;
				}
			}
		}
		lut[i] = Math.max(0, Math.min(255, Math.round(y)));
	}

	return lut;
}

export const DEFAULT_CURVE: CurvePoint[] = [
	{ x: 0, y: 0 },
	{ x: 255, y: 255 },
];

export function applyCurveToValue({
	value,
	lut,
}: {
	value: number;
	lut: Uint8Array;
}): number {
	const v = Math.max(0, Math.min(255, Math.round(value)));
	return lut[v];
}

export function applyCurvesToRgb({
	r,
	g,
	b,
	rgbLut,
	redLut,
	greenLut,
	blueLut,
}: {
	r: number;
	g: number;
	b: number;
	rgbLut: Uint8Array;
	redLut: Uint8Array | null;
	greenLut: Uint8Array | null;
	blueLut: Uint8Array | null;
}): { r: number; g: number; b: number } {
	const rOut = redLut ? redLut[Math.max(0, Math.min(255, Math.round(r)))] : rgbLut[Math.max(0, Math.min(255, Math.round(r)))];
	const gOut = greenLut ? greenLut[Math.max(0, Math.min(255, Math.round(g)))] : rgbLut[Math.max(0, Math.min(255, Math.round(g)))];
	const bOut = blueLut ? blueLut[Math.max(0, Math.min(255, Math.round(b)))] : rgbLut[Math.max(0, Math.min(255, Math.round(b)))];
	return { r: rOut, g: gOut, b: bOut };
}
