import type {
	AudioElement,
	VideoElement,
	LibraryAudioElement,
	RetimeConfig,
	SceneTracks,
} from "@/lib/timeline";
import { shouldMaintainPitch } from "@/lib/retime/rate";
import type { MediaAsset } from "@/lib/media/types";
import { applyAudioMasteringToBuffer } from "@/lib/media/audio-mastering";
import type { AudioCapableElement } from "@/lib/timeline/audio-state";
import {
	hasAnimatedVolume,
	resolveEffectiveAudioGain,
	hasAnimatedPan,
	resolveEffectiveAudioPan,
} from "@/lib/timeline/audio-state";
import { doesElementHaveEnabledAudio } from "@/lib/timeline/audio-separation";
import { canElementHaveAudio, hasMediaId } from "@/lib/timeline/element-utils";
import { canTrackHaveAudio } from "@/lib/timeline";
import { mediaSupportsAudio } from "@/lib/media/media-utils";
import { getSourceTimeAtClipTime, renderRetimedBuffer } from "@/lib/retime";
import { Input, ALL_FORMATS, BlobSource, AudioBufferSink } from "mediabunny";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { yieldToEventLoop } from "@/lib/media/yield";

const MAX_AUDIO_CHANNELS = 2;
const EXPORT_SAMPLE_RATE = 44100;

export interface CollectedAudioElement {
	timelineElement: AudioCapableElement;
	buffer: AudioBuffer;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	volume: number;
	muted: boolean;
	retime?: RetimeConfig;
	pan?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
}

