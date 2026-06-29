import {
	Input,
	ALL_FORMATS,
	BlobSource,
	AudioBufferSink,
	type InputAudioTrack,
} from "mediabunny";
import { createTimelineAudioBuffer } from "@/lib/media/audio";
import type { AudioElement, SceneTracks, VideoElement } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { yieldToEventLoop } from "@/lib/media/yield";

/**
 * Metadata for a single embedded audio track in a media file. Used to
 * populate the dubbing/track selector in the properties panel when a
 * video has multiple audio tracks (e.g. MKV with multiple language
 * dubs). The `index` is the 0-based position in `Input.getAudioTracks()`
 * and is the value stored on `VideoElement.selectedAudioTrackIndex`.
 */
export interface AudioTrackInfo {
	/** 0-based index among all audio tracks in file order. */
	index: number;
	/** ISO 639-2/T language code, or `'und'` if unknown. */
	languageCode: string;
	/** User-defined track name from the container, or `null`. */
	name: string | null;
	/** Codec identifier string (e.g. `'aac'`, `'mp3'`), or `null`. */
	codec: string | null;
}

export async function getVideoInfo({
	videoFile,
}: {
	videoFile: File;
}): Promise<{
	duration: number;
	width: number;
	height: number;
	fps: number;
	hasAudio: boolean;
	audioTracks: AudioTrackInfo[];
}> {
	const input = new Input({
		source: new BlobSource(videoFile),
		formats: ALL_FORMATS,
	});

	try {
		const duration = await input.computeDuration();
		const videoTrack = await input.getPrimaryVideoTrack();

		if (!videoTrack) {
			throw new Error("No video track found in the file");
		}

		const packetStats = await videoTrack.computePacketStats(100);
		const fps = packetStats.averagePacketRate;
		const audioTracks = await input.getAudioTracks();

		// Build track metadata list. Each track's codec is resolved
		// lazily by mediabunny, so we await it here. If a codec fails
		// to resolve, we store null rather than failing the entire
		// import — the track can still be selected by index/language.
		const trackInfos: AudioTrackInfo[] = [];
		for (let i = 0; i < audioTracks.length; i++) {
			const track = audioTracks[i];
			let codec: string | null = null;
			try {
				const resolvedCodec = await track.getCodec();
				codec = resolvedCodec ? String(resolvedCodec) : null;
			} catch {
				codec = null;
			}
			trackInfos.push({
				index: i,
				languageCode: await track.getLanguageCode(),
				name: await track.getName(),
				codec,
			});
		}

		return {
			duration,
			width: videoTrack.displayWidth,
			height: videoTrack.displayHeight,
			fps,
			hasAudio: audioTracks.length > 0,
			audioTracks: trackInfos,
		};
	} finally {
		input.dispose();
	}
}

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 2;
const EMPTY_TIMELINE_SILENT_DURATION_SECONDS = 0.1;
const MIN_SILENT_DURATION_SECONDS = 0.001;

/**
 * Resolves a specific audio track from an input by 0-based index.
 * Falls back to the primary audio track when the index is out of
 * range or absent, matching the pre-multi-track behavior. Returns
 * `null` when the file has no audio tracks at all.
 */
export async function resolveAudioTrackByIndex({
	input,
	trackIndex,
}: {
	input: Input;
	trackIndex?: number;
}): Promise<InputAudioTrack | null> {
	if (trackIndex === undefined || trackIndex < 0) {
		return input.getPrimaryAudioTrack();
	}
	const tracks = await input.getAudioTracks();
	if (tracks.length === 0) return null;
	const safeIndex = Math.min(trackIndex, tracks.length - 1);
	return tracks[safeIndex] ?? input.getPrimaryAudioTrack();
}

export const extractTimelineAudio = async ({
	tracks,
	mediaAssets,
	totalDuration,
	onProgress,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
	totalDuration: number;
	onProgress?: (progress: number) => void;
}): Promise<Blob> => {
	if (totalDuration === 0) {
		return createWavBlob({
			samples: new Float32Array(
				SAMPLE_RATE * EMPTY_TIMELINE_SILENT_DURATION_SECONDS,
			),
		});
	}

	onProgress?.(10);

	const audioBuffer = await createTimelineAudioBuffer({
		tracks,
		mediaAssets,
		duration: totalDuration,
		sampleRate: SAMPLE_RATE,
	});

	if (!audioBuffer) {
		const silentDurationSeconds = Math.max(
			MIN_SILENT_DURATION_SECONDS,
			totalDuration / TICKS_PER_SECOND,
		);
		const silentSamples = new Float32Array(
			Math.ceil(silentDurationSeconds * SAMPLE_RATE) * NUM_CHANNELS,
		);
		return createWavBlob({ samples: silentSamples });
	}

	onProgress?.(90);

	const interleavedSamples = await interleaveAudioBuffer({ audioBuffer });
	onProgress?.(100);

	return createWavBlob({ samples: interleavedSamples });
};

