import {
	pipeline,
	type AutomaticSpeechRecognitionPipeline,
	type AutomaticSpeechRecognitionOutput,
} from "@huggingface/transformers";
import type {
	TranscriptionSegment,
	TranscriptionWord,
} from "@/lib/transcription/types";
import {
	DEFAULT_CHUNK_LENGTH_SECONDS,
	DEFAULT_STRIDE_SECONDS,
} from "@/lib/transcription/audio";

export type WorkerMessage =
	| { type: "init"; modelId: string }
	| { type: "transcribe"; audio: Float32Array; language: string }
	| { type: "cancel" };

export type WorkerResponse =
	| { type: "init-progress"; progress: number }
	| { type: "init-complete" }
	| { type: "init-error"; error: string }
	| { type: "transcribe-progress"; progress: number }
	| {
			type: "transcribe-complete";
			text: string;
			segments: TranscriptionSegment[];
	  }
	| { type: "transcribe-error"; error: string }
	| { type: "cancelled" };

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let cancelled = false;
let lastReportedProgress = -1;
const fileBytes = new Map<string, { loaded: number; total: number }>();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "init":
			await handleInit({ modelId: message.modelId });
			break;
		case "transcribe":
			await handleTranscribe({
				audio: message.audio,
				language: message.language,
			});
			break;
		case "cancel":
			cancelled = true;
			self.postMessage({ type: "cancelled" } satisfies WorkerResponse);
			break;
	}
};

async function handleInit({ modelId }: { modelId: string }) {
	lastReportedProgress = -1;
	fileBytes.clear();

	try {
		transcriber = (await pipeline("automatic-speech-recognition", modelId, {
			dtype: "q4",
			device: "auto",
			progress_callback: (progressInfo: {
				status?: string;
				file?: string;
				loaded?: number;
				total?: number;
			}) => {
				const file = progressInfo.file;
				if (!file) return;

				const loaded = progressInfo.loaded ?? 0;
				const total = progressInfo.total ?? 0;

				if (progressInfo.status === "progress" && total > 0) {
					fileBytes.set(file, { loaded, total });
				} else if (progressInfo.status === "done") {
					const existing = fileBytes.get(file);
					if (existing) {
						fileBytes.set(file, {
							loaded: existing.total,
							total: existing.total,
						});
					}
				}

				// sum all bytes
				let totalLoaded = 0;
				let totalSize = 0;
				for (const { loaded, total } of fileBytes.values()) {
					totalLoaded += loaded;
					totalSize += total;
				}

				if (totalSize === 0) return;

				const overallProgress = (totalLoaded / totalSize) * 100;
				const roundedProgress = Math.floor(overallProgress);

				if (roundedProgress !== lastReportedProgress) {
					lastReportedProgress = roundedProgress;
					self.postMessage({
						type: "init-progress",
						progress: roundedProgress,
					} satisfies WorkerResponse);
				}
			},
		})) as unknown as AutomaticSpeechRecognitionPipeline;

		self.postMessage({ type: "init-complete" } satisfies WorkerResponse);
	} catch (error) {
		self.postMessage({
			type: "init-error",
			error: error instanceof Error ? error.message : "Failed to load model",
		} satisfies WorkerResponse);
	}
}

async function handleTranscribe({
	audio,
	language,
}: {
	audio: Float32Array;
	language: string;
}) {
	if (!transcriber) {
		self.postMessage({
			type: "transcribe-error",
			error: "Model not initialized",
		} satisfies WorkerResponse);
		return;
	}

	cancelled = false;

	try {
		// Ask for WORD-level timestamps so captions can be cut on real word
		// boundaries instead of linear interpolation (the old drift source).
		const rawResult = await transcriber(audio, {
			chunk_length_s: DEFAULT_CHUNK_LENGTH_SECONDS,
			stride_length_s: DEFAULT_STRIDE_SECONDS,
			language: language === "auto" ? undefined : language,
			return_timestamps: "word",
		});

		if (cancelled) return;

		const result: AutomaticSpeechRecognitionOutput = Array.isArray(rawResult)
			? rawResult[0]
			: rawResult;

		// With word timestamps, `chunks` is one entry per word. Collect the
		// words (guarding null/!finite timestamps that Whisper emits on the
		// final token), then fold them into a single segment carrying the
		// per-word timing. buildCaptionChunks slices on these real boundaries.
		const words: TranscriptionWord[] = [];
		if (result.chunks) {
			for (const chunk of result.chunks) {
				const ts = chunk.timestamp;
				const start = ts?.[0];
				let end = ts?.[1];
				if (typeof start !== "number" || !Number.isFinite(start)) continue;
				// Whisper leaves the last word's end null — fall back to its start
				// so the word still has a non-negative, finite duration.
				if (typeof end !== "number" || !Number.isFinite(end) || end < start) {
					end = start;
				}
				const text = chunk.text?.trim();
				if (!text) continue;
				words.push({ word: text, start, end });
			}
		}

		const segments: TranscriptionSegment[] = [];
		if (words.length > 0) {
			const firstWord = words[0];
			const lastWord = words[words.length - 1];
			segments.push({
				text: words.map((w) => w.word).join(" "),
				start: firstWord?.start ?? 0,
				end: lastWord?.end ?? firstWord?.start ?? 0,
				words,
			});
		}

		self.postMessage({
			type: "transcribe-complete",
			text: result.text,
			segments,
		} satisfies WorkerResponse);
	} catch (error) {
		if (cancelled) return;
		self.postMessage({
			type: "transcribe-error",
			error: error instanceof Error ? error.message : "Transcription failed",
		} satisfies WorkerResponse);
	}
}
