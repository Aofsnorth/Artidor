import { converter, formatHex, formatHex8, parse, type Rgb } from "culori";

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv";

const toRgb = converter("rgb");
const toHsv = converter("hsv");
const toHsl = converter("hsl");

export function hexToHsv({ hex }: { hex: string }): [number, number, number] {
	const color = toHsv(`#${hex}`);
	if (!color) return [0, 0, 0];
	return [color.h ?? 0, color.s ?? 0, color.v ?? 0];
}

function channelToHex({ value }: { value: number }): string {
	const clamped = Math.min(255, Math.max(0, Math.round(value * 255)));
	return clamped.toString(16).padStart(2, "0");
}

/**
 * Converts HSV (h in degrees, s/v in 0..1) to a 6-digit hex string (no `#`).
 *
 * Done by hand rather than via culori's `formatHex({ mode: "hsv" })`: passing a
 * raw hsv object literal to culori's hex formatter threw inside its color
 * conversion ("Cannot read properties of undefined (reading 'rgb')") on the
 * saturation/value drag path. A direct conversion is dependency-free and also
 * gracefully handles an undefined/NaN hue (grayscale, where s = 0).
 */
export function hsvToHex({
	h,
	s,
	v,
}: {
	h: number;
	s: number;
	v: number;
}): string {
	const hue = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;
	const sat = Math.min(1, Math.max(0, s));
	const val = Math.min(1, Math.max(0, v));

	const c = val * sat;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = val - c;

	let r = 0;
	let g = 0;
	let b = 0;
	if (hue < 60) {
		r = c;
		g = x;
	} else if (hue < 120) {
		r = x;
		g = c;
	} else if (hue < 180) {
		g = c;
		b = x;
	} else if (hue < 240) {
		g = x;
		b = c;
	} else if (hue < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}

	return `${channelToHex({ value: r + m })}${channelToHex({ value: g + m })}${channelToHex({ value: b + m })}`;
}

export function parseHexAlpha({ hex }: { hex: string }): {
	rgb: string;
	alpha: number;
} {
	const color = parse(`#${hex}`);
	const rgbHex = color
		? formatHex(color).slice(1)
		: hex.slice(0, 6).toLowerCase();
	return {
		rgb: rgbHex,
		alpha: color?.alpha ?? 1,
	};
}

export function appendAlpha({
	rgbHex,
	alpha,
}: {
	rgbHex: string;
	alpha: number;
}): string {
	if (alpha >= 1) return rgbHex;
	const hex8 = formatHex8({ mode: "rgb", r: 0, g: 0, b: 0, alpha });
	const alphaHex = hex8.slice(7, 9);
	return rgbHex + alphaHex;
}

function stripCssNoise({ text }: { text: string }): string {
	let cleaned = text.trim();
	cleaned = cleaned
		.replace(/\s*!important\s*/gi, "")
		.replace(/;+\s*$/, "")
		.trim();

	const colonIndex = cleaned.indexOf(":");
	const parenIndex = cleaned.indexOf("(");
	if (colonIndex !== -1 && (parenIndex === -1 || colonIndex < parenIndex)) {
		cleaned = cleaned.slice(colonIndex + 1).trim();
	}

	return cleaned;
}

function colorToHexWithAlpha({ color }: { color: Rgb }): string {
	const hex = formatHex(color).slice(1);
	if (color.alpha !== undefined && color.alpha < 1) {
		const hex8 = formatHex8(color);
		return hex8.slice(1);
	}
	return hex;
}

export function extractColorFromText({
	text,
}: {
	text: string;
}): string | null {
	const cleaned = stripCssNoise({ text });

	const color = toRgb(cleaned);
	if (color) return colorToHexWithAlpha({ color });

	// bare hex without # (culori needs the prefix)
	const bareHexMatch = cleaned.match(/^([0-9a-fA-F]{3,8})$/);
	if (bareHexMatch) {
		const withHash = toRgb(`#${bareHexMatch[1]}`);
		if (withHash) return colorToHexWithAlpha({ color: withHash });
	}

	// fallback: find #hex anywhere in the original text
	const embeddedHexMatch = text.match(/#([0-9a-fA-F]{3,8})\b/);
	if (embeddedHexMatch) {
		const embedded = toRgb(`#${embeddedHexMatch[1]}`);
		if (embedded) return colorToHexWithAlpha({ color: embedded });
	}

	return null;
}

export function formatColorValue({
	hex,
	format,
}: {
	hex: string;
	format: ColorFormat;
}): string {
	switch (format) {
		case "hex":
			return hex;
		case "rgb": {
			const color = toRgb(`#${hex}`);
			if (!color) return hex;
			return `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
		}
		case "hsl": {
			const color = toHsl(`#${hex}`);
			if (!color) return hex;
			return `${Math.round(color.h ?? 0)}, ${Math.round((color.s ?? 0) * 100)}%, ${Math.round((color.l ?? 0) * 100)}%`;
		}
		case "hsv": {
			const color = toHsv(`#${hex}`);
			if (!color) return hex;
			return `${Math.round(color.h ?? 0)}, ${Math.round((color.s ?? 0) * 100)}%, ${Math.round((color.v ?? 0) * 100)}%`;
		}
	}
}

export function parseColorInput({
	input,
	format,
}: {
	input: string;
	format: ColorFormat;
}): string | null {
	switch (format) {
		case "hex": {
			const cleaned = input.replace("#", "");
			const isValidHex = /^[0-9a-fA-F]{3,8}$/.test(cleaned);
			return isValidHex ? cleaned : null;
		}
		case "rgb": {
			const parts = input.split(",").map((part) => parseInt(part.trim(), 10));
			if (parts.length < 3 || parts.some(Number.isNaN)) return null;
			const color = {
				mode: "rgb" as const,
				r: parts[0] / 255,
				g: parts[1] / 255,
				b: parts[2] / 255,
			};
			return formatHex(color).slice(1);
		}
		case "hsl": {
			const parts = input.split(",").map((part) => parseFloat(part.trim()));
			if (parts.length < 3 || parts.some(Number.isNaN)) return null;
			// Convert HSL -> HSV, then reuse the dependency-free hsvToHex (passing
			// a raw hsl object to culori's formatHex hits the same crash hsvToHex
			// was written to avoid).
			const sl = parts[1] / 100;
			const l = parts[2] / 100;
			const v = l + sl * Math.min(l, 1 - l);
			const s = v === 0 ? 0 : 2 * (1 - l / v);
			return hsvToHex({ h: parts[0], s, v });
		}
		case "hsv": {
			const parts = input.split(",").map((part) => parseFloat(part.trim()));
			if (parts.length < 3 || parts.some(Number.isNaN)) return null;
			return hsvToHex({ h: parts[0], s: parts[1] / 100, v: parts[2] / 100 });
		}
	}
}
