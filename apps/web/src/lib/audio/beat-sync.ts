export function detectBeatTimes(
	samples: Float32Array,
	sampleRate: number,
	{
		windowSize = 1024,
		threshold = 0.65,
		minGapSeconds = 0.18,
	}: { windowSize?: number; threshold?: number; minGapSeconds?: number } = {},
): number[] {
	const beats: number[] = [];
	let lastBeatSample = -Infinity;
	const minGapSamples = Math.max(1, Math.round(minGapSeconds * sampleRate));
	for (let i = 0; i < samples.length; i += windowSize) {
		let peak = 0;
		let peakIndex = i;
		const end = Math.min(samples.length, i + windowSize);
		for (let j = i; j < end; j++) {
			const value = Math.abs(samples[j] ?? 0);
			if (value > peak) {
				peak = value;
				peakIndex = j;
			}
		}
		if (peak >= threshold && peakIndex - lastBeatSample >= minGapSamples) {
			beats.push(peakIndex / sampleRate);
			lastBeatSample = peakIndex;
		}
	}
	return beats;
}
