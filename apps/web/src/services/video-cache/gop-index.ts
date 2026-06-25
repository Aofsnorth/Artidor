/**
 * GOP (Group of Pictures) index builder for fast video seeking.
 *
 * The root cause of slow seeking in long videos is GOP structure: compressed
 * video stores full frames (keyframes / I-frames) every 2-10 seconds, with
 * delta frames (P/B-frames) in between. To display a frame at an arbitrary
 * timestamp, the decoder must start from the nearest preceding keyframe and
 * decode all frames up to the target.
 *
 * Without a GOP index, the seeker has to scan through packets sequentially
 * to find the keyframe — O(n) in the number of packets. With a GOP index
 * (a sorted array of keyframe timestamps), finding the nearest keyframe is
 * O(log n) via binary search, and the seeker can jump directly to it.
 *
 * For a 15-minute video with 5-second GOP intervals:
 * - Without index: scan ~18,000 packets to find the keyframe
 * - With index: binary search ~180 keyframe timestamps
 *
 * The index is built once on video import using mediabunny's
 * `EncodedPacketSink.getKeyPacket()` + `getNextKeyPacket()` with
 * `metadataOnly: true` (no packet data loaded — fast).
 */

import {
	Input,
	ALL_FORMATS,
	BlobSource,
	EncodedPacketSink,
	type EncodedPacket,
} from "mediabunny";

export interface GOPIndex {
	mediaId: string;
	/** Keyframe timestamps in seconds, sorted ascending. */
	keyframeTimes: number[];
	/** Total video duration in seconds. */
	duration: number;
}

/**
 * Build a GOP index for a video file. This scans the keyframe table
 * (metadata only — no packet data is loaded), so it's fast even for
 * long videos. For a 15-minute 1080p video, this typically takes
 * 50-200ms.
 *
 * The index should be built once on import and cached (e.g. in
 * IndexedDB or in-memory on the VideoCache).
 */
export async function buildGOPIndex({
	file,
	mediaId,
}: {
	file: File;
	mediaId: string;
}): Promise<GOPIndex> {
	let input: Input | null = null;
	try {
		input = new Input({
			source: new BlobSource(file),
			formats: ALL_FORMATS,
		});

		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) {
			throw new Error("No video track found");
		}

		const packetSink = new EncodedPacketSink(videoTrack);
		const keyframeTimes: number[] = [];

		// Get the first keyframe (metadata only — fast).
		let keyPacket: EncodedPacket | null =
			await packetSink.getFirstKeyPacket({ metadataOnly: true });

		while (keyPacket) {
			// EncodedPacket.timestamp is in seconds.
			keyframeTimes.push(keyPacket.timestamp);
			keyPacket = await packetSink.getNextKeyPacket(keyPacket, {
				metadataOnly: true,
			});
		}

		const duration = await input.computeDuration(undefined, {
			skipLiveWait: true,
		});

		return {
			mediaId,
			keyframeTimes,
			duration,
		};
	} finally {
		input?.dispose();
	}
}

/**
 * Find the nearest keyframe at or before the given timestamp using
 * binary search. Returns the keyframe timestamp, or null if no
 * keyframe exists before the target (i.e. target is before the first
 * keyframe).
 *
 * O(log n) where n = number of keyframes.
 */
export function findNearestKeyframe(
	targetTime: number,
	gopIndex: GOPIndex,
): number | null {
	const times = gopIndex.keyframeTimes;
	if (times.length === 0) return null;

	// Before the first keyframe — no valid keyframe to start from.
	if (targetTime < times[0]!) return null;

	// At or after the last keyframe — use the last one.
	if (targetTime >= times[times.length - 1]!) {
		return times[times.length - 1]!;
	}

	// Binary search: find the largest keyframe time <= targetTime.
	let lo = 0;
	let hi = times.length - 1;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (times[mid]! <= targetTime) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	return times[lo]!;
}