export function createAudioContext({
	sampleRate,
}: {
	sampleRate?: number;
} = {}): AudioContext {
	const AudioContextConstructor =
		window.AudioContext ||
		(window as typeof window & { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;

	return new AudioContextConstructor(sampleRate ? { sampleRate } : undefined);
}

export interface DecodedAudio {
	samples: Float32Array;
	sampleRate: number;
}

export async function decodeAudioToFloat32({
	audioBlob,
	sampleRate,
}: {
	audioBlob: Blob;
	sampleRate?: number;
}): Promise<DecodedAudio> {
	const audioContext = createAudioContext({ sampleRate });
	const arrayBuffer = await audioBlob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

	// mix down to mono — yield periodically so the main thread stays
	// responsive on long audio files (millions of samples).
	const numChannels = audioBuffer.numberOfChannels;
	const length = audioBuffer.length;
	const samples = new Float32Array(length);

	for (let i = 0; i < length; i++) {
		let sum = 0;
		for (let channel = 0; channel < numChannels; channel++) {
			sum += audioBuffer.getChannelData(channel)[i];
		}
		samples[i] = sum / numChannels;
		if (i % 8192 === 0 && i > 0) await yieldToEventLoop();
	}

	return { samples, sampleRate: audioBuffer.sampleRate };
}

export interface AudibleElementCandidate {
	element: AudioElement | VideoElement;
	mediaAsset: MediaAsset | null;
}

export function collectAudibleCandidates({
	tracks,
	mediaAssets,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
}): AudibleElementCandidate[] {
	const allTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	const mediaMap = new Map(mediaAssets.map((a) => [a.id, a]));
	const candidates: AudibleElementCandidate[] = [];

	for (const track of allTracks) {
		if (canTrackHaveAudio(track) && track.muted) continue;

		for (const element of track.elements) {
			if (!canElementHaveAudio(element)) continue;
			if (element.duration <= 0) continue;

			const mediaAsset = hasMediaId(element)
				? (mediaMap.get(element.mediaId) ?? null)
				: null;
			if (!doesElementHaveEnabledAudio({ element, mediaAsset })) continue;

			candidates.push({ element, mediaAsset });
		}
	}

	return candidates;
}

export function timelineHasAudio({
	tracks,
	mediaAssets,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
}): boolean {
	return collectAudibleCandidates({ tracks, mediaAssets }).some(
		({ element }) => element.muted !== true,
	);
}

export async function collectAudioElements({
	tracks,
	mediaAssets,
	audioContext,
	onProgress,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
	audioContext: AudioContext;
	onProgress?: (progress: number) => void;
}): Promise<CollectedAudioElement[]> {
	const candidates = collectAudibleCandidates({ tracks, mediaAssets });
	const mediaMap = new Map<string, MediaAsset>(
		mediaAssets.map((media) => [media.id, media]),
	);
	const pendingElements: Array<Promise<CollectedAudioElement | null>> = [];
	let resolvedCount = 0;
	const totalCandidates = candidates.length;
	const trackProgress = () => {
		resolvedCount++;
		onProgress?.(resolvedCount / Math.max(1, totalCandidates));
	};

	for (const { element, mediaAsset } of candidates) {
		if (element.type === "audio") {
			pendingElements.push(
				resolveAudioBufferForElement({
					element,
					mediaMap,
					audioContext,
				}).then((audioBuffer) => {
					trackProgress();
					if (!audioBuffer) return null;
					return {
						timelineElement: element,
						buffer: audioBuffer,
						startTime: element.startTime / TICKS_PER_SECOND,
						duration: element.duration / TICKS_PER_SECOND,
						trimStart: element.trimStart / TICKS_PER_SECOND,
						trimEnd: element.trimEnd / TICKS_PER_SECOND,
						volume: resolveEffectiveAudioGain({
							element,
							trackMuted: false,
							localTime: 0,
							ignoreFades: true,
						}),
						muted: element.muted === true,
						retime: element.retime,
						pan: element.pan,
						fadeInDuration: element.fadeInDuration,
						fadeOutDuration: element.fadeOutDuration,
					};
				}),
			);
			continue;
		}

		if (element.type === "video") {
			if (!mediaAsset || !mediaSupportsAudio({ media: mediaAsset })) continue;

			pendingElements.push(
				resolveAudioBufferForVideoElement({
					mediaAsset,
					audioContext,
					trimStartSeconds: element.trimStart / TICKS_PER_SECOND,
					durationSeconds: element.duration / TICKS_PER_SECOND,
				}).then((audioBuffer) => {
					trackProgress();
					if (!audioBuffer) return null;
					return {
						timelineElement: element,
						buffer: audioBuffer,
						startTime: element.startTime / TICKS_PER_SECOND,
						duration: element.duration / TICKS_PER_SECOND,
						trimStart: element.trimStart / TICKS_PER_SECOND,
						trimEnd: element.trimEnd / TICKS_PER_SECOND,
						volume: resolveEffectiveAudioGain({
							element,
							trackMuted: false,
							localTime: 0,
							ignoreFades: true,
						}),
						muted: element.muted ?? false,
						retime: element.retime,
						pan: element.pan,
						fadeInDuration: element.fadeInDuration,
						fadeOutDuration: element.fadeOutDuration,
					};
				}),
			);
		}
	}

	const resolvedElements = await Promise.all(pendingElements);
	const audioElements: CollectedAudioElement[] = [];
	for (const element of resolvedElements) {
		if (element) audioElements.push(element);
	}
	onProgress?.(0.3);
	return audioElements;
}

async function resolveAudioBufferForElement({
	element,
	mediaMap,
	audioContext,
}: {
	element: AudioElement;
	mediaMap: Map<string, MediaAsset>;
	audioContext: AudioContext;
}): Promise<AudioBuffer | null> {
	try {
		if (element.sourceType === "upload") {
			const asset = mediaMap.get(element.mediaId);
			if (!asset || !mediaSupportsAudio({ media: asset })) return null;

			if (asset.type !== "audio") {
				return await decodeMediaFileAudioBuffer({
					file: asset.file,
					audioContext,
					trimStartSeconds: element.trimStart / TICKS_PER_SECOND,
					durationSeconds: element.duration / TICKS_PER_SECOND,
				});
			}

			const arrayBuffer = await asset.file.arrayBuffer();
			return await audioContext.decodeAudioData(arrayBuffer.slice(0));
		}

		if (element.buffer) return element.buffer;

		const response = await fetch(element.sourceUrl);
		if (!response.ok) {
			throw new Error(`Library audio fetch failed: ${response.status}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return await audioContext.decodeAudioData(arrayBuffer.slice(0));
	} catch (error) {
		console.warn("Failed to decode audio:", error);
		return null;
	}
}

export async function decodeMediaFileAudioBuffer({
	file,
	audioContext,
	trimStartSeconds = 0,
	durationSeconds,
}: {
	file: File;
	audioContext: AudioContext;
	/** Start decoding from this offset in the source file (seconds). */
	trimStartSeconds?: number;
	/** Maximum duration to decode (seconds). If omitted, decodes to end of file. */
	durationSeconds?: number;
}): Promise<AudioBuffer | null> {
	const input = new Input({
		source: new BlobSource(file),
		formats: ALL_FORMATS,
	});

	try {
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) return null;

		const sink = new AudioBufferSink(audioTrack);
		const targetSampleRate = audioContext.sampleRate;

		// Only decode the trimmed portion we actually need. For a 30s clip in a
		// 30-minute video, this avoids decoding 60× more audio than necessary.
		const startTimestamp = Math.max(0, trimStartSeconds);
		const endTimestamp =
			durationSeconds !== undefined
				? startTimestamp + durationSeconds
				: undefined;

		console.info(
			`[audio] decoding ${file.name} from ${startTimestamp.toFixed(1)}s` +
				(endTimestamp ? ` to ${endTimestamp.toFixed(1)}s` : " to end"),
		);

		const chunks: AudioBuffer[] = [];
		let totalSamples = 0;

		for await (const { buffer } of sink.buffers(startTimestamp, endTimestamp)) {
			chunks.push(buffer);
			totalSamples += buffer.length;
		}

		console.info(
			`[audio] decoded ${file.name}: ${chunks.length} chunks, ${totalSamples} samples`,
		);

		if (chunks.length === 0) return null;

		const nativeSampleRate = chunks[0].sampleRate;
		const numChannels = Math.min(
			MAX_AUDIO_CHANNELS,
			chunks[0].numberOfChannels,
		);

		const nativeChannels = Array.from(
			{ length: numChannels },
			() => new Float32Array(totalSamples),
		);
		let offset = 0;
		for (const chunk of chunks) {
			for (let channel = 0; channel < numChannels; channel++) {
				const sourceData = chunk.getChannelData(
					Math.min(channel, chunk.numberOfChannels - 1),
				);
				nativeChannels[channel].set(sourceData, offset);
			}
			offset += chunk.length;
		}

		// use OfflineAudioContext for high-quality resampling to target rate
		const outputSamples = Math.ceil(
			totalSamples * (targetSampleRate / nativeSampleRate),
		);
		const offlineContext = new OfflineAudioContext(
			numChannels,
			outputSamples,
			targetSampleRate,
		);

		const nativeBuffer = audioContext.createBuffer(
			numChannels,
			totalSamples,
			nativeSampleRate,
		);
		for (let ch = 0; ch < numChannels; ch++) {
			nativeBuffer.copyToChannel(nativeChannels[ch], ch);
		}

		const sourceNode = offlineContext.createBufferSource();
		sourceNode.buffer = nativeBuffer;
		sourceNode.connect(offlineContext.destination);
		sourceNode.start(0);

		return await offlineContext.startRendering();
	} catch (error) {
		console.warn("Failed to decode video audio:", error);
		return null;
	} finally {
		input.dispose();
	}
}

async function resolveAudioBufferForVideoElement({
	mediaAsset,
	audioContext,
	trimStartSeconds = 0,
	durationSeconds,
}: {
	mediaAsset: MediaAsset;
	audioContext: AudioContext;
	trimStartSeconds?: number;
	durationSeconds?: number;
}): Promise<AudioBuffer | null> {
	return decodeMediaFileAudioBuffer({
		file: mediaAsset.file,
		audioContext,
		trimStartSeconds,
		durationSeconds,
	});
}

interface AudioMixSource {
	timelineElement: AudioCapableElement;
	file: File;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	volume: number;
	retime?: RetimeConfig;
}

export interface AudioClipSource {
	timelineElement: AudioCapableElement;
	id: string;
	trackId: string;
	sourceKey: string;
	file: File;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	volume: number;
	muted: boolean;
	lastAppliedGain?: number;
	retime?: RetimeConfig;
}

async function fetchLibraryAudioSource({
	element,
	volume,
}: {
	element: LibraryAudioElement;
	volume: number;
}): Promise<AudioMixSource | null> {
	try {
		const response = await fetch(element.sourceUrl);
		if (!response.ok) {
			throw new Error(`Library audio fetch failed: ${response.status}`);
		}

		const blob = await response.blob();
		const file = new File([blob], `${element.name}.mp3`, {
			type: "audio/mpeg",
		});

		return {
			timelineElement: element,
			file,
			startTime: element.startTime / TICKS_PER_SECOND,
			duration: element.duration / TICKS_PER_SECOND,
			trimStart: element.trimStart / TICKS_PER_SECOND,
			trimEnd: element.trimEnd / TICKS_PER_SECOND,
			volume,
			retime: element.retime,
		};
	} catch (error) {
		console.warn("Failed to fetch library audio:", error);
		return null;
	}
}

async function fetchLibraryAudioClip({
	element,
	muted,
	volume,
	trackId,
}: {
	element: LibraryAudioElement;
	muted: boolean;
	volume: number;
	trackId: string;
}): Promise<AudioClipSource | null> {
	try {
		const response = await fetch(element.sourceUrl);
		if (!response.ok) {
			throw new Error(`Library audio fetch failed: ${response.status}`);
		}

		const blob = await response.blob();
		const file = new File([blob], `${element.name}.mp3`, {
			type: "audio/mpeg",
		});

		return {
			timelineElement: element,
			id: element.id,
			trackId,
			sourceKey: element.id,
			file,
			startTime: element.startTime,
			duration: element.duration,
			trimStart: element.trimStart,
			trimEnd: element.trimEnd,
			volume,
			muted,
			retime: element.retime,
		};
	} catch (error) {
		console.warn("Failed to fetch library audio:", error);
		return null;
	}
}

function collectMediaAudioSource({
	element,
	mediaAsset,
	volume,
}: {
	element: AudioCapableElement;
	mediaAsset: MediaAsset;
	volume: number;
}): AudioMixSource {
	return {
		timelineElement: element,
		file: mediaAsset.file,
		startTime: element.startTime / TICKS_PER_SECOND,
		duration: element.duration / TICKS_PER_SECOND,
		trimStart: element.trimStart / TICKS_PER_SECOND,
		trimEnd: element.trimEnd / TICKS_PER_SECOND,
		volume,
		retime: element.retime,
	};
}

function collectMediaAudioClip({
	element,
	mediaAsset,
	muted,
	volume,
}: {
	element: AudioCapableElement;
	mediaAsset: MediaAsset;
	muted: boolean;
	volume: number;
}): AudioClipSource {
	return {
		timelineElement: element,
		id: element.id,
		trackId: "", // populated by caller
		sourceKey: mediaAsset.id,
		file: mediaAsset.file,
		startTime: element.startTime / TICKS_PER_SECOND,
		duration: element.duration / TICKS_PER_SECOND,
		trimStart: element.trimStart / TICKS_PER_SECOND,
		trimEnd: element.trimEnd / TICKS_PER_SECOND,
		volume,
		muted,
		retime: element.retime,
	};
}

export async function collectAudioMixSources({
	tracks,
	mediaAssets,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
}): Promise<AudioMixSource[]> {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	const audioMixSources: AudioMixSource[] = [];
	const mediaMap = new Map<string, MediaAsset>(
		mediaAssets.map((asset) => [asset.id, asset]),
	);
	const pendingLibrarySources: Array<Promise<AudioMixSource | null>> = [];

	for (const track of orderedTracks) {
		if (canTrackHaveAudio(track) && track.muted) continue;

		for (const element of track.elements) {
			if (!canElementHaveAudio(element)) continue;
			if (element.muted === true) continue;
			const mediaAsset = hasMediaId(element)
				? (mediaMap.get(element.mediaId) ?? null)
				: null;
			if (!doesElementHaveEnabledAudio({ element, mediaAsset })) continue;
			const volume = resolveEffectiveAudioGain({
				element,
				localTime: 0,
			});

			if (element.type === "audio") {
				if (element.sourceType === "upload") {
					const mediaAsset = mediaMap.get(element.mediaId);
					if (!mediaAsset) continue;

					audioMixSources.push(
						collectMediaAudioSource({ element, mediaAsset, volume }),
					);
				} else {
					pendingLibrarySources.push(
						fetchLibraryAudioSource({ element, volume }),
					);
				}
				continue;
			}

			if (element.type === "video") {
				if (mediaAsset && mediaSupportsAudio({ media: mediaAsset })) {
					audioMixSources.push(
						collectMediaAudioSource({ element, mediaAsset, volume }),
					);
				}
			}
		}
	}

	const resolvedLibrarySources = await Promise.all(pendingLibrarySources);
	for (const source of resolvedLibrarySources) {
		if (source) audioMixSources.push(source);
	}

	return audioMixSources;
}

export async function collectAudioClips({
	tracks,
	mediaAssets,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
}): Promise<AudioClipSource[]> {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	const clips: AudioClipSource[] = [];
	const mediaMap = new Map<string, MediaAsset>(
		mediaAssets.map((asset) => [asset.id, asset]),
	);
	const pendingLibraryClips: Array<Promise<AudioClipSource | null>> = [];

	for (const track of orderedTracks) {
		const isTrackMuted = canTrackHaveAudio(track) && track.muted;

		for (const element of track.elements) {
			if (!canElementHaveAudio(element)) continue;

			const mediaAsset = hasMediaId(element)
				? (mediaMap.get(element.mediaId) ?? null)
				: null;
			if (!doesElementHaveEnabledAudio({ element, mediaAsset })) continue;

			const isElementMuted =
				"muted" in element ? (element.muted ?? false) : false;
			const muted = isTrackMuted || isElementMuted;
			const volume = resolveEffectiveAudioGain({
				element,
				trackMuted: isTrackMuted,
				localTime: 0,
				ignoreFades: true,
			});

			if (element.type === "audio") {
				if (element.sourceType === "upload") {
					const mediaAsset = mediaMap.get(element.mediaId);
					if (!mediaAsset) continue;

					clips.push({
						...collectMediaAudioClip({
							element,
							mediaAsset,
							muted,
							volume,
						}),
						trackId: track.id,
					});
				} else {
					pendingLibraryClips.push(
						fetchLibraryAudioClip({
							element,
							muted,
							volume,
							trackId: track.id,
						}),
					);
				}
				continue;
			}

			if (element.type === "video") {
				if (mediaAsset && mediaSupportsAudio({ media: mediaAsset })) {
					clips.push({
						...collectMediaAudioClip({
							element,
							mediaAsset,
							muted,
							volume,
						}),
						trackId: track.id,
					});
				}
			}

			if (element.type === "video") {
				if (mediaAsset && mediaSupportsAudio({ media: mediaAsset })) {
					clips.push({
						...collectMediaAudioClip({
							element,
							mediaAsset,
							muted,
							volume,
						}),
						trackId: track.id,
					});
				}
			}
		}
	}

	const resolvedLibraryClips = await Promise.all(pendingLibraryClips);
	for (const clip of resolvedLibraryClips) {
		if (clip) clips.push(clip);
	}

	return clips;
}

export async function createTimelineAudioBuffer({
	tracks,
	mediaAssets,
	duration,
	sampleRate = EXPORT_SAMPLE_RATE,
	audioContext,
	onProgress,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
	duration: number;
	sampleRate?: number;
	audioContext?: AudioContext;
	onProgress?: (progress: number) => void;
}): Promise<AudioBuffer | null> {
	const context = audioContext ?? createAudioContext({ sampleRate });

	const audioElements = await collectAudioElements({
		tracks,
		mediaAssets,
		audioContext: context,
		// Decode phase: 0 → 0.3
		onProgress: (p) => onProgress?.(Math.min(0.3, p * 0.3)),
	});

	// Decoding audio from source files is complete; the rest is mixing/mastering.
	if (audioElements.length === 0) {
		onProgress?.(1.0);
		return null;
	}

	const outputChannels = 2;
	const durationSeconds = duration / TICKS_PER_SECOND;
	const outputLength = Math.ceil(durationSeconds * sampleRate);
	const outputBuffer = context.createBuffer(
		outputChannels,
		outputLength,
		sampleRate,
	);

	const mixableElements = audioElements.filter((e) => !e.muted);
	let mixedCount = 0;

	for (const element of audioElements) {
		if (element.muted) continue;

		const renderedBuffer = shouldMaintainPitch({
			rate: element.retime?.rate ?? 1,
			maintainPitch: element.retime?.maintainPitch,
		})
			? await renderRetimedBuffer({
					audioContext: context,
					sourceBuffer: element.buffer,
					trimStart: element.trimStart,
					clipDuration: element.duration,
					retime: element.retime,
				})
			: undefined;

		mixAudioChannels({
			element,
			buffer: renderedBuffer ?? element.buffer,
			trimStart: renderedBuffer ? 0 : element.trimStart,
			retime: renderedBuffer ? undefined : element.retime,
			outputBuffer,
			outputLength,
			sampleRate,
		});

		mixedCount++;
		onProgress?.(
			0.3 + 0.6 * (mixedCount / Math.max(1, mixableElements.length)),
		);
	}

	onProgress?.(0.95);
	const mastered = await applyAudioMasteringToBuffer({ audioBuffer: outputBuffer });
	onProgress?.(1.0);
	return mastered;
}

function mixAudioChannels({
	element,
	buffer,
	trimStart,
	retime,
	outputBuffer,
	outputLength,
	sampleRate,
}: {
	element: CollectedAudioElement;
	buffer: AudioBuffer;
	trimStart: number;
	retime?: RetimeConfig;
	outputBuffer: AudioBuffer;
	outputLength: number;
	sampleRate: number;
}): void {
	const { startTime, duration: elementDuration } = element;

	const outputStartSample = Math.floor(startTime * sampleRate);
	const renderedLength = Math.ceil(elementDuration * sampleRate);

	const outputChannels = 2;
	for (let channel = 0; channel < outputChannels; channel++) {
		const outputData = outputBuffer.getChannelData(channel);
		const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
		const sourceData = buffer.getChannelData(sourceChannel);

		for (let i = 0; i < renderedLength; i++) {
			const outputIndex = outputStartSample + i;
			if (outputIndex >= outputLength) break;

			const clipTime = i / sampleRate;
			const sourceTime =
				trimStart +
				getSourceTimeAtClipTime({
					clipTime,
					retime,
					clipDuration: elementDuration,
				});
			const sourceIndex = sourceTime * buffer.sampleRate;
			if (sourceIndex >= sourceData.length) break;

			const lowerIndex = Math.floor(sourceIndex);
			const upperIndex = Math.min(sourceData.length - 1, lowerIndex + 1);
			const fraction = sourceIndex - lowerIndex;

			// Resolve volume/gain
			let gain = hasAnimatedVolume({ element: element.timelineElement })
				? resolveEffectiveAudioGain({
						element: element.timelineElement,
						localTime: clipTime,
					})
				: element.volume;

			// Apply Fade In
			if (element.fadeInDuration && element.fadeInDuration > 0) {
				if (clipTime < element.fadeInDuration) {
					gain *= clipTime / element.fadeInDuration;
				}
			}

			// Apply Fade Out
			if (element.fadeOutDuration && element.fadeOutDuration > 0) {
				const timeFromEnd = elementDuration - clipTime;
				if (timeFromEnd < element.fadeOutDuration) {
					gain *= Math.max(0, timeFromEnd / element.fadeOutDuration);
				}
			}

			// Apply Stereo Panning (pan ranges from -100 to 100)
			const panVal = hasAnimatedPan({ element: element.timelineElement })
				? resolveEffectiveAudioPan({
						element: element.timelineElement,
						localTime: clipTime,
					})
				: (element.pan ?? 0);
			const p = Math.min(100, Math.max(-100, panVal)) / 100;
			// Channel 0 is Left, Channel 1 is Right
			const channelGain =
				channel === 0 ? 1 - Math.max(0, p) : 1 - Math.max(0, -p);

			outputData[outputIndex] +=
				(sourceData[lowerIndex] * (1 - fraction) +
					sourceData[upperIndex] * fraction) *
				gain *
				channelGain;
		}
	}
}
