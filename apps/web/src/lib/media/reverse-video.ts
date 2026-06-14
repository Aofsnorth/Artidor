
import { Input, ALL_FORMATS, BlobSource, CanvasSink } from "mediabunny";

/**
 * Generate a reversed video blob from a source video.
 * Returns a new File with the reversed video; the original is unchanged.
 */
export async function generateReversedVideo({
	file,
	onProgress,
}: {
	file: File;
	onProgress?: ({ progress }: { progress: number }) => void;
}): Promise<File | null> {
	try {
		const input = new Input({
			source: new BlobSource(file),
			formats: ALL_FORMATS,
		});
		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) return null;

		const sink = new CanvasSink(videoTrack);
		const frames: { canvas: HTMLCanvasElement | OffscreenCanvas; timestamp: number; duration: number }[] = [];
		for await (const wrapped of sink.canvases()) {
			frames.push({
				canvas: wrapped.canvas,
				timestamp: wrapped.timestamp,
				duration: wrapped.duration,
			});
		}
		if (frames.length === 0) return null;

		// Use MediaRecorder + Canvas to encode the reversed video.
		// Simpler approach: use captureStream from a canvas and playback frames in reverse.
		const reversed = [...frames].reverse();
		const first = frames[0]!;
		const width =
			"width" in first.canvas ? first.canvas.width : 1280;
		const height =
			"height" in first.canvas ? first.canvas.height : 720;

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		const stream = canvas.captureStream(30);
		const recorder = new MediaRecorder(stream, {
			mimeType: pickMimeType(),
		});
		const chunks: Blob[] = [];
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) chunks.push(e.data);
		};
		const stopped = new Promise<void>((resolve) => {
			recorder.onstop = () => resolve();
		});

		recorder.start();
		const frameDuration = 1000 / 30;
		for (let i = 0; i < reversed.length; i++) {
			const frame = reversed[i]!;
			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(frame.canvas as CanvasImageSource, 0, 0, width, height);
			onProgress?.({ progress: i / reversed.length });
			await delay(frameDuration);
		}
		recorder.stop();
		await stopped;

		const blob = new Blob(chunks, { type: "video/webm" });
		return new File([blob], `reversed-${file.name}`, { type: "video/webm" });
	} catch (err) {
		console.warn("Reverse failed:", err);
		return null;
	}
}

function pickMimeType(): string {
	const candidates = [
		"video/webm;codecs=vp9,opus",
		"video/webm;codecs=vp8,opus",
		"video/webm",
	];
	if (typeof MediaRecorder === "undefined") return "video/webm";
	for (const t of candidates) {
		if (MediaRecorder.isTypeSupported(t)) return t;
	}
	return "video/webm";
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
