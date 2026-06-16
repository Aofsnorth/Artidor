import { clampRetimeRate, shouldMaintainPitch } from "@/lib/retime/rate";
import type { RetimeConfig } from "@/lib/timeline";
import { getSourceTimeAtClipTime } from "./resolve";
import { getSpeedCurveFromRetime, isSpeedRampRetime } from "./speed-ramp";

const RATE_EPSILON = 1e-6;

function sampleLinear({
	channelData,
	position,
}: {
	channelData: Float32Array;
	position: number;
}): number {
	if (position <= 0) {
		return channelData[0] ?? 0;
	}
	const lower = Math.floor(position);
	const upper = Math.min(channelData.length - 1, lower + 1);
	if (lower >= channelData.length) {
		return 0;
	}
	const fraction = position - lower;
	return channelData[lower] * (1 - fraction) + channelData[upper] * fraction;
}

/**
 * The total source duration we need to read to fill `clipDuration` of output
 * for a given retime. For constant rate it's clipDuration / rate. For
 * curve mode, the average rate is what we want.
 */
function computeSourceSpanForRetime({
	clipDuration,
	retime,
}: {
	clipDuration: number;
	retime?: RetimeConfig;
}): number {
	if (isSpeedRampRetime(retime)) {
		const curve = getSpeedCurveFromRetime(retime);
		if (curve.length === 0) return clipDuration;
		// Average speed across the curve.
		let weighted = 0;
		let totalWeight = 0;
		for (let i = 0; i < curve.length - 1; i++) {
			const p0 = curve[i]!;
			const p1 = curve[i + 1]!;
			const segLen = Math.max(0, p1.time - p0.time);
			const avg = (p0.speed + p1.speed) / 2;
			weighted += avg * segLen;
			totalWeight += segLen;
		}
		const avgSpeed = totalWeight > 0 ? weighted / totalWeight : 1;
		// Source duration = clip * average speed (because source time = clip * speed)
		return clipDuration * Math.max(0.01, avgSpeed);
	}
	const rate = clampRetimeRate({ rate: retime?.rate ?? 1 });
	return clipDuration * rate;
}

function buildResampledBuffer({
	audioContext,
	sourceBuffer,
	trimStart,
	clipDuration,
	targetSampleRate,
	retime,
}: {
	audioContext: BaseAudioContext;
	sourceBuffer: AudioBuffer;
	trimStart: number;
	clipDuration: number;
	targetSampleRate: number;
	retime?: RetimeConfig;
}): AudioBuffer {
	const outputLength = Math.max(1, Math.ceil(clipDuration * targetSampleRate));
	const numChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels));
	const outputBuffer = audioContext.createBuffer(
		numChannels,
		outputLength,
		targetSampleRate,
	);

	for (let channel = 0; channel < numChannels; channel++) {
		const sourceData = sourceBuffer.getChannelData(
			Math.min(channel, sourceBuffer.numberOfChannels - 1),
		);
		const outputData = outputBuffer.getChannelData(channel);

		for (let i = 0; i < outputLength; i++) {
			const clipTime = i / targetSampleRate;
			// For curve mode, getSourceTimeAtClipTime already returns the absolute
			// source time (not normalized). For constant rate, it returns
			// clipTime * rate, so we add trimStart to offset into the source.
			const sourceTime =
				trimStart +
				getSourceTimeAtClipTime({
					clipTime,
					retime,
					clipDuration,
				});
			outputData[i] = sampleLinear({
				channelData: sourceData,
				position: sourceTime * sourceBuffer.sampleRate,
			});
		}
	}

	return outputBuffer;
}

