/** Downsampled RGBA frame data consumed by scope renderers and statistics. */
export interface ScopeSampleData {
	pixels: Uint8ClampedArray;
	columns: number;
	rows: number;
	width: number;
	height: number;
}

/** Frame statistics shown beside the active scope without retaining source media. */
export interface ScopeStatistics {
	lumaLow: number;
	lumaAverage: number;
	lumaHigh: number;
	redAverage: number;
	greenAverage: number;
	blueAverage: number;
	chromaAverage: number;
	chromaPeak: number;
	sampleCount: number;
	sourceWidth: number;
	sourceHeight: number;
	sampleColumns: number;
	sampleRows: number;
}

const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
const CB_DIVISOR = 1.8556;
const CR_DIVISOR = 1.5748;
const VECTOR_COMPONENT_LIMIT = 0.5;

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

/** Returns normalized Rec. 709 luma for one 8-bit RGB sample. */
export function getLuma(red: number, green: number, blue: number): number {
	return (red * LUMA_RED + green * LUMA_GREEN + blue * LUMA_BLUE) / 255;
}

/** Converts one 8-bit RGB sample to normalized blue/red chroma components. */
export function getChroma(red: number, green: number, blue: number) {
	const normalizedRed = red / 255;
	const normalizedGreen = green / 255;
	const normalizedBlue = blue / 255;
	const luma =
		normalizedRed * LUMA_RED +
		normalizedGreen * LUMA_GREEN +
		normalizedBlue * LUMA_BLUE;

	return {
		cb: (normalizedBlue - luma) / CB_DIVISOR,
		cr: (normalizedRed - luma) / CR_DIVISOR,
	};
}

/**
 * Summarizes a downsampled frame for UI readouts.
 * Truncated pixel buffers are accepted and only complete RGBA samples are read.
 */
export function analyzeScopeSample(sample: ScopeSampleData): ScopeStatistics {
	const expectedPixels = sample.columns * sample.rows;
	const availablePixels = Math.floor(sample.pixels.length / 4);
	const sampleCount = Math.min(expectedPixels, availablePixels);
	let lumaLow = 1;
	let lumaHigh = 0;
	let lumaTotal = 0;
	let redTotal = 0;
	let greenTotal = 0;
	let blueTotal = 0;
	let chromaTotal = 0;
	let chromaPeak = 0;

	for (let pixelIndex = 0; pixelIndex < sampleCount; pixelIndex += 1) {
		const dataIndex = pixelIndex * 4;
		const red = sample.pixels[dataIndex] ?? 0;
		const green = sample.pixels[dataIndex + 1] ?? 0;
		const blue = sample.pixels[dataIndex + 2] ?? 0;
		const luma = getLuma(red, green, blue);
		const { cb, cr } = getChroma(red, green, blue);
		const chroma = clamp(
			(Math.hypot(cb, cr) / VECTOR_COMPONENT_LIMIT) * 100,
			0,
			100,
		);

		lumaLow = Math.min(lumaLow, luma);
		lumaHigh = Math.max(lumaHigh, luma);
		lumaTotal += luma;
		redTotal += red;
		greenTotal += green;
		blueTotal += blue;
		chromaTotal += chroma;
		chromaPeak = Math.max(chromaPeak, chroma);
	}

	const divisor = sampleCount || 1;
	return {
		lumaLow: (sampleCount ? lumaLow : 0) * 100,
		lumaAverage: (lumaTotal / divisor) * 100,
		lumaHigh: lumaHigh * 100,
		redAverage: redTotal / divisor,
		greenAverage: greenTotal / divisor,
		blueAverage: blueTotal / divisor,
		chromaAverage: chromaTotal / divisor,
		chromaPeak,
		sampleCount,
		sourceWidth: sample.width,
		sourceHeight: sample.height,
		sampleColumns: sample.columns,
		sampleRows: sample.rows,
	};
}

/** Maps an RGB sample into the scope circle and clamps outlying chroma. */
export function getVectorscopePoint({
	red,
	green,
	blue,
	centerX,
	centerY,
	radius,
}: {
	red: number;
	green: number;
	blue: number;
	centerX: number;
	centerY: number;
	radius: number;
}) {
	const { cb, cr } = getChroma(red, green, blue);
	let offsetX = (cb / VECTOR_COMPONENT_LIMIT) * radius;
	let offsetY = (-cr / VECTOR_COMPONENT_LIMIT) * radius;
	const distance = Math.hypot(offsetX, offsetY);

	if (distance > radius) {
		const scale = radius / distance;
		offsetX *= scale;
		offsetY *= scale;
	}

	return {
		x: centerX + offsetX,
		y: centerY + offsetY,
	};
}

/** Divides the available plot width into three non-overlapping RGB lanes. */
export function getParadeChannelBounds({
	channel,
	left,
	width,
	gap,
}: {
	channel: 0 | 1 | 2;
	left: number;
	width: number;
	gap: number;
}) {
	const safeWidth = Math.max(0, width);
	const safeGap = Math.max(0, Math.min(gap, safeWidth / 2));
	const channelWidth = (safeWidth - safeGap * 2) / 3;
	return {
		left: left + channel * (channelWidth + safeGap),
		width: channelWidth,
	};
}
