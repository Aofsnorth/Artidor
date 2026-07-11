import {
	destroyGpu,
	getCompositorCanvas,
	initCompositor,
	initCompositorWithCanvas,
	initializeGpu,
	releaseTexture,
	renderFrame,
	resizeCompositor,
	uploadTexture,
} from "artidor-wasm";
import type { FrameDescriptor } from "./types";

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
			if (this.deviceLost) {
				// Don't re-init until the GPU recovery promise has resolved
				return;
			}
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
			if (this.deviceLost) {
				return;
			}
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

			uploadTexture({
				id: texture.id,
				source: texture.source,
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

	/** `true` while recovering from a GPU device-lost. */
	private deviceLost = false;

	render(frame: FrameDescriptor) {
		if (this.deviceLost) {
			// Drop frames silently until the compositor is re-created.
			return;
		}
		try {
			renderFrame(frame);
		} catch (error) {
			// wgpu panics when the GPU device is lost (tab backgrounded,
			// driver reset, OOM). Mark as lost so the next
			// ensureInitialized re-creates the compositor surface.
			const message = error instanceof Error ? error.message : String(error);
			if (
				message.includes("createBuffer") ||
				message.includes("device is lost") ||
				message.includes("GPUDevice") ||
				message.includes("panicked")
			) {
				console.warn("[compositor] GPU device lost, recovering...");
				this.markDeviceLost();
				return;
			}
			throw error;
		}
	}

	private markDeviceLost() {
		this.deviceLost = true;
		this.canvas = null;
		this.initializedSize = null;
		this.uploadedTextures.clear();
		this.retainedTextureIdsA.clear();
		this.retainedTextureIdsB.clear();

		// Destroy the dead Rust GPU runtime and spin up a new one so the
		// next `initCompositor` request gets a fresh, working device.
		try {
			destroyGpu();
			void initializeGpu().then(() => {
				console.log("[compositor] GPU device recovered");
				this.deviceLost = false;
			});
		} catch (err) {
			console.error("[compositor] GPU recovery failed:", err);
		}
	}
}

export const wasmCompositor = new WasmCompositor();
