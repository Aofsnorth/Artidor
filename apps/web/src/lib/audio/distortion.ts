/**
 * Distortion / saturation effects.
 */
export type DistortionType =
	| "overdrive"
	| "distortion"
	| "fuzz"
	| "bit-crusher"
	| "saturation"
	| "telephone"
	| "radio"
	| "megaphone"
	| "underwater"
	| "cave"
	| "bathroom"
	| "garage";

export interface DistortionParams {
	enabled: boolean;
	type: DistortionType;
	amount: number; // 0..1 distortion intensity
	mix: number; // 0..1 wet/dry mix
}

export const DEFAULT_DISTORTION_PARAMS: DistortionParams = {
	enabled: false,
	type: "overdrive",
	amount: 0.5,
	mix: 1.0,
};

export const DISTORTION_PRESETS: Array<{
	id: string;
	name: string;
	params: DistortionParams;
}> = [
	{
		id: "overdrive",
		name: "Overdrive",
		params: { enabled: true, type: "overdrive", amount: 0.3, mix: 1.0 },
	},
	{
		id: "distortion",
		name: "Distortion",
		params: { enabled: true, type: "distortion", amount: 0.5, mix: 1.0 },
	},
	{
		id: "fuzz",
		name: "Fuzz",
		params: { enabled: true, type: "fuzz", amount: 0.7, mix: 1.0 },
	},
	{
		id: "bit-crusher",
		name: "Bit Crusher",
		params: { enabled: true, type: "bit-crusher", amount: 0.5, mix: 1.0 },
	},
	{
		id: "saturation",
		name: "Saturation",
		params: { enabled: true, type: "saturation", amount: 0.4, mix: 1.0 },
	},
	{
		id: "telephone",
		name: "Telephone",
		params: { enabled: true, type: "telephone", amount: 1.0, mix: 1.0 },
	},
	{
		id: "radio",
		name: "Radio",
		params: { enabled: true, type: "radio", amount: 1.0, mix: 1.0 },
	},
	{
		id: "megaphone",
		name: "Megaphone",
		params: { enabled: true, type: "megaphone", amount: 1.0, mix: 1.0 },
	},
	{
		id: "underwater",
		name: "Underwater",
		params: { enabled: true, type: "underwater", amount: 1.0, mix: 1.0 },
	},
	{
		id: "cave",
		name: "Cave",
		params: { enabled: true, type: "cave", amount: 0.7, mix: 1.0 },
	},
	{
		id: "bathroom",
		name: "Bathroom",
		params: { enabled: true, type: "bathroom", amount: 0.6, mix: 1.0 },
	},
	{
		id: "garage",
		name: "Garage",
		params: { enabled: true, type: "garage", amount: 0.5, mix: 1.0 },
	},
];

/**
 * Build a WaveShaper curve for the given distortion type.
 */
export function buildDistortionCurve({
	type,
	amount,
	samples = 4096,
}: {
	type: DistortionType;
	amount: number;
	samples?: number;
}): Float32Array<ArrayBuffer> {
	const curve = new Float32Array(new ArrayBuffer(samples * 4));
	const k = amount * 100;

	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;

		switch (type) {
			case "overdrive":
			case "distortion": {
				// Standard tanh soft-clip
				curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
				break;
			}
			case "fuzz": {
				// Exponential
				curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * (1 + k * 5)));
				break;
			}
			case "bit-crusher": {
				const steps = Math.max(2, Math.floor(16 - amount * 14));
				curve[i] = Math.round(x * steps) / steps;
				break;
			}
			case "saturation": {
				// Soft saturation
				curve[i] = Math.tanh(x * (1 + k * 0.3));
				break;
			}
			case "telephone": {
				// Bandlimited — emphasize mids
				curve[i] = x * 0.7;
				break;
			}
			case "radio": {
				curve[i] = x * 0.6;
				break;
			}
			case "megaphone": {
				curve[i] = Math.tanh(x * 1.8) * 0.9;
				break;
			}
			case "underwater": {
				curve[i] = x * 0.3;
				break;
			}
			case "cave": {
				curve[i] = x * 0.5;
				break;
			}
			case "bathroom": {
				curve[i] = x * 0.6;
				break;
			}
			case "garage": {
				curve[i] = x * 0.55;
				break;
			}
			default: {
				curve[i] = x;
			}
		}
	}

	return curve;
}
