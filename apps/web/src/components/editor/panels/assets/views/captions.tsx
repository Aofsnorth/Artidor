import { Button } from "@/components/ui/button";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useMemo, useReducer, useRef, useState } from "react";
import { extractTimelineAudio, extractClipAudio } from "@/lib/media/mediabunny";
import { useEditor } from "@/hooks/use-editor";
import { toast } from "sonner";
import { TRANSCRIPTION_DIAGNOSTICS_SCOPE } from "@/lib/transcription/diagnostics";
import { DEFAULT_TRANSCRIPTION_SAMPLE_RATE } from "@/lib/transcription/audio";
import { TRANSCRIPTION_LANGUAGES } from "@/lib/transcription/supported-languages";
import type {
	CaptionChunk,
	TranscriptionLanguage,
	TranscriptionModelId,
	TranscriptionProgress,
} from "@/lib/transcription/types";
import { transcriptionService } from "@/services/transcription/service";
import {
	DEFAULT_TRANSCRIPTION_MODEL,
	TRANSCRIPTION_MODELS,
} from "@/lib/transcription/models";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { buildCaptionChunks } from "@/lib/transcription/caption";
import {
	CAPTION_TRACK_NAME,
	insertCaptionChunksAsTextTrack,
} from "@/lib/subtitles/insert";
import { getCaptionCues } from "@/lib/subtitles/caption-cues";
import {
	downloadSubtitleFile,
	exportCuesToAss,
	exportCuesToSrt,
} from "@/lib/subtitles/export";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { parseSubtitleFile } from "@/lib/subtitles/parse";
import { Spinner } from "@/components/ui/spinner";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
} from "@/components/section";
import { AlertCircleIcon, CloudUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Tooltip,
	TooltipContent,
	TooltipPortal,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DiagnosticSeverity } from "@/lib/diagnostics/types";
import type { TextTrack } from "@/lib/timeline";

import type { TranscriptionBackend } from "@/services/transcription/backend";
import { getProcessingUpdate } from "@/lib/transcription/processing-state";

const DIAGNOSTIC_BUTTON_VARIANT: Record<
	DiagnosticSeverity,
	"caution" | "destructive-foreground"
> = {
	caution: "caution",
	error: "destructive-foreground",
};

type ProcessingState =
	| { status: "idle"; error: string | null; warnings: string[] }
	| {
			status: "processing";
			step: string;
			progress: number | null;
			backend?: TranscriptionBackend;
			startedAt: number;
	  };

type ProcessingAction =
	| { type: "start"; step: string }
	| {
			type: "update_step";
			step: string;
			progress?: number | null;
			backend?: TranscriptionBackend;
	  }
	| { type: "succeed"; warnings: string[] }
	| { type: "fail"; error: string };

const IDLE_STATE: ProcessingState = {
	status: "idle",
	error: null,
	warnings: [],
};

