import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/lib/export";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { buildScene } from "@/services/renderer/scene-builder";
import { createTimelineAudioBuffer } from "@/lib/media/audio";
import { formatTimecode } from "artidor-wasm";
import { downloadBlob } from "@/utils/browser";
import {
	isExportWorkerSupported,
	runExportInWorker,
} from "@/services/renderer/export-worker-bridge";
import { runParallelExport } from "@/services/renderer/parallel-export";
import { serializeSceneTree } from "@/services/renderer/scene-serializer";
import { isEncoderConfigError } from "@/services/renderer/export-codec";

type SnapshotResult =
	| { success: true; blob: Blob; filename: string }
	| { success: false; error: string };

export class RendererManager {
	private renderTree: RootNode | null = null;
	private _isDegraded = false;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	get isDegraded(): boolean {
		return this._isDegraded;
	}

	setDegraded(degraded: boolean): void {
		if (this._isDegraded === degraded) return;
		this._isDegraded = degraded;
		this.notify();
	}

	setRenderTree({ renderTree }: { renderTree: RootNode | null }): void {
		this.renderTree = renderTree;
		this.notify();
	}

	getRenderTree(): RootNode | null {
		return this.renderTree;
	}

	async saveSnapshot(): Promise<{ success: boolean; error?: string }> {
		const snapshot = await this.createSnapshot();
		if (!snapshot.success) {
			return snapshot;
		}

		downloadBlob({ blob: snapshot.blob, filename: snapshot.filename });
		return { success: true };
	}

	async copySnapshot(): Promise<{ success: boolean; error?: string }> {
		if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
			return {
				success: false,
				error: "Clipboard image copy is not supported in this browser",
			};
		}

