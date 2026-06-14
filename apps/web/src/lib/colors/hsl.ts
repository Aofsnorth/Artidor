export interface HslColor {
	h: number;
	s: number;
	l: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const clean = hex.replace(/^#/, "");
	if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
	const r = Number.parseInt(clean.slice(0, 2), 16);
	const g = Number.parseInt(clean.slice(2, 4), 16);
	const b = Number.parseInt(clean.slice(4, 6), 16);
	return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number): string => {
		const clamped = Math.max(0, Math.min(255, Math.round(n)));
		return clamped.toString(16).padStart(2, "0");
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;
	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rNorm:
				h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
				break;
			case gNorm:
				h = (bNorm - rNorm) / d + 2;
				break;
			case bNorm:
				h = (rNorm - gNorm) / d + 4;
				break;
		}
		h *= 60;
	}
	return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const sNorm = s / 100;
	const lNorm = l / 100;
	const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lNorm - c / 2;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

/**
 * HSL adjustment ranges in degrees and percentage points.
 */
export interface HslAdjustment {
	hueShift: number;
	saturation: number;
	luminance: number;
}

export function applyHslToHsl(
	color: HslColor,
	adjustment: HslAdjustment,
): HslColor {
	let h = color.h + adjustment.hueShift;
	while (h < 0) h += 360;
	while (h >= 360) h -= 360;
	const s = Math.max(0, Math.min(100, color.s + adjustment.saturation));
	const l = Math.max(0, Math.min(100, color.l + adjustment.luminance));
	return { h, s, l };
}

export const HSL_COLOR_BANDS = [
	{ id: "red", name: "Red", hueCenter: 0, range: 30 },
	{ id: "orange", name: "Orange", hueCenter: 30, range: 30 },
	{ id: "yellow", name: "Yellow", hueCenter: 60, range: 30 },
	{ id: "green", name: "Green", hueCenter: 120, range: 60 },
	{ id: "aqua", name: "Aqua", hueCenter: 180, range: 30 },
	{ id: "blue", name: "Blue", hueCenter: 240, range: 60 },
	{ id: "purple", name: "Purple", hueCenter: 280, range: 30 },
	{ id: "magenta", name: "Magenta", hueCenter: 320, range: 30 },
] as const;

export type HslBandId = (typeof HSL_COLOR_BANDS)[number]["id"];

/**
 * Compute the band weight for a given hue (0-1 when inside the band, falling off outside).
 */
export function bandWeight({
	hue,
	band,
}: {
	hue: number;
	band: (typeof HSL_COLOR_BANDS)[number];
}): number {
	const distance = Math.min(
		Math.abs(hue - band.hueCenter),
		360 - Math.abs(hue - band.hueCenter),
	);
	if (distance >= band.range) return 0;
	const t = distance / band.range;
	// Smooth falloff
	return 1 - t * t;
}