/** seconds -> "M:SS" for the compact cue timestamp button. */
function formatCueTime(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(total / 60);
	const secs = total % 60;
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function processingReducer(
	state: ProcessingState,
	action: ProcessingAction,
): ProcessingState {
	switch (action.type) {
		case "start":
			return {
				status: "processing",
				step: action.step,
				progress: null,
				startedAt: Date.now(),
			};
		case "update_step":
			if (state.status !== "processing") return state;
			return {
				status: "processing",
				step: action.step,
				progress:
					action.progress !== undefined ? action.progress : state.progress,
				backend: action.backend !== undefined ? action.backend : state.backend,
				startedAt: state.startedAt,
			};
		case "succeed":
			return { status: "idle", error: null, warnings: action.warnings };
		case "fail":
			return { status: "idle", error: action.error, warnings: [] };
	}
}

export function Captions() {
	const [selectedLanguage, setSelectedLanguage] =
		useState<TranscriptionLanguage>("auto");
	const [selectedModel, setSelectedModel] = useState<TranscriptionModelId>(
		DEFAULT_TRANSCRIPTION_MODEL,
	);
	const [processing, dispatch] = useReducer(processingReducer, IDLE_STATE);
	const containerRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editor = useEditor();

	const isProcessing = processing.status === "processing";

	const activeDiagnostics = useEditor((e) =>
		e.diagnostics.getActive({ scope: TRANSCRIPTION_DIAGNOSTICS_SCOPE }),
	);

	const handleProgress = (progressData: TranscriptionProgress) => {
		const update = getProcessingUpdate(progressData);
		dispatch({
			type: "update_step",
			step: update.step,
			progress: update.progress,
			backend: update.backend,
		});
	};

	const insertCaptions = ({
		captions,
	}: {
		captions: CaptionChunk[];
	}): boolean => {
		const trackId = insertCaptionChunksAsTextTrack({ editor, captions });
		return trackId !== null;
	};

	const handleGenerateTranscript = async () => {
		dispatch({ type: "start", step: "Extracting audio..." });
		try {
			const audioBlob = await extractTimelineAudio({
				tracks: editor.scenes.getActiveScene().tracks,
				mediaAssets: editor.media.getAssets(),
				totalDuration: editor.timeline.getTotalDuration(),
				onProgress: (progress) =>
					dispatch({
						type: "update_step",
						step: `Extracting audio ${Math.round(progress)}%`,
					}),
			});

			dispatch({ type: "update_step", step: "Preparing audio..." });
			const { samples } = await decodeAudioToFloat32({
				audioBlob,
				sampleRate: DEFAULT_TRANSCRIPTION_SAMPLE_RATE,
			});

			if (samples.length === 0) {
				dispatch({ type: "fail", error: "No audio found in timeline" });
				return;
			}

			const result = await transcriptionService.transcribe({
				audioData: samples,
				language: selectedLanguage === "auto" ? undefined : selectedLanguage,
				modelId: selectedModel,
				onProgress: handleProgress,
			});

			dispatch({ type: "update_step", step: "Generating captions..." });
			const captionChunks = buildCaptionChunks({ segments: result.segments });

			if (!insertCaptions({ captions: captionChunks })) {
				dispatch({ type: "fail", error: "No captions were generated" });
				return;
			}

			dispatch({ type: "succeed", warnings: [] });
		} catch (error) {
			console.error("Transcription failed:", error);
			dispatch({
				type: "fail",
				error:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
		}
	};

	const selectedElement = useEditor((e) => {
		const sel = e.selection.getSelectedElements();
		if (sel.length !== 1) return null;
		const ref = sel[0];
		if (!ref) return null;
		const track = e.timeline.getTrackById({ trackId: ref.trackId });
		return track?.elements.find((el) => el.id === ref.elementId) ?? null;
	});

	const handleTranscribeSelectedClip = async () => {
		if (!selectedElement) {
			toast.error("Select a single audio or video clip first");
			return;
		}
		if (selectedElement.type !== "video" && selectedElement.type !== "audio") {
			toast.error("Selected element is not an audio or video clip");
			return;
		}

		dispatch({ type: "start", step: "Extracting clip audio..." });
		try {
			const audioBlob = await extractClipAudio({
				element: selectedElement,
				mediaAssets: editor.media.getAssets(),
			});

			dispatch({ type: "update_step", step: "Preparing audio..." });
			const { samples } = await decodeAudioToFloat32({
				audioBlob,
				sampleRate: DEFAULT_TRANSCRIPTION_SAMPLE_RATE,
			});

			if (samples.length === 0) {
				dispatch({ type: "fail", error: "No audio found in selected clip" });
				return;
			}

			const result = await transcriptionService.transcribe({
				audioData: samples,
				language: selectedLanguage === "auto" ? undefined : selectedLanguage,
				modelId: selectedModel,
				onProgress: handleProgress,
			});

			dispatch({ type: "update_step", step: "Generating captions..." });
			const rawChunks = buildCaptionChunks({ segments: result.segments });
			const offsetSeconds = selectedElement.startTime / TICKS_PER_SECOND;
			const captionChunks = rawChunks.map((chunk) => ({
				...chunk,
				startTime: chunk.startTime + offsetSeconds,
			}));

			if (!insertCaptions({ captions: captionChunks })) {
				dispatch({ type: "fail", error: "No captions were generated" });
				return;
			}

			toast.success("Captions added for selected clip");
			dispatch({ type: "succeed", warnings: [] });
		} catch (error) {
			console.error("Transcription failed:", error);
			dispatch({
				type: "fail",
				error:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleImportFile = async ({ file }: { file: File }) => {
		dispatch({ type: "start", step: "Reading subtitle file..." });
		try {
			const input = await file.text();
			const result = parseSubtitleFile({
				fileName: file.name,
				input,
			});

			if (result.captions.length === 0) {
				dispatch({
					type: "fail",
					error: "No valid subtitle cues were found in the subtitle file",
				});
				return;
			}

			dispatch({ type: "update_step", step: "Importing subtitles..." });

			if (!insertCaptions({ captions: result.captions })) {
				dispatch({ type: "fail", error: "No captions were generated" });
				return;
			}

			const nextWarnings = [...result.warnings];
			if (result.skippedCueCount > 0) {
				nextWarnings.unshift(
					`Imported ${result.captions.length} subtitle cue(s) and skipped ${result.skippedCueCount} malformed cue(s).`,
				);
			}

			dispatch({ type: "succeed", warnings: nextWarnings });
		} catch (error) {
			console.error("Subtitle import failed:", error);
			dispatch({
				type: "fail",
				error:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
		}
	};

	const handleFileChange = async ({
		event,
	}: {
		event: React.ChangeEvent<HTMLInputElement>;
	}) => {
		const file = event.target.files?.[0];
		if (event.target) {
			event.target.value = "";
		}
		if (!file) return;

		await handleImportFile({ file });
	};

	const handleLanguageChange = ({ value }: { value: string }) => {
		if (value === "auto") {
			setSelectedLanguage("auto");
			return;
		}

		const matchedLanguage = TRANSCRIPTION_LANGUAGES.find(
			(language) => language.code === value,
		);
		if (!matchedLanguage) return;
		setSelectedLanguage(matchedLanguage.code);
	};

	const handleCancel = () => {
		transcriptionService.cancel();
		dispatch({ type: "fail", error: "Transcription cancelled" });
	};

	// Subscribe to the stable track reference. Deriving cue objects inside the
	// selector would produce a fresh snapshot on every store read.
	const captionTrack = useEditor(
		(e) =>
			e.scenes
				.getActiveSceneOrNull()
				?.tracks.overlay.find(
					(track): track is TextTrack =>
						track.type === "text" && track.name === CAPTION_TRACK_NAME,
				) ?? null,
	);
	const captionCues = useMemo(
		() =>
			captionTrack
				? getCaptionCues({
						track: captionTrack,
						ticksPerSecond: TICKS_PER_SECOND,
					})
				: [],
		[captionTrack],
	);

	const updateCueText = ({
		trackId,
		elementId,
		text,
	}: {
		trackId: string;
		elementId: string;
		text: string;
	}) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId, patch: { content: text } }],
			pushHistory: true,
		});
	};

	const exportCaptions = ({ format }: { format: "srt" | "ass" }) => {
		const cues = captionCues.map((cue) => ({
			text: cue.text,
			startTime: cue.startTime,
			duration: cue.duration,
		}));
		if (cues.length === 0) {
			toast.error("No captions to export");
			return;
		}
		const content =
			format === "srt" ? exportCuesToSrt({ cues }) : exportCuesToAss({ cues });
		downloadSubtitleFile({ content, fileName: `captions.${format}` });
		toast.success(`Exported captions.${format}`);
	};

	const error = processing.status === "idle" ? processing.error : null;
	const warnings = processing.status === "idle" ? processing.warnings : [];

	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	const processingStartedAt =
		processing.status === "processing" ? processing.startedAt : null;

	useEffect(() => {
		if (processing.status !== "processing" || processingStartedAt === null) {
			setElapsedSeconds(0);
			return;
		}
		const interval = setInterval(() => {
			setElapsedSeconds(Math.floor((Date.now() - processingStartedAt) / 1000));
		}, 1000);
		return () => clearInterval(interval);
	}, [processing.status, processingStartedAt]);

	const elapsedLabel = formatCueTime(elapsedSeconds);

	return (
		<PanelView
			title="Captions"
			contentClassName="px-0 flex flex-col h-full"
			actions={
				<TooltipProvider>
					<div className="flex items-center gap-1.5">
						{!isProcessing &&
							activeDiagnostics.map((diagnostic) => (
								<Tooltip key={diagnostic.id}>
									<TooltipTrigger asChild>
										<Button
											variant={DIAGNOSTIC_BUTTON_VARIANT[diagnostic.severity]}
											size="icon"
											aria-label={diagnostic.message}
										>
											<HugeiconsIcon icon={AlertCircleIcon} size={16} />
										</Button>
									</TooltipTrigger>
									<TooltipPortal>
										<TooltipContent className="z-100">
											{diagnostic.message}
										</TooltipContent>
									</TooltipPortal>
								</Tooltip>
							))}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleImportClick}
							disabled={isProcessing}
							className="items-center justify-center gap-1.5"
						>
							<HugeiconsIcon icon={CloudUploadIcon} />
							Import
						</Button>
					</div>
				</TooltipProvider>
			}
			ref={containerRef}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".srt,.ass"
				className="hidden"
				onChange={(event) => void handleFileChange({ event })}
			/>
			<Section
				showTopBorder={false}
				showBottomBorder={false}
				className="flex-1"
			>
				<SectionContent className="flex flex-col gap-4 h-full pt-1">
					<SectionFields>
						<SectionField label="Language">
							<Select
								value={selectedLanguage}
								onValueChange={(value) => handleLanguageChange({ value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a language" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="auto">Auto detect</SelectItem>
									{TRANSCRIPTION_LANGUAGES.map((language) => (
										<SelectItem key={language.code} value={language.code}>
											{language.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SectionField>
						<SectionField label="Model">
							<Select
								value={selectedModel}
								onValueChange={(value) =>
									setSelectedModel(value as TranscriptionModelId)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a model" />
								</SelectTrigger>
								<SelectContent>
									{TRANSCRIPTION_MODELS.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name} — {model.description}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SectionField>
					</SectionFields>

					{isProcessing && (
						<div
							className="border-border/70 bg-muted/35 flex flex-col gap-2 border p-3 rounded-md mt-auto"
							aria-live="polite"
						>
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="flex min-w-0 items-center gap-2">
									<Spinner className="shrink-0" />
									<span className="truncate">{processing.step}</span>
								</span>
								{processing.backend && (
									<span className="text-muted-foreground text-xs uppercase">
										{processing.backend}
									</span>
								)}
							</div>
							{processing.progress === null ? (
								<p className="text-muted-foreground text-xs">
									Running inference · {elapsedLabel}
								</p>
							) : (
								<>
									<Progress value={processing.progress} />
									<p className="text-muted-foreground text-xs">
										{Math.round(processing.progress)}% downloaded ·{" "}
										{elapsedLabel}
									</p>
								</>
							)}
						</div>
					)}

					<Button
						type="button"
						className={isProcessing ? "w-full" : "mt-auto w-full"}
						onClick={handleGenerateTranscript}
						disabled={isProcessing || activeDiagnostics.length > 0}
					>
						Generate transcript (full timeline)
					</Button>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleTranscribeSelectedClip}
						disabled={isProcessing || !selectedElement}
						title="Select a single video or audio clip first"
					>
						Transcribe selected clip
					</Button>
					{isProcessing && (
						<Button
							type="button"
							variant="destructive-foreground"
							className="w-full"
							onClick={handleCancel}
						>
							Cancel
						</Button>
					)}
					{error && (
						<div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
							<p className="text-destructive text-sm">{error}</p>
						</div>
					)}
					{warnings.length > 0 && (
						<div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
							<ul className="space-y-1 text-sm text-amber-700">
								{warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}

					{captionCues.length > 0 && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
									{captionCues.length} cues
								</span>
								<div className="flex items-center gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => exportCaptions({ format: "srt" })}
									>
										Export SRT
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => exportCaptions({ format: "ass" })}
									>
										Export ASS
									</Button>
								</div>
							</div>
							<div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
								{captionCues.map((cue) => (
									<div
										key={cue.elementId}
										className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-2"
									>
										<button
											type="button"
											className="mt-1 shrink-0 font-mono text-[0.62rem] text-muted-foreground hover:text-foreground"
											onClick={() =>
												editor.playback.seek({
													time: Math.round(cue.startTime * TICKS_PER_SECOND),
												})
											}
											title="Jump to cue"
										>
											{formatCueTime(cue.startTime)}
										</button>
										<textarea
											value={cue.text}
											onChange={(event) =>
												updateCueText({
													trackId: cue.trackId,
													elementId: cue.elementId,
													text: event.target.value,
												})
											}
											rows={1}
											className="min-h-7 flex-1 resize-none rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-foreground outline-none focus:border-border focus:bg-background"
										/>
									</div>
								))}
							</div>
						</div>
					)}
				</SectionContent>
			</Section>
		</PanelView>
	);
}
