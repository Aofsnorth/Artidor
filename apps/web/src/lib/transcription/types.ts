import type { LanguageCode } from "./languages";
import type { TranscriptionBackend } from "@/services/transcription/backend";

export type TranscriptionLanguage = LanguageCode | "auto";

/** A single word with its real start/end timestamp (seconds). */
export interface TranscriptionWord {
	word: string;
	start: number;
	end: number;
}

export interface TranscriptionSegment {
	text: string;
	start: number;
	end: number;
	/**
	 * Real per-word timestamps when the model returns them
	 * (`return_timestamps: "word"`). Absent for older models — callers fall
	 * back to segment-level timing.
	 */
	words?: TranscriptionWord[];
}

export interface TranscriptionResult {
	text: string;
	segments: TranscriptionSegment[];
	language: string;
}

export type TranscriptionStatus =
	| "idle"
	| "loading-model"
	| "transcribing"
	| "complete"
	| "error";

export interface TranscriptionProgress {
	status: TranscriptionStatus;
	progress: number;
	message?: string;
	backend?: TranscriptionBackend;
	isIndeterminate?: boolean;
}

export type TranscriptionModelId =
	| "whisper-tiny"
	| "whisper-small"
	| "whisper-medium"
	| "whisper-large-v3-turbo";

export interface TranscriptionModel {
	id: TranscriptionModelId;
	name: string;
	huggingFaceId: string;
	description: string;
}

export interface CaptionChunk {
	text: string;
	startTime: number;
	duration: number;
}
