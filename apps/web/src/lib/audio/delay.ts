/**
 * Delay / echo effect configuration.
 */
export interface DelayParams {
	enabled: boolean;
	/**
	 * Id of the preset whose parameters are currently applied. Stored on the
	 * params (like `ReverbParams.presetId`) so the preset dropdown can
	 * reflect the live value instead of always showing the first entry.
	 */
	presetId: string;
	time: number; // delay time in seconds
	feedback: number; // 0..1 amount of feedback
	mix: number; // 0..1 wet/dry mix
	pingPong: boolean; // alternate left/right channels
}

export const DEFAULT_DELAY_PARAMS: DelayParams = {
	enabled: false,
	presetId: "echo",
	time: 0.3,
	feedback: 0.35,
	mix: 0.3,
	pingPong: false,
};

export const DELAY_PRESETS: Array<{
	id: string;
	name: string;
	params: DelayParams;
}> = [
	{
		id: "echo",
		name: "Echo",
		params: {
			enabled: true,
			presetId: "echo",
			time: 0.5,
			feedback: 0.4,
			mix: 0.3,
			pingPong: false,
		},
	},
	{
		id: "ping-pong",
		name: "Ping Pong",
		params: {
			enabled: true,
			presetId: "ping-pong",
			time: 0.25,
			feedback: 0.5,
			mix: 0.35,
			pingPong: true,
		},
	},
	{
		id: "slapback",
		name: "Slapback",
		params: {
			enabled: true,
			presetId: "slapback",
			time: 0.08,
			feedback: 0.0,
			mix: 0.2,
			pingPong: false,
		},
	},
];