		const snapshot = await this.createSnapshot();
		if (!snapshot.success) {
			return snapshot;
		}

		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					[snapshot.blob.type || "image/png"]: snapshot.blob,
				}),
			]);
			return { success: true };
		} catch (error) {
			console.error("Copy snapshot failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Capture the current preview frame as a base64 data URL (PNG).
	 * Used by the AI assistant's `capture_frame` tool so the LLM can
	 * "see" the current state of the canvas when a vision-capable
	 * provider is configured.
	 */
	async captureFrameAsDataURL(): Promise<{
		success: boolean;
		dataUrl?: string;
		error?: string;
	}> {
		const snapshot = await this.createSnapshot();
		if (!snapshot.success) {
			return { success: false, error: snapshot.error };
		}
		const dataUrl = await blobToDataURL(snapshot.blob);
		return { success: true, dataUrl };
	}

	private async createSnapshot(): Promise<SnapshotResult> {
		try {
			const renderTree = this.getRenderTree();
			const activeProject = this.editor.project.getActive();

			if (!renderTree || !activeProject) {
				return { success: false, error: "No project or scene to capture" };
			}

			const duration = this.editor.timeline.getTotalDuration();
			if (duration === 0) {
				return { success: false, error: "Project is empty" };
			}

			const { canvasSize, fps } = activeProject.settings;
			const renderTime = Math.min(
				this.editor.playback.getCurrentTime(),
				this.editor.timeline.getLastFrameTime(),
			);

			const renderer = new CanvasRenderer({
				width: canvasSize.width,
				height: canvasSize.height,
				fps,
			});

			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = canvasSize.width;
			tempCanvas.height = canvasSize.height;

			await renderer.renderToCanvas({
				node: renderTree,
				time: renderTime,
				targetCanvas: tempCanvas,
			});

			const blob = await new Promise<Blob | null>((resolve) => {
				tempCanvas.toBlob((result) => resolve(result), "image/png");
			});

			if (!blob) {
				return { success: false, error: "Failed to create image" };
			}

			const timecode = formatTimecode({
				time: Math.round(renderTime),
				rate: fps,
			})?.replace(/:/g, "-");
			const safeName =
				activeProject.metadata.name.replace(/[<>:"/\\|?*]/g, "-").trim() ||
				"snapshot";
			const filename = `${safeName}-${timecode}.png`;

			return { success: true, blob, filename };
		} catch (error) {
			console.error("Snapshot capture failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async exportProject({
		options,
		onProgress,
		onCancel,
	}: {
		options: ExportOptions;
		onProgress?: ({ progress }: { progress: number }) => void;
		onCancel?: () => boolean;
	}): Promise<ExportResult> {
		const { format, quality, fps, includeAudio, workerCount } = options;

		// Top-level export timing. Logs a phase breakdown (audio mix vs render)
		// so we can see where the wall-clock time actually goes.
		const exportStart = performance.now();

		try {
			const tracks = this.editor.scenes.getActiveScene().tracks;
			const mediaAssets = this.editor.media.getAssets();
			const activeProject = this.editor.project.getActive();

			if (!activeProject) {
				return { success: false, error: "No active project" };
			}

			const duration = this.editor.timeline.getTotalDuration();
			if (duration === 0) {
				return { success: false, error: "Project is empty" };
			}

			const exportFps = fps ?? activeProject.settings.fps;
			const canvasSize = activeProject.settings.canvasSize;

			// Kick off audio mixing first (it is I/O heavy: decode + offline
			// resampling) so its async work overlaps the synchronous scene build
			// below instead of running strictly before it.
			let audioBufferPromise: Promise<AudioBuffer | null> | null = null;
			if (includeAudio) {
				audioBufferPromise = createTimelineAudioBuffer({
					tracks,
					mediaAssets,
					duration,
					// Audio mixing consumes the first 5% of the export bar.
					onProgress: (audioProgress) =>
						onProgress?.({ progress: audioProgress * 0.05 }),
				});
			}

			const scene = buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize,
				background: activeProject.settings.background,
			});

			// Wait for audio mixing to complete. No timeout — if the user enabled
			// audio, we must deliver audio. A timeout that silently drops audio is
			// worse than a slow export. If audio mixing genuinely hangs, the user
			// can cancel the export.
			const audioBuffer = audioBufferPromise
				? await audioBufferPromise
				: null;

			if (includeAudio) {
				console.info(
					`[export] audio mixing took ${((performance.now() - exportStart) / 1000).toFixed(1)}s`,
				);
			}
			const renderPhaseStart = performance.now();

			// Try Worker path first (OffscreenCanvas + WebCodecs in Worker)
			if (isExportWorkerSupported()) {
				console.info("[export] worker path supported, serializing scene tree");
				const { tree, files } = serializeSceneTree(scene);
				const fileEntries = Array.from(files.entries()).map(
					([mediaId, file]) => ({ mediaId, file }),
				);
				console.info(`[export] scene serialized: ${fileEntries.length} files`);
				// Progress maps the worker's 0..1 onto 0.05..1 when audio mixing
				// already consumed the first 5%.
				const mapProgress = (p: number) => (includeAudio ? 0.05 + p * 0.95 : p);

				// 1. Parallel multi-segment path — splits the timeline across
				// workers/cores and stitches the encoded segments losslessly.
				// Quality is identical to a serial export; it's just faster.
				// Returns `fallback` (or throws) when it isn't worthwhile/safe,
				// in which case we transparently use the single-worker path.
				try {
					const parallel = await runParallelExport({
						sceneTree: tree,
						files: fileEntries,
						audioBuffer: audioBuffer || null,
						width: canvasSize.width,
						height: canvasSize.height,
						fps: exportFps,
						durationTicks: Math.round(duration),
						format,
						quality,
						shouldIncludeAudio: !!includeAudio,
						workerCount,
						onProgress: (p) =>
							onProgress?.({ progress: mapProgress(p.progress) }),
						getCancelled: onCancel,
					});

					if (parallel.success) {
						console.info(
							`[export] render phase took ${((performance.now() - renderPhaseStart) / 1000).toFixed(1)}s, ` +
								`total export ${((performance.now() - exportStart) / 1000).toFixed(1)}s`,
						);
						return { success: true, buffer: parallel.buffer };
					}
					if ("cancelled" in parallel && parallel.cancelled) {
						return { success: false, cancelled: true };
					}
					if ("error" in parallel) {
						console.warn(
							"Parallel export failed, falling back to single worker:",
							parallel.error,
						);
					}
					// `fallback: true` falls through silently (not worthwhile).
				} catch (parallelError) {
					console.warn(
						"Parallel export threw, falling back to single worker:",
						parallelError,
					);
				}

				// 2. Single-worker path (whole timeline on one worker).
				try {
					const result = await runExportInWorker({
						sceneTree: tree,
						files: fileEntries,
						audioBuffer: audioBuffer || null,
						width: canvasSize.width,
						height: canvasSize.height,
						fps: exportFps,
						format,
						quality,
						shouldIncludeAudio: !!includeAudio,
						// 30s no-activity timeout for the single-worker fallback. Long
						// exports keep sending progress messages, so this only fires
						// when the worker is truly stuck.
						timeoutMs: 30_000,
						onProgress: (p) =>
							onProgress?.({ progress: mapProgress(p.progress) }),
						getCancelled: onCancel,
					});

					if (result.success) {
						return { success: true, buffer: result.buffer };
					}
					if ("cancelled" in result && result.cancelled) {
						return { success: false, cancelled: true };
					}

					// Retry with software encoding when the hardware encoder config
					// was rejected. `isConfigSupported` can report hardware as
					// supported while the actual `VideoEncoder.configure()` rejects
					// it (Firefox has no hardware VideoEncoder backend but reports
					// `supported: true`). The retry forces `prefer-software`.
					const workerError = "error" in result ? result.error : "";
					if (isEncoderConfigError(workerError)) {
						console.info(
							"[export] worker encoder config rejected, retrying with software encoding",
						);
						const swResult = await runExportInWorker({
							sceneTree: tree,
							files: fileEntries,
							audioBuffer: audioBuffer || null,
							width: canvasSize.width,
							height: canvasSize.height,
							fps: exportFps,
							format,
							quality,
							shouldIncludeAudio: !!includeAudio,
							forceSoftwareEncoding: true,
							timeoutMs: 30_000,
							onProgress: (p) =>
								onProgress?.({ progress: mapProgress(p.progress) }),
							getCancelled: onCancel,
						});
						if (swResult.success) {
							return { success: true, buffer: swResult.buffer };
						}
						if ("cancelled" in swResult && swResult.cancelled) {
							return { success: false, cancelled: true };
						}
					}

					// Worker failed — fall through to main-thread path
					console.warn(
						"Worker export failed, falling back to main thread:",
						workerError || "unknown",
					);
				} catch (workerError) {
					console.warn(
						"Worker export threw, falling back to main thread:",
						workerError,
					);
				}
			}

			// Main-thread fallback path.
			//
			// Runs the export on the main thread (blocking UI). If the hardware
			// encoder config is rejected — which `isConfigSupported` can fail to
			// predict in Firefox — retries once with `forceSoftwareEncoding` so
			// the export still succeeds (software encoding is slower but handles
			// any valid resolution).
			const runMainThreadExport = async (
				forceSoftwareEncoding: boolean,
			): Promise<ExportResult> => {
				const exporter = new SceneExporter({
					width: canvasSize.width,
					height: canvasSize.height,
					fps: exportFps,
					format,
					quality,
					shouldIncludeAudio: !!includeAudio,
					audioBuffer: audioBuffer || undefined,
					forceSoftwareEncoding,
				});

				exporter.on("progress", (progress) => {
					const adjustedProgress = includeAudio
						? 0.05 + progress * 0.95
						: progress;
					onProgress?.({ progress: adjustedProgress });
				});

				let cancelled = false;
				const checkCancel = () => {
					if (onCancel?.()) {
						cancelled = true;
						exporter.cancel();
					}
				};

				const cancelInterval = setInterval(checkCancel, 100);

				try {
					const buffer = await Promise.race([
						exporter.export({ rootNode: scene }),
						new Promise<never>((_, reject) =>
							setTimeout(() => {
								exporter.cancel();
								reject(
									new Error(
										"Main-thread export timed out after 120s",
									),
								);
							}, 120_000),
						),
					]);
					clearInterval(cancelInterval);

					if (cancelled) {
						return { success: false, cancelled: true };
					}

					if (!buffer) {
						return { success: false, error: "Export failed to produce buffer" };
					}

					return {
						success: true,
						buffer,
					};
				} finally {
					clearInterval(cancelInterval);
				}
			};

			try {
				return await runMainThreadExport(false);
			} catch (error) {
				if (isEncoderConfigError(error)) {
					console.info(
						"[export] main-thread encoder config rejected, retrying with software encoding",
					);
					return await runMainThreadExport(true);
				}
				console.error("Export failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown export error",
				};
			}
		} catch (error) {
			console.error("Export failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown export error",
			};
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}

function blobToDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read blob"));
		reader.readAsDataURL(blob);
	});
}
