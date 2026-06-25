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

/** The fallback video codec when the preferred one can't be encoded. */
function fallbackVideoCodec(format: ExportFormat): ExportVideoCodec {
	return format === "webm" ? "vp9" : "avc";
}

/**
 * Resolve the video codec to use for an export, checking encoder support for
 * the modern codecs (HEVC/AV1) and falling back to a widely supported codec
 * when unavailable. AVC and VP9 are assumed available and returned directly.
 *
 * Returns the *negotiated* codec so callers (single worker, parallel segment
 * workers, and the segment concatenator) can all pin the identical codec.
 */
export async function negotiateVideoCodec({
	format,
	quality,
	width,
	height,
	fpsFloat,
}: {
	format: ExportFormat;
	quality: ExportQuality;
	width: number;
	height: number;
	fpsFloat: number;
}): Promise<ExportVideoCodec> {
	let codec = preferredVideoCodec(format);

	if (
		(codec === "hevc" || codec === "av1") &&
		typeof VideoEncoder !== "undefined"
	) {
		try {
			const codecString = codec === "av1" ? "av01.0.16M.08" : "hev1.1.6.L93.B0";
			const bitrate = Math.max(
				1,
				Math.floor(Number(EXPORT_QUALITY_MAP[quality])),
			);
			const { supported } = await VideoEncoder.isConfigSupported({
				codec: codecString,
				width,
				height,
				bitrate,
				framerate: fpsFloat,
			});
			if (!supported) {
				codec = fallbackVideoCodec(format);
			}
		} catch {
			codec = fallbackVideoCodec(format);
		}
	}

	return codec;
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
