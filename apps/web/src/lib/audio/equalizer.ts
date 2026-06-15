/**
 * 10-band graphic equalizer using Web Audio's BiquadFilterNode.
 * Standard ISO 1/1 octave centers: 31.25, 62.5, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz.
 */
export const EQ_BANDS = [
	{ id: "31hz", label: "31 Hz", frequency: 31.25 },
	{ id: "62hz", label: "62 Hz", frequency: 62.5 },
	{ id: "125hz", label: "125 Hz", frequency: 125 },
	{ id: "250hz", label: "250 Hz", frequency: 250 },
	{ id: "500hz", label: "500 Hz", frequency: 500 },
	{ id: "1khz", label: "1 kHz", frequency: 1000 },
	{ id: "2khz", label: "2 kHz", frequency: 2000 },
	{ id: "4khz", label: "4 kHz", frequency: 4000 },
	{ id: "8khz", label: "8 kHz", frequency: 8000 },
	{ id: "16khz", label: "16 kHz", frequency: 16000 },
] as const;

export type EqBandId = (typeof EQ_BANDS)[number]["id"];

export type EqGains = Record<EqBandId, number>;

export function defaultEqGains(): EqGains {
	const g: Partial<EqGains> = {};
	for (const band of EQ_BANDS) {
		g[band.id] = 0;
	}
	return g as EqGains;
}

export const EQ_PRESETS: Array<{
	id: string;
	name: string;
	gains: EqGains;
}> = [
	{
		id: "flat",
		name: "Flat",
		gains: defaultEqGains(),
	},
	{
		id: "bass-boost",
		name: "Bass Boost",
		gains: { ...defaultEqGains(), "31hz": 8, "62hz": 6, "125hz": 4 },
	},
	{
		id: "treble-boost",
		name: "Treble Boost",
		gains: { ...defaultEqGains(), "4khz": 4, "8khz": 6, "16khz": 8 },
	},
	{
		id: "vocal-booster",
		name: "Vocal Booster",
		gains: {
			...defaultEqGains(),
			"125hz": -3,
			"250hz": -2,
			"1khz": 3,
			"2khz": 4,
			"4khz": 3,
		},
	},
	{
		id: "bass-reducer",
		name: "Bass Reducer",
		gains: { ...defaultEqGains(), "31hz": -6, "62hz": -4, "125hz": -2 },
	},
	{
		id: "loudness",
		name: "Loudness",
		gains: { ...defaultEqGains(), "31hz": 4, "62hz": 3, "8khz": 3, "16khz": 4 },
	},
	{
		id: "podcast",
		name: "Podcast",
		gains: {
			...defaultEqGains(),
			"125hz": -2,
			"250hz": 0,
			"500hz": 2,
			"1khz": 3,
			"2khz": 2,
			"4khz": 1,
			"8khz": -1,
			"16khz": -2,
		},
	},
	{
		id: "electronic",
		name: "Electronic",
		gains: {
			...defaultEqGains(),
			"31hz": 5,
			"62hz": 4,
			"125hz": 0,
			"250hz": -1,
			"500hz": 0,
			"1khz": 0,
			"2khz": 0,
			"4khz": 2,
			"8khz": 4,
			"16khz": 5,
		},
	},
	{
		id: "rock",
		name: "Rock",
		gains: {
			...defaultEqGains(),
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
		},
	},
	{
		id: "jazz",
		name: "Jazz",
		gains: {
			...defaultEqGains(),
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
		},
	},
	{
		id: "classical",
		name: "Classical",
		gains: {
			...defaultEqGains(),
			"31hz": 4,
			"125hz": 2,
			"2khz": -1,
			"4khz": -1,
			"16khz": 3,
		},
	},
	{
		id: "dance",
		name: "Dance",
		gains: { ...defaultEqGains(), "31hz": 6, "62hz": 4, "8khz": 3, "16khz": 4 },
	},
];

export interface EqParams {
	enabled: boolean;
	gains: EqGains;
}

export const DEFAULT_EQ_PARAMS: EqParams = {
	enabled: false,
	gains: defaultEqGains(),
};
