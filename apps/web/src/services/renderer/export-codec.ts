/**
 * Shared export codec negotiation.
 *
 * Both the single-worker exporter and the parallel (multi-segment) exporter
 * must agree on the *exact* video/audio codec so that independently encoded
 * segments can be stitched together at the packet level without re-encoding.
 * Centralising the negotiation here guarantees every encoder — across every
 * worker — produces a bitstream-compatible track.
 *
 * The logic mirrors what `SceneExporter` used inline: pick the preferred codec
 * for the requested container, then fall back along a compatibility chain when
 * the browser can't encode it.
 */

import {
	QUALITY_HIGH,
	QUALITY_LOW,
	QUALITY_MEDIUM,
	QUALITY_VERY_HIGH,
	type Quality,
} from "mediabunny";
import type { ExportFormat, ExportQuality } from "@/lib/export";

export type ExportVideoCodec = "avc" | "vp9" | "hevc" | "av1";
export type ExportAudioCodec = "aac" | "opus";

/**
 * True for codecs that require even width and height (chroma subsampling
 * needs sample-aligned coded sizes). AVC (H.264) and HEVC (H.265) both
 * fall in this bucket; VP9 and AV1 are fine with odd dimensions.
 */
export function codecRequiresEvenDimensions(codec: ExportVideoCodec): boolean {
	return codec === "avc" || codec === "hevc";
}

/**
 * Return width/height rounded up to the nearest even integer when the
 * codec requires it. Otherwise returns the inputs unchanged.
 *
 * For codecs that do require even dimensions, the `codedWidth`/`codedHeight`
 * passed to the encoder become the rounded values while the original
 * `displayWidth`/`displayHeight` instruct the container to scale the
 * encoded frame to the requested size on playback. This keeps the visible
 * output identical while making the encoder happy — the alternative
 * (rounding the canvas size) would shift pixels and crop the frame.
 */
export function encoderSafeDimensions({
	width,
	height,
	codec,
}: {
	width: number;
	height: number;
	codec: ExportVideoCodec;
}): { codedWidth: number; codedHeight: number } {
	if (!codecRequiresEvenDimensions(codec)) {
		return { codedWidth: width, codedHeight: height };
	}
	return {
		codedWidth: width + (width % 2),
		codedHeight: height + (height % 2),
	};
}

/**
 * Maps the user-facing quality tier to a mediabunny {@link Quality} factor.
 * The factor scales the target bitrate with the output resolution, so the same
 * tier yields a consistent perceptual quality across 720p…4K.
 */
export const EXPORT_QUALITY_MAP: Record<ExportQuality, Quality> = {
	low: QUALITY_LOW,
	medium: QUALITY_MEDIUM,
	high: QUALITY_HIGH,
	very_high: QUALITY_VERY_HIGH,
};

/** The preferred video codec for a given container/format before fallback. */
export function preferredVideoCodec(format: ExportFormat): ExportVideoCodec {
	if (format === "webm") return "vp9";
	if (format === "hevc") return "hevc";
	if (format === "av1") return "av1";
	return "avc";
}

/**
 * Pick the AVC codec string that matches the output resolution.
 *
 * Hardware encoders often reject High Profile Level 6.0 (6000+ px) while
 * accepting the same bitstream via software. We probe the highest-level
 * profile that fits the dimensions so we detect support accurately.
 */
function avcCodecStringForDimensions(width: number, height: number): string {
	const pixels = width * height;
	// Level 6.0 → ≥3840×2160 (4K and above) — 0x64003c
	if (pixels > 3840 * 2160) return "avc1.64003c";
	// Level 5.1 → 1920×1080..4K — 0x640033
	if (pixels > 1920 * 1080) return "avc1.640033";
	// Level 4.1 → up to 1080p — 0x640029
	return "avc1.640029";
}

/** Negotiated video encoding parameters returned by {@link negotiateVideoCodec}. */
export interface NegotiatedVideoCodec {
	codec: ExportVideoCodec;
	/**
	 * Hardware acceleration hint to pass to the encoder. Defaults to
	 * `"prefer-hardware"` but downgrades to `"prefer-software"` when the
	 * browser's hardware encoder rejects the config (e.g. AVC High Profile
	 * Level 6.0 at >4K on some GPUs/browsers).
	 */
	hardwareAcceleration: "prefer-hardware" | "prefer-software";
	/**
	 * The output container format the caller should use. Normally matches the
	 * requested `format`, but when the codec falls back to VP9 (because AVC is
	 * not supported at the target resolution), this is `"webm"` — VP9 in an
	 * MP4 container is non-standard and many players won't play it.
	 */
	outputFormat: ExportFormat;
}

