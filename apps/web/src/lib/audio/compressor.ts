/**
 * Compressor / Limiter / Noise Gate parameters.
 */
export interface CompressorParams {
	enabled: boolean;
	threshold: number; // dB (-100 to 0)
	ratio: number; // 1..20
	attack: number; // seconds (0 to 1)
	release: number; // seconds (0 to 1)
	knee: number; // dB (0 to 40)
	gain: number; // dB makeup gain (-12 to 24)
}

export const DEFAULT_COMPRESSOR_PARAMS: CompressorParams = {
	enabled: false,
	threshold: -18,
	ratio: 3,
	attack: 0.003,
	release: 0.25,
	knee: 6,
	gain: 0,
};

export const COMPRESSOR_PRESETS: Array<{
	id: string;
	name: string;
	params: CompressorParams;
}> = [
	{
		id: "vocal",
		name: "Vocal",
		params: {
			enabled: true,
			threshold: -18,
			ratio: 3,
			attack: 0.003,
			release: 0.18,
			knee: 6,
			gain: 2,
		},
	},
	{
		id: "drum",
		name: "Drum",
		params: {
			enabled: true,
			threshold: -12,
			ratio: 4,
			attack: 0.001,
			release: 0.12,
			knee: 4,
			gain: 0,
		},
	},
	{
		id: "limiter",
		name: "Limiter",
		params: {
			enabled: true,
			threshold: -1,
			ratio: 20,
			attack: 0.001,
			release: 0.05,
			knee: 0,
			gain: 0,
		},
	},
	{
		id: "gentle",
		name: "Gentle",
		params: {
			enabled: true,
			threshold: -24,
			ratio: 2,
			attack: 0.02,
			release: 0.4,
			knee: 12,
			gain: 3,
		},
	},
];

export interface NoiseGateParams {
	enabled: boolean;
	threshold: number; // dB threshold for opening the gate
	attack: number; // seconds
	release: number; // seconds
	range: number; // dB reduction when closed
}

export const DEFAULT_NOISE_GATE_PARAMS: NoiseGateParams = {
	enabled: false,
	threshold: -50,
	attack: 0.001,
	release: 0.05,
	range: -80,
};

export interface LimiterParams {
	enabled: boolean;
	threshold: number; // dB
	ceiling: number; // dB
	release: number; // seconds
}

export const DEFAULT_LIMITER_PARAMS: LimiterParams = {
	enabled: false,
	threshold: -3,
	ceiling: -0.3,
	release: 0.05,
};
