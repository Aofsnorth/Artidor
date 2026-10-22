import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { buildUploadAudioElement } from "@/lib/timeline/element-utils";
import { toast } from "sonner";
import { resolveVoiceoverDurationTicks } from "./voiceover-duration";

export interface VoiceoverState {
	isRecording: boolean;
	isPreparing: boolean;
	durationMs: number;
	level: number;
	error: string | null;
}

const DEFAULT_STATE: VoiceoverState = {
	isRecording: false,
	isPreparing: false,
	durationMs: 0,
	level: 0,
	error: null,
};

export function useVoiceover(): {
	state: VoiceoverState;
	start: () => Promise<void>;
	stop: () => Promise<void>;
	cancel: () => void;
} {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [state, setState] = useState<VoiceoverState>(DEFAULT_STATE);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startedAtRef = useRef<number>(0);
	// Wall-clock duration captured at stop time. Kept in a ref because the
	// recorder's `onstop` closure runs after `stop()` and would otherwise read
	// a stale `state.durationMs` (0 on the first recording).
	const elapsedMsRef = useRef<number>(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const animFrameRef = useRef<number | null>(null);
	const stoppedRef = useRef<boolean>(false);

	const cleanup = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (animFrameRef.current) {
			cancelAnimationFrame(animFrameRef.current);
			animFrameRef.current = null;
		}
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) track.stop();
			streamRef.current = null;
		}
		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			audioContextRef.current.close().catch(() => {});
		}
		audioContextRef.current = null;
		analyserRef.current = null;
		mediaRecorderRef.current = null;
	}, []);

	const ingestRecording = useCallback(
		async ({ blob }: { blob: Blob }) => {
			if (stoppedRef.current) return;
			if (!activeProject) {
				cleanup();
				setState(DEFAULT_STATE);
				return;
			}
			const file = new File([blob], `voiceover-${Date.now()}.webm`, {
				type: blob.type,
			});
			try {
				const [processed] = await processMediaAssets({ files: [file] });
				if (!processed) {
					throw new Error("Failed to process recording");
				}
				const stored = await editor.media.addMediaAsset({
					projectId: activeProject.metadata.id,
					asset: processed,
				});
				if (!stored) {
					throw new Error("Could not save recording");
				}

				const startTime = editor.playback.getCurrentTime();
				const durationTicks = resolveVoiceoverDurationTicks({
					recordedSeconds: processed.duration,
					elapsedMs: elapsedMsRef.current,
					ticksPerSecond: TICKS_PER_SECOND,
				});
				const element = buildUploadAudioElement({
					mediaId: stored.id,
					name: stored.name,
					duration: durationTicks,
					startTime,
				});
				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});
				toast.success("Voiceover added");
			} catch (error) {
				console.error("Voiceover ingest failed:", error);
				toast.error("Could not save voiceover");
			} finally {
				cleanup();
				setState(DEFAULT_STATE);
			}
		},
		[activeProject, cleanup, editor],
	);

	useEffect(() => cleanup, [cleanup]);

	const start = useCallback(async () => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		stoppedRef.current = false;
		elapsedMsRef.current = 0;
		setState({ ...DEFAULT_STATE, isPreparing: true });
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});
			// `cancel()` may run while the permission prompt is pending. The
			// resolved stream would otherwise stay live (mic indicator on) with
			// no recorder attached, so stop it before creating any audio nodes.
			if (stoppedRef.current) {
				for (const track of stream.getTracks()) track.stop();
				cleanup();
				return;
			}
			streamRef.current = stream;

			const AudioContextCtor =
				(window as Window & { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext ?? window.AudioContext;
			const audioContext = new AudioContextCtor();
			audioContextRef.current = audioContext;
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;

			const mimeType = pickMimeType();
			const recorder = mimeType
				? new MediaRecorder(stream, { mimeType })
				: new MediaRecorder(stream);
			chunksRef.current = [];
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = async () => {
				if (stoppedRef.current) return;
				const blob = new Blob(chunksRef.current, {
					type: mimeType || "audio/webm",
				});
				await ingestRecording({ blob });
			};
			mediaRecorderRef.current = recorder;
			startedAtRef.current = performance.now();

			recorder.start();
			setState({
				isRecording: true,
				isPreparing: false,
				durationMs: 0,
				level: 0,
				error: null,
			});

			timerRef.current = setInterval(() => {
				const elapsedMs = performance.now() - startedAtRef.current;
				elapsedMsRef.current = elapsedMs;
				setState((prev) => ({
					...prev,
					durationMs: elapsedMs,
				}));
			}, 100);

			const updateLevel = () => {
				if (!analyserRef.current) return;
				const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
				analyserRef.current.getByteTimeDomainData(buf);
				let sum = 0;
				for (let i = 0; i < buf.length; i++) {
					const v = ((buf[i] ?? 128) - 128) / 128;
					sum += v * v;
				}
				const rms = Math.sqrt(sum / buf.length);
				setState((prev) => ({ ...prev, level: Math.min(1, rms * 2) }));
				animFrameRef.current = requestAnimationFrame(updateLevel);
			};
			animFrameRef.current = requestAnimationFrame(updateLevel);
		} catch (error) {
			console.error("Microphone error:", error);
			cleanup();
			setState({
				...DEFAULT_STATE,
				error:
					error instanceof Error
						? error.message
						: "Could not access microphone",
			});
			toast.error("Could not access microphone");
		}
	}, [activeProject, cleanup, ingestRecording]);

	const stop = useCallback(async () => {
		const recorder = mediaRecorderRef.current;
		if (!recorder) return;
		if (recorder.state !== "inactive") {
			// Freeze the measured duration before the async `onstop` handler
			// runs; this is the value the inserted clip uses. The interval must
			// stop here too, otherwise ingest/processing time keeps inflating it.
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
			elapsedMsRef.current = performance.now() - startedAtRef.current;
			recorder.stop();
		}
	}, []);

	const cancel = useCallback(() => {
		stoppedRef.current = true;
		cleanup();
		setState(DEFAULT_STATE);
	}, [cleanup]);

	return { state, start, stop, cancel };
}

function pickMimeType(): string | null {
	const candidates = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/ogg;codecs=opus",
		"audio/mp4",
	];
	if (typeof MediaRecorder === "undefined") return null;
	for (const type of candidates) {
		if (MediaRecorder.isTypeSupported(type)) return type;
	}
	return null;
}
