/**
 * Offline audio effects engine. Takes an AudioBuffer and applies the requested
 * effects (EQ, reverb, delay, modulation, distortion, compressor, voice changer)
 * in a single OfflineAudioContext pass, returning a processed AudioBuffer.
 */
import { EQ_BANDS, type EqParams } from "@/lib/audio/equalizer";
import {
	DEFAULT_REVERB_PARAMS,
	REVERB_PRESETS,
	type ReverbParams,
	buildReverbImpulseResponse,
} from "@/lib/audio/reverb";
import { DEFAULT_DELAY_PARAMS, type DelayParams } from "@/lib/audio/delay";
import {
	DEFAULT_MODULATION_PARAMS,
	type ModulationParams,
} from "@/lib/audio/modulation";
import {
	DEFAULT_DISTORTION_PARAMS,
	buildDistortionCurve,
	type DistortionParams,
} from "@/lib/audio/distortion";
import {
	DEFAULT_COMPRESSOR_PARAMS,
	type CompressorParams,
} from "@/lib/audio/compressor";
import {
	DEFAULT_VOICE_CHANGER_PARAMS,
	type VoiceChangerParams,
} from "@/lib/audio/voice-changer";
import { buildEqPresets } from "./eq-presets";

export interface AudioEffectsChain {
	eq: EqParams;
	reverb: ReverbParams;
	delay: DelayParams;
	modulation: ModulationParams;
	distortion: DistortionParams;
	compressor: CompressorParams;
	voiceChanger: VoiceChangerParams;
	noiseReduction: {
		enabled: boolean;
		strength: number;
	};
}

export const DEFAULT_AUDIO_EFFECTS_CHAIN: AudioEffectsChain = {
	eq: { enabled: false, gains: buildEqPresets().flat },
	reverb: { ...DEFAULT_REVERB_PARAMS },
	delay: { ...DEFAULT_DELAY_PARAMS },
	modulation: { ...DEFAULT_MODULATION_PARAMS },
	distortion: { ...DEFAULT_DISTORTION_PARAMS },
	compressor: { ...DEFAULT_COMPRESSOR_PARAMS },
	voiceChanger: { ...DEFAULT_VOICE_CHANGER_PARAMS },
	noiseReduction: { enabled: false, strength: 0.5 },
};

export interface ProcessAudioEffectsOptions {
	chain: AudioEffectsChain;
}

