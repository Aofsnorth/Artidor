const MASTER_LIMITER_THRESHOLD_DB = -1;
const MASTER_LIMITER_KNEE_DB = 0;
const MASTER_LIMITER_RATIO = 20;
const MASTER_LIMITER_ATTACK_SECONDS = 0.001;
const MASTER_LIMITER_RELEASE_SECONDS = 0.12;
const MASTER_OUTPUT_HEADROOM = 0.98;

export function getAudioBufferPeak({
	audioBuffer,
}: {
	audioBuffer: AudioBuffer;
}): number {
	let peak = 0;

	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		const channelData = audioBuffer.getChannelData(channel);
		for (let index = 0; index < channelData.length; index++) {
			const magnitude = Math.abs(channelData[index]);
			if (magnitude > peak) {
				peak = magnitude;
			}
		}
	}

	return peak;
}

export function createAudioMasteringChain({
	audioContext,
	destination,
}: {
	audioContext: AudioContext | OfflineAudioContext;
	destination: AudioNode;
}): {
	input: GainNode;
} {
	const input = audioContext.createGain();
	const limiter = audioContext.createDynamicsCompressor();
	const outputGain = audioContext.createGain();

	limiter.threshold.value = MASTER_LIMITER_THRESHOLD_DB;
	limiter.knee.value = MASTER_LIMITER_KNEE_DB;
	limiter.ratio.value = MASTER_LIMITER_RATIO;
	limiter.attack.value = MASTER_LIMITER_ATTACK_SECONDS;
	limiter.release.value = MASTER_LIMITER_RELEASE_SECONDS;
	outputGain.gain.value = MASTER_OUTPUT_HEADROOM;

	input.connect(limiter);
	limiter.connect(outputGain);
	outputGain.connect(destination);

	return { input };
}

export async function applyAudioMasteringToBuffer({
	audioBuffer,
}: {
	audioBuffer: AudioBuffer;
}): Promise<AudioBuffer> {
	const peak = getAudioBufferPeak({ audioBuffer });
	if (peak <= MASTER_OUTPUT_HEADROOM) {
		return audioBuffer;
	}

	// If the only issue is clipping, a fast JS clamp is sufficient and avoids
	// the (sometimes hanging) OfflineAudioContext render path entirely.
	if (peak > MASTER_OUTPUT_HEADROOM && peak <= 1.0) {
		clampAudioBufferPeak({
			audioBuffer,
			maxPeak: MASTER_OUTPUT_HEADROOM,
		});
		return audioBuffer;
	}

	// Peak > 1.0 means hard digital clipping. Run the full limiter chain via
	// OfflineAudioContext, but with a timeout — some browsers hang on
	// startRendering() for long buffers with a DynamicsCompressorNode.
	try {
		const offlineContext = new OfflineAudioContext(
			audioBuffer.numberOfChannels,
			Math.max(1, audioBuffer.length),
			audioBuffer.sampleRate,
		);
		const source = offlineContext.createBufferSource();
		source.buffer = audioBuffer;

		const { input } = createAudioMasteringChain({
			audioContext: offlineContext,
			destination: offlineContext.destination,
		});
		source.connect(input);
		source.start(0);

		const renderedBuffer = await withRenderTimeout(offlineContext, 30_000);
		clampAudioBufferPeak({
			audioBuffer: renderedBuffer,
			maxPeak: MASTER_OUTPUT_HEADROOM,
		});
		return renderedBuffer;
	} catch (error) {
		console.warn(
			"Audio mastering render failed/timed out, falling back to JS clamp:",
			error,
		);
		clampAudioBufferPeak({
			audioBuffer,
			maxPeak: MASTER_OUTPUT_HEADROOM,
		});
		return audioBuffer;
	}
}

/**
 * Race `startRendering()` against a timeout. Some browsers hang indefinitely
 * on OfflineAudioContext renders with DynamicsCompressorNode for long buffers.
 */
function withRenderTimeout(
	ctx: OfflineAudioContext,
	timeoutMs: number,
): Promise<AudioBuffer> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`OfflineAudioContext render timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		ctx.startRendering().then(
			(buffer) => {
				clearTimeout(timer);
				resolve(buffer);
			},
			(err) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
}

function clampAudioBufferPeak({
	audioBuffer,
	maxPeak,
}: {
	audioBuffer: AudioBuffer;
	maxPeak: number;
}): void {
	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		const channelData = audioBuffer.getChannelData(channel);
		for (let index = 0; index < channelData.length; index++) {
			channelData[index] = Math.max(
				-maxPeak,
				Math.min(maxPeak, channelData[index]),
			);
		}
	}
}