async function interleaveAudioBuffer({
	audioBuffer,
}: {
	audioBuffer: AudioBuffer;
}): Promise<Float32Array> {
	const numChannels = Math.min(NUM_CHANNELS, audioBuffer.numberOfChannels);
	const interleavedSamples = new Float32Array(
		audioBuffer.length * NUM_CHANNELS,
	);

	for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex++) {
		for (let channel = 0; channel < NUM_CHANNELS; channel++) {
			const sourceChannel = Math.min(channel, Math.max(0, numChannels - 1));
			interleavedSamples[sampleIndex * NUM_CHANNELS + channel] =
				audioBuffer.getChannelData(sourceChannel)[sampleIndex] ?? 0;
		}
		// Yield periodically so the main thread stays responsive on
		// long audio files (millions of samples).
		if (sampleIndex % 8192 === 0 && sampleIndex > 0) {
			await yieldToEventLoop();
		}
	}

	return interleavedSamples;
}

async function createWavBlob({
	samples,
}: {
	samples: Float32Array;
}): Promise<Blob> {
	const numChannels = NUM_CHANNELS;
	const bitsPerSample = 16;
	const bytesPerSample = bitsPerSample / 8;
	const numSamples = samples.length / numChannels;
	const dataSize = numSamples * numChannels * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// riff header
	writeString({ view, offset: 0, str: "RIFF" });
	view.setUint32(4, 36 + dataSize, true);
	writeString({ view, offset: 8, str: "WAVE" });

	// fmt chunk
	writeString({ view, offset: 12, str: "fmt " });
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, SAMPLE_RATE, true);
	view.setUint32(28, SAMPLE_RATE * numChannels * bytesPerSample, true);
	view.setUint16(32, numChannels * bytesPerSample, true);
	view.setUint16(34, bitsPerSample, true);

	// data chunk
	writeString({ view, offset: 36, str: "data" });
	view.setUint32(40, dataSize, true);

	// convert float32 to int16 and write — yield periodically so the
	// main thread stays responsive on long audio files.
	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
		const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
		view.setInt16(offset, int16, true);
		offset += 2;
		if (i % 8192 === 0 && i > 0) await yieldToEventLoop();
	}

	return new Blob([buffer], { type: "audio/wav" });
}

function writeString({
	view,
	offset,
	str,
}: {
	view: DataView;
	offset: number;
	str: string;
}): void {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}

const CLIP_NUM_CHANNELS = 2;

