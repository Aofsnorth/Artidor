/**
 * Modulation effects (chorus, flanger, phaser, tremolo, vibrato, rotary).
 */
export type ModulationType =
	| "chorus"
	| "flanger"
	| "phaser"
	| "tremolo"
	| "vibrato"
	| "rotary";

export interface ModulationParams {
	enabled: boolean;
	type: ModulationType;
	rate: number; // Hz (oscillator rate)
	depth: number; // 0..1 modulation depth
	mix: number; // 0..1 wet/dry mix
	stereo: number; // 0..1 stereo spread
}

export const DEFAULT_MODULATION_PARAMS: ModulationParams = {
	enabled: false,
	type: "chorus",
	rate: 1.0,
	depth: 0.5,
	mix: 0.5,
	stereo: 0.5,
};

export const MODULATION_PRESETS: Array<{
	id: string;
	name: string;
	params: ModulationParams;
}> = [
	{
		id: "chorus",
		name: "Chorus",
		params: {
			enabled: true,
			type: "chorus",
			rate: 1.5,
			depth: 0.7,
			mix: 0.5,
			stereo: 0.8,
		},
	},
	{
		id: "flanger",
		name: "Flanger",
		params: {
			enabled: true,
			type: "flanger",
			rate: 0.3,
			depth: 0.8,
			mix: 0.5,
			stereo: 0.6,
		},
	},
	{
		id: "phaser",
		name: "Phaser",
		params: {
			enabled: true,
			type: "phaser",
			rate: 0.5,
			depth: 0.7,
			mix: 0.4,
			stereo: 0.5,
		},
	},
	{
		id: "tremolo",
		name: "Tremolo",
		params: {
			enabled: true,
			type: "tremolo",
			rate: 4.0,
			depth: 0.6,
			mix: 1.0,
			stereo: 0.5,
		},
	},
	{
		id: "vibrato",
		name: "Vibrato",
		params: {
			enabled: true,
			type: "vibrato",
			rate: 5.0,
			depth: 0.5,
			mix: 1.0,
			stereo: 0.5,
		},
	},
	{
		id: "rotary",
		name: "Rotary",
		params: {
			enabled: true,
			type: "rotary",
			rate: 6.0,
			depth: 0.8,
			mix: 1.0,
			stereo: 0.8,
		},
	},
];
