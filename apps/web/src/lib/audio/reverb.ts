/**
 * Reverb preset configurations for convolution-based reverb.
 * Each preset uses a procedurally generated impulse response so we don't ship
 * a binary file. In production these would be replaced by real IR samples.
 */
export interface ReverbPreset {
	id: string;
	name: string;
	duration: number; // seconds of decay
	decay: number; // decay rate
	preDelay: number; // seconds
	damping: number; // 0..1 high-frequency damping
}

export const REVERB_PRESETS: ReverbPreset[] = [
	{ id: "room", name: "Room", duration: 0.6, decay: 2.5, preDelay: 0.005, damping: 0.6 },
	{ id: "hall", name: "Hall", duration: 2.4, decay: 1.6, preDelay: 0.03, damping: 0.35 },
	{ id: "plate", name: "Plate", duration: 1.6, decay: 1.8, preDelay: 0.001, damping: 0.2 },
	{ id: "cathedral", name: "Cathedral", duration: 4.5, decay: 1.2, preDelay: 0.06, damping: 0.4 },
	{ id: "chamber", name: "Chamber", duration: 1.2, decay: 2.0, preDelay: 0.01, damping: 0.5 },
	{ id: "spring", name: "Spring", duration: 1.0, decay: 3.0, preDelay: 0.001, damping: 0.1 },
	{ id: "ambient", name: "Ambient", duration: 3.0, decay: 1.4, preDelay: 0.02, damping: 0.5 },
];

export interface ReverbParams {
	enabled: boolean;
	presetId: string;
	mix: number; // 0..1 wet/dry mix
}

export const DEFAULT_REVERB_PARAMS: ReverbParams = {
	enabled: false,
	presetId: "hall",
	mix: 0.3,
};

/**
 * Generate a simple exponential-decay noise impulse response for the given preset.
 * Returns a stereo AudioBuffer suitable for ConvolverNode.
 */
export function buildReverbImpulseResponse({
	audioContext,
	preset,
}: {
	audioContext: BaseAudioContext;
	preset: ReverbPreset;
}): AudioBuffer {
	const sampleRate = audioContext.sampleRate;
	const length = Math.max(1, Math.floor(preset.duration * sampleRate));
	const impulse = audioContext.createBuffer(2, length, sampleRate);

	for (let channel = 0; channel < 2; channel++) {
		const data = impulse.getChannelData(channel);
		for (let i = 0; i < length; i++) {
			const t = i / length;
			// Decaying noise with slight channel decorrelation
			const noise = (Math.random() * 2 - 1) * Math.exp(-preset.decay * t);
			// Apply damping (reduce high frequencies by simple moving average)
			const damped = noise * (1 - preset.damping * 0.4);
			data[i] = damped;
		}
		// Pre-delay: shift the impulse by N samples
		if (preset.preDelay > 0) {
			const shift = Math.floor(preset.preDelay * sampleRate);
			for (let i = length - 1; i >= shift; i--) {
				data[i] = data[i - shift];
			}
			for (let i = 0; i < shift; i++) {
				data[i] = 0;
			}
		}
	}

	return impulse;
}