async function buildPitchPreservedBuffer({
	sourceBuffer,
	trimStart,
	clipDuration,
	retime,
	targetSampleRate,
}: {
	sourceBuffer: AudioBuffer;
	trimStart: number;
	clipDuration: number;
	retime?: RetimeConfig;
	targetSampleRate: number;
}): Promise<AudioBuffer> {
	// For curve mode, pitch preservation is much harder (need a phase vocoder
	// with variable time-stretch). Fall back to resampling for those.
	const rate = clampRetimeRate({ rate: retime?.rate ?? 1 });
	if (isSpeedRampRetime(retime)) {
		return buildResampledBuffer({
			audioContext: new OfflineAudioContext(
				Math.max(1, Math.min(2, sourceBuffer.numberOfChannels)),
				1,
				targetSampleRate,
			),
			sourceBuffer,
			trimStart,
			clipDuration,
			targetSampleRate,
			retime,
		});
	}
	const usePitch =
		shouldMaintainPitch({
			rate,
			maintainPitch: retime?.maintainPitch === true,
		}) && Math.abs(rate - 1) > RATE_EPSILON;
	if (!usePitch) {
		return buildResampledBuffer({
			audioContext: new OfflineAudioContext(
				Math.max(1, Math.min(2, sourceBuffer.numberOfChannels)),
				1,
				targetSampleRate,
			),
			sourceBuffer,
			trimStart,
			clipDuration,
			targetSampleRate,
			retime,
		});
	}
	const nativeSampleRate = sourceBuffer.sampleRate;
	const sourceSpan = computeSourceSpanForRetime({ clipDuration, retime });
	const sourceDuration = sourceSpan;
	const startSample = Math.max(0, Math.floor(trimStart * nativeSampleRate));
	const numSourceSamples = Math.max(
		1,
		Math.ceil(sourceDuration * nativeSampleRate),
	);
	const available = Math.max(0, sourceBuffer.length - startSample);
	const actualSamples = Math.max(1, Math.min(numSourceSamples, available));
	const numChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels));

	// Resample to targetSampleRate first — soundtouchjs reads raw channel data
	// and does not respect the source buffer's native sample rate.
	const resampledLength = Math.max(
		1,
		Math.ceil(sourceDuration * targetSampleRate),
	);
	const resampleCtx = new OfflineAudioContext(
		numChannels,
		resampledLength,
		targetSampleRate,
	);
	const nativeBuffer = resampleCtx.createBuffer(
		numChannels,
		actualSamples,
		nativeSampleRate,
	);

	for (let ch = 0; ch < numChannels; ch++) {
		const src = sourceBuffer.getChannelData(
			Math.min(ch, sourceBuffer.numberOfChannels - 1),
		);
		nativeBuffer.copyToChannel(
			src.subarray(startSample, startSample + actualSamples),
			ch,
		);
	}

	const resampleSourceNode = resampleCtx.createBufferSource();
	resampleSourceNode.buffer = nativeBuffer;
	resampleSourceNode.connect(resampleCtx.destination);
	resampleSourceNode.start(0);
	const resampledBuffer = await resampleCtx.startRendering();

	const outputSamples = Math.max(1, Math.ceil(clipDuration * targetSampleRate));
	const stretchCtx = new OfflineAudioContext(
		numChannels,
		outputSamples,
		targetSampleRate,
	);
	// Lazy-load soundtouchjs (~1.9MB) only when a pitch-preserving stretch
	// actually runs — it's a rare audio op, so it shouldn't sit in the
	// initial editor bundle.
	const { PitchShifter } = await import("soundtouchjs");
	const shifter = new PitchShifter(stretchCtx, resampledBuffer, 4096);
	shifter.tempo = rate;
	shifter.pitch = 1;
	shifter.connect(stretchCtx.destination);
	return stretchCtx.startRendering();
}

export async function renderRetimedBuffer({
	audioContext,
	sourceBuffer,
	trimStart,
	clipDuration,
	retime,
	maintainPitch = false,
}: {
	audioContext: BaseAudioContext;
	sourceBuffer: AudioBuffer;
	trimStart: number;
	clipDuration: number;
	retime?: RetimeConfig;
	maintainPitch?: boolean;
}): Promise<AudioBuffer> {
	const targetSampleRate = audioContext.sampleRate;
	// For curve mode we always resample (no pitch preservation).
	if (isSpeedRampRetime(retime)) {
		return buildResampledBuffer({
			audioContext,
			sourceBuffer,
			trimStart,
			clipDuration,
			targetSampleRate,
			retime,
		});
	}
	return buildPitchPreservedBuffer({
		sourceBuffer,
		trimStart,
		clipDuration,
		retime,
		targetSampleRate,
	});
}