export async function extractClipAudio({
	element,
	mediaAssets,
}: {
	element: AudioElement | VideoElement;
	mediaAssets: MediaAsset[];
}): Promise<Blob> {
	if (!("mediaId" in element) || !element.mediaId) {
		return createWavBlob({ samples: new Float32Array(0) });
	}

	const asset = mediaAssets.find((a) => a.id === element.mediaId);
	if (!asset) {
		return createWavBlob({ samples: new Float32Array(0) });
	}

	const startSeconds = (element.trimStart ?? 0) / TICKS_PER_SECOND;
	const endSeconds = startSeconds + element.duration / TICKS_PER_SECOND;
	// For video elements, use the selected dubbing track index if present.
	// Audio elements don't have multi-track selection.
	const audioTrackIndex =
		element.type === "video" ? element.selectedAudioTrackIndex : undefined;

	let input: Input | null = null;
	try {
		input = new Input({
			source: new BlobSource(asset.file),
			formats: ALL_FORMATS,
		});
		const audioTrack = await resolveAudioTrackByIndex({
			input,
			trackIndex: audioTrackIndex,
		});
		if (!audioTrack) {
			return createWavBlob({ samples: new Float32Array(0) });
		}

		const sink = new AudioBufferSink(audioTrack);
		const collected: Float32Array[] = [];
		let totalLength = 0;
		const startTime = Math.max(0, startSeconds);
		const endTime = Math.max(startTime + 0.01, endSeconds);

		for await (const wrapped of sink.buffers()) {
			const { buffer, timestamp: bufStart, duration: bufDuration } = wrapped;
			const bufEnd = bufStart + bufDuration;
			if (bufEnd <= startTime) continue;
			if (bufStart >= endTime) break;

			const sliceStart = Math.max(0, startTime - bufStart);
			const sliceEnd = Math.min(bufDuration, endTime - bufStart);
			const startSample = Math.floor(sliceStart * buffer.sampleRate);
			const endSample = Math.ceil(sliceEnd * buffer.sampleRate);
			const length = Math.max(0, endSample - startSample);

			if (length <= 0) continue;

			const channelCount = Math.min(CLIP_NUM_CHANNELS, buffer.numberOfChannels);
			const mixed = new Float32Array(length);

			for (let ch = 0; ch < channelCount; ch++) {
				const data = buffer.getChannelData(ch);
				for (let i = 0; i < length; i++) {
					mixed[i] += (data[startSample + i] ?? 0) / channelCount;
					// Yield inside the inner loop too — a single buffer
					// can contain hundreds of thousands of samples, and
					// only yielding between channels still freezes the
					// UI for the entire buffer duration.
					if (i % 16384 === 0 && i > 0) await yieldToEventLoop();
				}
				// Yield between channels to keep UI responsive.
				if (length > 8192) await yieldToEventLoop();
			}

			collected.push(mixed);
			totalLength += length;
		}

		if (totalLength === 0) {
			return createWavBlob({ samples: new Float32Array(0) });
		}

		const interleaved = new Float32Array(totalLength * CLIP_NUM_CHANNELS);
		let offset = 0;
		for (const arr of collected) {
			for (let i = 0; i < arr.length; i++) {
				interleaved[(offset + i) * CLIP_NUM_CHANNELS] = arr[i] ?? 0;
				interleaved[(offset + i) * CLIP_NUM_CHANNELS + 1] = arr[i] ?? 0;
				if (i % 16384 === 0 && i > 0) await yieldToEventLoop();
			}
			offset += arr.length;
			// Yield between collected chunks to keep UI responsive.
			if (arr.length > 8192) await yieldToEventLoop();
		}

		return createWavBlob({ samples: interleaved });
	} catch (error) {
		console.warn("extractClipAudio failed:", error);
		return createWavBlob({ samples: new Float32Array(0) });
	} finally {
		input?.dispose();
	}
}

export async function extractAssetAudio({
	asset,
}: {
	asset: { file: File; duration?: number | null; name?: string };
}): Promise<Blob> {
	let input: Input | null = null;
	try {
		input = new Input({
			source: new BlobSource(asset.file),
			formats: ALL_FORMATS,
		});
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) {
			return createWavBlob({ samples: new Float32Array(0) });
		}

		const sink = new AudioBufferSink(audioTrack);
		const collected: Float32Array[] = [];
		let totalLength = 0;

		for await (const wrapped of sink.buffers()) {
			const { buffer } = wrapped;
			const length = buffer.length;
			if (length <= 0) continue;

			const channelCount = Math.min(CLIP_NUM_CHANNELS, buffer.numberOfChannels);
			const mixed = new Float32Array(length);

			for (let ch = 0; ch < channelCount; ch++) {
				const data = buffer.getChannelData(ch);
				for (let i = 0; i < length; i++) {
					mixed[i] += (data[i] ?? 0) / channelCount;
				}
				// Yield between channels to keep UI responsive.
				if (length > 8192) await yieldToEventLoop();
			}

			collected.push(mixed);
			totalLength += length;
		}

		if (totalLength === 0) {
			return createWavBlob({ samples: new Float32Array(0) });
		}

		const interleaved = new Float32Array(totalLength * CLIP_NUM_CHANNELS);
		let offset = 0;
		for (const arr of collected) {
			for (let i = 0; i < arr.length; i++) {
				interleaved[(offset + i) * CLIP_NUM_CHANNELS] = arr[i] ?? 0;
				interleaved[(offset + i) * CLIP_NUM_CHANNELS + 1] = arr[i] ?? 0;
				if (i % 16384 === 0 && i > 0) await yieldToEventLoop();
			}
			offset += arr.length;
			// Yield between collected chunks to keep UI responsive.
			if (arr.length > 8192) await yieldToEventLoop();
		}

		return createWavBlob({ samples: interleaved });
	} catch (error) {
		console.warn("extractAssetAudio failed:", error);
		return createWavBlob({ samples: new Float32Array(0) });
	} finally {
		input?.dispose();
	}
}
