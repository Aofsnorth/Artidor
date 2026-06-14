/**
 * Delay / echo effect configuration.
 */
export interface DelayParams {
	enabled: boolean;
	time: number; // delay time in seconds
	feedback: number; // 0..1 amount of feedback
	mix: number; // 0..1 wet/dry mix
	pingPong: boolean; // alternate left/right channels
}

export const DEFAULT_DELAY_PARAMS: DelayParams = {
	enabled: false,
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
		params: { enabled: true, time: 0.5, feedback: 0.4, mix: 0.3, pingPong: false },
	},
	{
		id: "ping-pong",
		name: "Ping Pong",
		params: { enabled: true, time: 0.25, feedback: 0.5, mix: 0.35, pingPong: true },
	},
	{
		id: "slapback",
		name: "Slapback",
		params: { enabled: true, time: 0.08, feedback: 0.0, mix: 0.2, pingPong: false },
	},
];