export async function processAudioEffects({
	buffer,
	options,
}: {
	buffer: AudioBuffer;
	options: ProcessAudioEffectsOptions;
}): Promise<AudioBuffer> {
	const { chain } = options;
	const sampleRate = buffer.sampleRate;
	const length = buffer.length;
	const numChannels = Math.min(2, buffer.numberOfChannels);

	const offline = new OfflineAudioContext(numChannels, length, sampleRate);
	const source = offline.createBufferSource();
	source.buffer = buffer;

	let current: AudioNode = source;
	/**
	 * Append a node to the serial chain. Every stage must have exactly one
	 * input and one output: the old helper also created a self-connection
	 * (`node.connect(node)`), which Web Audio treats as an invalid cycle and
	 * mutes (or at least corrupts) the rest of the graph.
	 */
	const connectSerial = (node: AudioNode) => {
		current.connect(node);
		current = node;
	};

	// 1) Noise reduction (spectral gate) — done by simple high-pass for now
	if (chain.noiseReduction.enabled) {
		const hp = offline.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 80 + (1 - chain.noiseReduction.strength) * 100;
		hp.Q.value = 0.5;
		connectSerial(hp);
	}

	// 2) Equalizer — 10 bands
	if (chain.eq.enabled) {
		for (const band of EQ_BANDS) {
			const f = offline.createBiquadFilter();
			f.type = "peaking";
			f.frequency.value = band.frequency;
			f.Q.value = 1.0;
			f.gain.value = chain.eq.gains[band.id] ?? 0;
			connectSerial(f);
		}
	}

	// 3) Compressor
	if (chain.compressor.enabled) {
		const comp = offline.createDynamicsCompressor();
		comp.threshold.value = chain.compressor.threshold;
		comp.ratio.value = chain.compressor.ratio;
		comp.attack.value = chain.compressor.attack;
		comp.release.value = chain.compressor.release;
		comp.knee.value = chain.compressor.knee;
		connectSerial(comp);
		// Makeup gain
		if (chain.compressor.gain !== 0) {
			const g = offline.createGain();
			g.gain.value = 10 ** (chain.compressor.gain / 20);
			connectSerial(g);
		}
	}

	// 4) Distortion (WaveShaper with one dry/wet mix)
	if (chain.distortion.enabled) {
		const ws = offline.createWaveShaper();
		ws.curve = buildDistortionCurve({
			type: chain.distortion.type,
			amount: chain.distortion.amount,
		});
		const wet = offline.createGain();
		wet.gain.value = chain.distortion.mix;
		const dry = offline.createGain();
		dry.gain.value = 1 - chain.distortion.mix;
		const sum = offline.createGain();

		current.connect(ws);
		ws.connect(wet);
		// The dry path taps the same input exactly once.
		current.connect(dry);
		wet.connect(sum);
		dry.connect(sum);
		current = sum;
	}

	// 5) Modulation (modulated delay, one dry/wet mix)
	if (chain.modulation.enabled) {
		const lfoRate = chain.modulation.rate;
		const lfoDepth = chain.modulation.depth * 0.002; // in seconds

		const delayNode = offline.createDelay(1.0);
		delayNode.delayTime.value = 0.01 + lfoDepth;

		const lfo = offline.createOscillator();
		lfo.type = "sine";
		lfo.frequency.value = lfoRate;
		const lfoGain = offline.createGain();
		lfoGain.gain.value = lfoDepth;
		lfo.connect(lfoGain);
		lfoGain.connect(delayNode.delayTime);
		lfo.start(0);

		const wet = offline.createGain();
		wet.gain.value = chain.modulation.mix;
		const dry = offline.createGain();
		dry.gain.value = 1 - chain.modulation.mix;
		const sum = offline.createGain();

		current.connect(delayNode);
		current.connect(dry);
		delayNode.connect(wet);
		wet.connect(sum);
		dry.connect(sum);
		current = sum;
	}

	// 6) Delay (feedback network with one dry/wet mix)
	if (chain.delay.enabled) {
		const delayNode = offline.createDelay(2.0);
		delayNode.delayTime.value = chain.delay.time;
		const feedback = offline.createGain();
		feedback.gain.value = chain.delay.feedback;
		delayNode.connect(feedback);
		feedback.connect(delayNode);

		const wet = offline.createGain();
		wet.gain.value = chain.delay.mix;
		const dry = offline.createGain();
		dry.gain.value = 1 - chain.delay.mix;
		const sum = offline.createGain();

		current.connect(delayNode);
		current.connect(dry);
		delayNode.connect(wet);
		wet.connect(sum);
		dry.connect(sum);
		current = sum;
	}

	// 7) Reverb
	if (chain.reverb.enabled) {
		const preset =
			REVERB_PRESETS.find((p) => p.id === chain.reverb.presetId) ??
			REVERB_PRESETS[1];
		const convolver = offline.createConvolver();
		convolver.buffer = buildReverbImpulseResponse({
			audioContext: offline,
			preset,
		});
		const wet = offline.createGain();
		wet.gain.value = chain.reverb.mix;
		const dry = offline.createGain();
		dry.gain.value = 1 - chain.reverb.mix;
		const sum = offline.createGain();

		current.connect(convolver);
		current.connect(dry);
		convolver.connect(wet);
		wet.connect(sum);
		dry.connect(sum);
		current = sum;
	}

	// 8) Voice changer: pitch shifting is applied separately by
	// `pitchShiftBuffer`; the offline graph only carries the signal through.

	// Wire to destination
	current.connect(offline.destination);

	try {
		const rendered = await offline.startRendering();
		return rendered;
	} catch (err) {
		console.warn("Audio effects processing failed, returning original:", err);
		return buffer;
	}
}

/**
 * Apply only a single voice changer preset to a buffer. We dispatch on the
 * preset to apply the right combination of pitch shift + filtering.
 */
export async function pitchShiftBuffer({
	buffer,
	semitones,
}: {
	buffer: AudioBuffer;
	semitones: number;
}): Promise<AudioBuffer> {
	if (semitones === 0) return buffer;
	// Simple resampling-based pitch shift
	const ratio = 2 ** (semitones / 12);
	const numChannels = buffer.numberOfChannels;
	const sampleRate = buffer.sampleRate;
	const newLength = Math.floor(buffer.length / ratio);
	const ctx = new OfflineAudioContext(numChannels, newLength, sampleRate);

	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.playbackRate.value = ratio;
	// Cannot preserve pitch in offline without expensive phase vocoder.
	source.connect(ctx.destination);
	source.start(0);

	const rendered = await ctx.startRendering();

	// After rendering at faster rate, the buffer is shorter. Re-construct a
	// buffer of the same length as the input by re-sampling it back.
	const out = new OfflineAudioContext(numChannels, buffer.length, sampleRate);
	const source2 = out.createBufferSource();
	source2.buffer = rendered;
	source2.playbackRate.value = 1 / ratio;
	source2.connect(out.destination);
	source2.start(0);
	return out.startRendering();
}
