import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import {
	initializeGpuRenderer,
	isGpuAvailable,
} from "@/services/renderer/gpu-renderer";
import type { EditorCore } from "@/core";

const PRESET_THUMB_MAX = 256;

/**
 * Renders a square-ish PNG thumbnail of the current timeline at `time`, scaled
 * down to at most PRESET_THUMB_MAX on its longest side. Used to give saved
 * presets a recognisable preview. Returns null if the GPU is unavailable.
 */
export async function renderPresetThumbnail({
	editor,
	time,
}: {
	editor: EditorCore;
	time: number;
}): Promise<string | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;

	await initializeGpuRenderer();
	if (!isGpuAvailable()) return null;

	const tracks = editor.scenes.getActiveScene().tracks;
	const mediaAssets = editor.media.getAssets();
	const duration = editor.timeline.getTotalDuration();
	const { canvasSize, background } = project.settings;

	const scene = buildScene({
		tracks,
		mediaAssets,
		duration: duration || 1,
		canvasSize,
		background,
	});

	const renderer = new CanvasRenderer({
		width: canvasSize.width,
		height: canvasSize.height,
		fps: project.settings.fps,
	});

	const fullCanvas = document.createElement("canvas");
	fullCanvas.width = canvasSize.width;
	fullCanvas.height = canvasSize.height;

	await renderer.renderToCanvas({
		node: scene,
		time,
		targetCanvas: fullCanvas,
	});

	// Downscale to a thumbnail to keep IndexedDB rows small.
	const scale = Math.min(
		1,
		PRESET_THUMB_MAX / Math.max(canvasSize.width, canvasSize.height),
	);
	const thumbWidth = Math.max(1, Math.round(canvasSize.width * scale));
	const thumbHeight = Math.max(1, Math.round(canvasSize.height * scale));
	const thumbCanvas = document.createElement("canvas");
	thumbCanvas.width = thumbWidth;
	thumbCanvas.height = thumbHeight;
	const ctx = thumbCanvas.getContext("2d");
	if (!ctx) return null;
	ctx.drawImage(fullCanvas, 0, 0, thumbWidth, thumbHeight);

	return thumbCanvas.toDataURL("image/png");
}
