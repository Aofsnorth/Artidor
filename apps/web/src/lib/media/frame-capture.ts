import { TICKS_PER_SECOND } from "@/lib/wasm";
import { Input, ALL_FORMATS, BlobSource, CanvasSink } from "mediabunny";

export interface CapturedFrame {
	blob: Blob;
	width: number;
	height: number;
	fileName: string;
}

/**
 * Upper bound on how long the browser may take to emit `seeked` for a frame
 * capture. A corrupt or unsupported file can otherwise leave the seek promise
 * pending forever, which hangs thumbnail generation.
 */
export const FRAME_CAPTURE_SEEK_TIMEOUT_MS = 10_000;

/**
 * Wait for a video seek to finish, failing on a media error or after
 * `timeoutMs` instead of waiting indefinitely.
 */
function waitForVideoSeek(
	video: HTMLVideoElement,
	timeoutMs: number,
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let settled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;
		const cleanup = () => {
			if (settled) return;
			settled = true;
			if (timer !== null) clearTimeout(timer);
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
		};
		const onSeeked = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new Error("Could not seek video"));
		};
		video.addEventListener("seeked", onSeeked);
		video.addEventListener("error", onError);
		timer = setTimeout(
			() => {
				cleanup();
				reject(
					new Error(
						`Timed out seeking video after ${timeoutMs}ms (the file may be corrupt or unsupported)`,
					),
				);
			},
			Math.max(0, timeoutMs),
		);
	});
}

export async function captureFrameFromVideo({
	file,
	timeSeconds,
	fileName,
	seekTimeoutMs = FRAME_CAPTURE_SEEK_TIMEOUT_MS,
}: {
	file: File;
	timeSeconds: number;
	fileName: string;
	/** Override for slow devices/tests; defaults to the module timeout. */
	seekTimeoutMs?: number;
}): Promise<CapturedFrame | null> {
	const url = URL.createObjectURL(file);
	const video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	video.src = url;

	try {
		await new Promise<void>((resolve, reject) => {
			const onLoaded = () => {
				video.removeEventListener("loadeddata", onLoaded);
				video.removeEventListener("error", onError);
				resolve();
			};
			const onError = () => {
				video.removeEventListener("loadeddata", onLoaded);
				video.removeEventListener("error", onError);
				reject(new Error("Could not load video"));
			};
			video.addEventListener("loadeddata", onLoaded);
			video.addEventListener("error", onError);
		});

		const safeTime = Math.max(0, Math.min(timeSeconds, video.duration - 0.01));
		video.currentTime = safeTime;
		await waitForVideoSeek(video, seekTimeoutMs);

		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0);
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/png");
		});
		if (!blob) return null;
		return {
			blob,
			width: video.videoWidth,
			height: video.videoHeight,
			fileName,
		};
	} finally {
		URL.revokeObjectURL(url);
		video.remove();
	}
}

export async function captureFrameViaMediaBunny({
	file,
	timeSeconds,
	fileName,
}: {
	file: File;
	timeSeconds: number;
	fileName: string;
}): Promise<CapturedFrame | null> {
	let input: Input | null = null;
	try {
		input = new Input({
			source: new BlobSource(file),
			formats: ALL_FORMATS,
		});
		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) return null;

		const sink = new CanvasSink(videoTrack);
		const safeTime = Math.max(0, timeSeconds);
		const iterator = sink.canvases();
		try {
			for await (const wrapped of iterator) {
				const ts = wrapped.timestamp;
				const te = ts + wrapped.duration;
				if (te <= safeTime) continue;
				if (ts > safeTime) break;

				const canvas = wrapped.canvas;
				const blob = await canvasToPngBlob({ canvas });
				if (!blob) return null;
				return {
					blob,
					width: canvas.width,
					height: canvas.height,
					fileName,
				};
			}
		} finally {
			await iterator.return();
		}
		return null;
	} catch (error) {
		console.warn("captureFrameViaMediaBunny failed:", error);
		return null;
	} finally {
		input?.dispose();
	}
}

export function ticksToSeconds({ ticks }: { ticks: number }): number {
	return ticks / TICKS_PER_SECOND;
}

async function canvasToPngBlob({
	canvas,
}: {
	canvas: HTMLCanvasElement | OffscreenCanvas;
}): Promise<Blob | null> {
	if (canvas instanceof HTMLCanvasElement) {
		return new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/png");
		});
	}
	const blob = await canvas.convertToBlob({ type: "image/png" });
	return blob;
}
