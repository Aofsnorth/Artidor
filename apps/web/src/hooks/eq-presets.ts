export { EQ_BANDS } from "@/lib/audio/equalizer";
export type { EqGains } from "@/lib/audio/equalizer";

import { EQ_BANDS, type EqGains } from "@/lib/audio/equalizer";

export function buildEqPresets(): Record<string, EqGains> {
	const out: Record<string, EqGains> = {};
	for (const band of EQ_BANDS) {
		(out.flat ??= {} as EqGains)[band.id] = 0;
	}
	return out;
}

export function applyEqPreset(presetId: string, current: EqGains): EqGains {
	const flat = buildEqPresets().flat;
	if (presetId === "flat") return { ...flat };
	// For non-flat presets, use sensible defaults
	switch (presetId) {
		case "bass-boost":
			return { ...flat, "31hz": 8, "62hz": 6, "125hz": 4 };
		case "treble-boost":
			return { ...flat, "4khz": 4, "8khz": 6, "16khz": 8 };
		case "vocal-booster":
			return {
				...flat,
				"125hz": -3,
				"250hz": -2,
				"1khz": 3,
				"2khz": 4,
				"4khz": 3,
			};
		case "bass-reducer":
			return { ...flat, "31hz": -6, "62hz": -4, "125hz": -2 };
		case "loudness":
			return { ...flat, "31hz": 4, "62hz": 3, "8khz": 3, "16khz": 4 };
		case "podcast":
			return {
				...flat,
				"125hz": -2,
				"500hz": 2,
				"1khz": 3,
				"2khz": 2,
				"4khz": 1,
				"8khz": -1,
				"16khz": -2,
			};
		case "electronic":
			return {
				...flat,
				"31hz": 5,
				"62hz": 4,
				"250hz": -1,
				"4khz": 2,
				"8khz": 4,
				"16khz": 5,
			};
		case "rock":
			return {
				...flat,
				"31hz": 5,
				"62hz": 4,
				"125hz": 2,
				"250hz": 1,
				"500hz": -1,
				"1khz": -1,
				"2khz": 1,
				"4khz": 3,
				"8khz": 4,
				"16khz": 5,
			};
		case "jazz":
			return {
				...flat,
				"31hz": 3,
				"62hz": 2,
				"125hz": 1,
				"250hz": 2,
				"500hz": -1,
				"1khz": -1,
				"2khz": 0,
				"4khz": 1,
				"8khz": 2,
				"16khz": 3,
			};
		case "classical":
			return {
				...flat,
				"31hz": 4,
				"125hz": 2,
				"2khz": -1,
				"4khz": -1,
				"16khz": 3,
			};
		case "dance":
			return { ...flat, "31hz": 6, "62hz": 4, "8khz": 3, "16khz": 4 };
		default:
			return current;
	}
}

export function sumGains(a: EqGains, b: EqGains): EqGains {
	const out = {} as EqGains;
	for (const band of EQ_BANDS) {
		out[band.id] = (a[band.id] ?? 0) + (b[band.id] ?? 0);
	}
	return out;
}