/**
 * Detect whether an error is the WebCodecs "encoder configuration not
 * supported" error thrown by mediabunny when `VideoEncoder.configure()`
 * rejects a config that `isConfigSupported` had previously reported as
 * supported.
 *
 * `isConfigSupported` is unreliable for the `hardwareAcceleration` field in
 * some browsers (notably Firefox, which reports `supported: true` for
 * `prefer-hardware` even though no hardware VideoEncoder backend exists).
 * The actual failure surfaces later — during `VideoEncoder.configure()` — as
 * an error whose message contains "not supported by this browser". Callers
 * use this helper to decide whether a retry with `prefer-software` is
 * worthwhile.
 */
export function isEncoderConfigError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("not supported by this browser");
}

/**
 * Resolve the video codec to use for an export, checking encoder support for
 * the modern codecs (HEVC/AV1) and falling back to a widely supported codec
 * when unavailable. AVC and VP9 are also validated against the actual
 * resolution so that unsupported hardware encoder configurations are caught
 * before encoding begins.
 *
 * Returns the *negotiated* codec **and** hardware-acceleration hint so callers
 * (single worker, parallel segment workers, and the segment concatenator) can
 * all pin identical settings and avoid encoder failures at large resolutions.
 *
 * @param forceSoftware - When true, skip the hardware-acceleration probe and
 *   return `"prefer-software"` unconditionally. Used by the retry path after
 *   an encoder configuration error — `isConfigSupported` can report hardware
 *   as supported while the actual `VideoEncoder.configure()` rejects it
 *   (Firefox), so the only reliable fallback is to force software encoding.
 */
/**
 * A single candidate in the codec fallback chain. The negotiator probes
 * candidates in order and returns the first one that `isConfigSupported`
 * reports as supported. The chain is built from the requested format, so
 * the preferred codec is tried first, then progressively safer fallbacks.
 */
interface CodecCandidate {
	codec: ExportVideoCodec;
	format: ExportFormat;
	hardwareAcceleration: "prefer-hardware" | "prefer-software";
}

/**
 * The codec string to pass to `VideoEncoder.isConfigSupported` for each
 * codec. AVC needs a level-appropriate string (High Profile Level 4.1/5.1/
 * 6.0 depending on resolution); the others use a fixed profile string.
 */
function codecStringFor(
	codec: ExportVideoCodec,
	width: number,
	height: number,
): string {
	switch (codec) {
		case "avc":
			return avcCodecStringForDimensions(width, height);
		case "hevc":
			return "hev1.1.6.L93.B0";
		case "av1":
			return "av01.0.15M.08";
		case "vp9":
			return "vp09.00.10.08";
	}
}

/**
 * Build the ordered fallback chain of codec candidates for a given format
 * and resolution.
 *
 * The chain is:
 * 1. Requested codec, hardware acceleration (skipped when `forceSoftware`)
 * 2. Requested codec, software acceleration
 * 3. AVC, software (if the requested codec was HEVC/AV1 and both failed)
 * 4. VP9, software, WebM container (ultimate fallback — handles any
 *    resolution in software on both Chrome and Firefox)
 *
 * `isConfigSupported` is unreliable for the `hardwareAcceleration` field
 * across all browsers — Chrome reports AV1 as "supported" with
 * `prefer-hardware` but the actual encoder rejects it at 6K; Firefox
 * reports AVC hardware as "supported" but has no hardware encoder at all.
 * The only reliable strategy is to probe each (codec, hardwareAcceleration)
 * combination explicitly and fall through to the next on failure.
 */
function buildCodecChain(
	format: ExportFormat,
	forceSoftware: boolean,
): CodecCandidate[] {
	const preferred = preferredVideoCodec(format);
	const chain: CodecCandidate[] = [];

	// 1. Preferred codec with hardware acceleration (skip on forceSoftware).
	if (!forceSoftware) {
		chain.push({
			codec: preferred,
			format,
			hardwareAcceleration: "prefer-hardware",
		});
	}

	// 2. Preferred codec with software acceleration.
	chain.push({
		codec: preferred,
		format,
		hardwareAcceleration: "prefer-software",
	});

	// 3. AVC software (if preferred wasn't already AVC software).
	//    Chrome's OpenH264 handles up to ~4K; above that it may reject
	//    Level 6.0. Still worth trying before the VP9 fallback.
	if (preferred !== "avc") {
		chain.push({
			codec: "avc",
			format: "mp4",
			hardwareAcceleration: "prefer-software",
		});
	}

	// 4. VP9 software in WebM — the ultimate fallback. VP9 (libvpx) in
	//    software handles any resolution on both Chrome and Firefox. The
	//    trade-off is a WebM container instead of MP4, but a working WebM
	//    export is better than a failed MP4 export.
	if (preferred !== "vp9") {
		chain.push({
			codec: "vp9",
			format: "webm",
			hardwareAcceleration: "prefer-software",
		});
	}

	return chain;
}

