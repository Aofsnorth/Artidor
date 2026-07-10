import type { TranscriptionProgress } from "./types";
import type { TranscriptionBackend } from "@/services/transcription/backend";

export function getProcessingUpdate({
	status,
	progress,
	backend,
	isIndeterminate,
}: TranscriptionProgress): {
	step: string;
	progress: number | null;
	backend?: TranscriptionBackend;
} {
	if (status === "loading-model") {
		return { step: "Loading model", progress, backend };
	}
	return {
		step: "Transcribing audio",
		progress: isIndeterminate ? null : progress,
		backend,
	};
}
