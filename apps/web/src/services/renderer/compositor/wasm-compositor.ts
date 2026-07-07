import {
	getCompositorCanvas,
	initCompositor,
	initCompositorWithCanvas,
	releaseTexture,
	renderFrame,
	resizeCompositor,
	uploadTexture,
} from "artidor-wasm";
import type { FrameDescriptor } from "./types";

function ensureOffscreenCanvas({
	source,
	width,
	height,
	label,
}: {
	source: CanvasImageSource;
	width: number;
	height: number;
	label: string;
}): OffscreenCanvas {
	if (source instanceof OffscreenCanvas) {
		return source;
	}

	if (typeof OffscreenCanvas === "undefined") {
		throw new Error(`OffscreenCanvas is required for ${label}`);
	}

	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error(`Failed to get 2d context for ${label}`);
	}
	context.clearRect(0, 0, width, height);
	context.drawImage(source, 0, 0, width, height);
	return canvas;
}

export type TextureUploadDescriptor = {
	id: string;
	source: CanvasImageSource;
	width: number;
	height: number;
};

class WasmCompositor {
	private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	private initializedSize: { width: number; height: number } | null = null;
	// Double-buffered texture ID sets for zero-allocation syncTextures.
	// Each frame: fill the "next" set, diff against "retained", then swap.
	// Both sets are reused across frames — no per-frame Set allocation.
	private retainedTextureIdsA = new Set<string>();
	private retainedTextureIdsB = new Set<string>();
	private uploadedTextures = new Map<
		string,
		{ source: CanvasImageSource; width: number; height: number }
	>();

	ensureInitialized({ width, height }: { width: number; height: number }) {
		if (!this.canvas) {
			initCompositor(width, height);
			this.canvas = getCompositorCanvas();
			this.initializedSize = { width, height };
			return;
		}

		if (
			!this.initializedSize ||
			this.initializedSize.width !== width ||
			this.initializedSize.height !== height
		) {
			resizeCompositor(width, height);
			this.initializedSize = { width, height };
		}
	}

	/**
	 * Initialize with an external OffscreenCanvas (Worker path).
	 * The canvas is typically transferred from the main thread.
	 */
	ensureInitializedWithCanvas({
		canvas,
		width,
		height,
	}: {
		canvas: OffscreenCanvas;
		width: number;
		height: number;
	}) {
		if (!this.canvas) {
			initCompositorWithCanvas(canvas);
			this.canvas = canvas;
			this.initializedSize = { width, height };
			return;
		}

		if (
			!this.initializedSize ||
			this.initializedSize.width !== width ||
			this.initializedSize.height !== height
		) {
			resizeCompositor(width, height);
			this.initializedSize = { width, height };
		}
	}

	getCanvas(): HTMLCanvasElement | OffscreenCanvas {
		if (!this.canvas) {
			throw new Error("Compositor is not initialized");
		}
		return this.canvas;
	}

	syncTextures(textures: TextureUploadDescriptor[]) {
		// Double-buffer swap pattern for zero per-frame Set allocation:
		//   - retainedTextureIdsA holds the previous frame's IDs (read-only)
		//   - retainedTextureIdsB is cleared and filled with this frame's IDs
		//   - After diffing, swap: A↔B so A holds the new frame's IDs.
		const nextIds = this.retainedTextureIdsB;
		nextIds.clear();
		for (const texture of textures) {
			nextIds.add(texture.id);
		}
		for (const previousId of this.retainedTextureIdsA) {
			if (!nextIds.has(previousId)) {
				releaseTexture(previousId);
				this.uploadedTextures.delete(previousId);
			}
		}

		for (const texture of textures) {
			const previousTexture = this.uploadedTextures.get(texture.id);
			if (
				previousTexture?.source === texture.source &&
				previousTexture.width === texture.width &&
				previousTexture.height === texture.height
			) {
				continue;
			}

			const sourceCanvas = ensureOffscreenCanvas({
				source: texture.source,
				width: texture.width,
				height: texture.height,
				label: `texture upload ${texture.id}`,
			});
			uploadTexture({
				id: texture.id,
				source: sourceCanvas,
				width: texture.width,
				height: texture.height,
			});
			this.uploadedTextures.set(texture.id, {
				source: texture.source,
				width: texture.width,
				height: texture.height,
			});
		}

		// Swap: B (now filled with this frame's IDs) becomes the new
		// retained set (A), and the old A becomes the buffer to clear
		// and fill next frame (B).
		const tmp = this.retainedTextureIdsA;
		this.retainedTextureIdsA = nextIds;
		this.retainedTextureIdsB = tmp;
	}

	render(frame: FrameDescriptor) {
		renderFrame(frame);
	}
}

export const wasmCompositor = new WasmCompositor();