const codecNegotiationCache = new Map<string, Promise<NegotiatedVideoCodec>>();

function negotiationKey(
	format: ExportFormat,
	quality: ExportQuality,
	width: number,
	height: number,
	fpsFloat: number,
	forceSoftware: boolean,
): string {
	return JSON.stringify({
		format,
		quality,
		width,
		height,
		fpsFloat,
		forceSoftware,
	});
}

export async function negotiateVideoCodec({
	format,
	quality,
	width,
	height,
	fpsFloat,
	forceSoftware = false,
}: {
	format: ExportFormat;
	quality: ExportQuality;
	width: number;
	height: number;
	fpsFloat: number;
	forceSoftware?: boolean;
}): Promise<NegotiatedVideoCodec> {
	const key = negotiationKey(
		format,
		quality,
		width,
		height,
		fpsFloat,
		forceSoftware,
	);
	const cached = codecNegotiationCache.get(key);
	if (cached) return cached;

	const promise = (async (): Promise<NegotiatedVideoCodec> => {
		const defaultResult: NegotiatedVideoCodec = {
			codec: preferredVideoCodec(format),
			hardwareAcceleration: forceSoftware
				? "prefer-software"
				: "prefer-hardware",
			outputFormat: format,
		};

		if (typeof VideoEncoder === "undefined") return defaultResult;

		const chain = buildCodecChain(format, forceSoftware);

		for (const candidate of chain) {
			try {
				const codecStr = codecStringFor(candidate.codec, width, height);
				const { supported } = await VideoEncoder.isConfigSupported({
					width,
					height,
					framerate: fpsFloat,
					codec: codecStr,
					hardwareAcceleration: candidate.hardwareAcceleration,
				});
				if (supported) {
					if (
						candidate.codec !== preferredVideoCodec(format) ||
						candidate.format !== format ||
						candidate.hardwareAcceleration !==
							(forceSoftware ? "prefer-software" : "prefer-hardware")
					) {
						console.info(
							`[export] negotiated codec: ${candidate.codec} (${candidate.hardwareAcceleration}) in ${candidate.format}` +
								(candidate.codec !== preferredVideoCodec(format)
									? ` (fallback from ${preferredVideoCodec(format)})`
									: ""),
						);
					}
					return {
						codec: candidate.codec,
						hardwareAcceleration: candidate.hardwareAcceleration,
						outputFormat: candidate.format,
					};
				}
				console.info(
					`[export] ${candidate.codec} (${candidate.hardwareAcceleration}) not supported at ${width}x${height}, trying next fallback`,
				);
			} catch {
				console.info(
					`[export] ${candidate.codec} (${candidate.hardwareAcceleration}) probe threw at ${width}x${height}, trying next fallback`,
				);
			}
		}

		// All probes failed — return VP9 software in WebM as the last resort.
		// This should be extremely rare (VP9 software handles any resolution on
		// both Chrome and Firefox), but we never want to return a codec that
		// will definitely fail.
		console.warn(
			"[export] all codec probes failed, using VP9 software in WebM as last resort",
		);
		return {
			codec: "vp9",
			hardwareAcceleration: "prefer-software",
			outputFormat: "webm",
		};
	})();

	codecNegotiationCache.set(key, promise);
	return promise;
}

/**
 * Resolve the audio codec for an export. AAC for MP4-family containers, Opus
 * for WebM. Falls back to Opus when the browser can't encode AAC.
 */
export async function negotiateAudioCodec({
	format,
	sampleRate,
	numberOfChannels,
}: {
	format: ExportFormat;
	sampleRate: number;
	numberOfChannels: number;
}): Promise<ExportAudioCodec> {
	let codec: ExportAudioCodec = format === "webm" ? "opus" : "aac";

	if (codec === "aac" && typeof AudioEncoder !== "undefined") {
		try {
			const { supported } = await AudioEncoder.isConfigSupported({
				codec: "mp4a.40.2",
				sampleRate,
				numberOfChannels,
				bitrate: 192000,
			});
			if (!supported) codec = "opus";
		} catch {
			codec = "opus";
		}
	}

	return codec;
}

/** Fixed audio bitrate per codec — transparent for stereo music/speech. */
export function audioBitrateFor(codec: ExportAudioCodec): number {
	return codec === "opus" ? 64000 : 128000;
}
