/**
 * Audio ducking: automatically lower background music when voiceover is detected.
 * Stored as element parameters; applied at export time.
 */
export interface AudioDuckingParams {
	enabled: boolean;
	threshold: number; // dB
	ratio: number; // 1..20
	attack: number; // seconds
	release: number; // seconds
	duckLevel: number; // dB - how much to lower music
}

export const DEFAULT_AUDIO_DUCKING_PARAMS: AudioDuckingParams = {
	enabled: false,
	threshold: -30,
	ratio: 4,
	attack: 0.1,
	release: 0.3,
	duckLevel: -12,
};
