import {
	destroyCompositor,
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

/**
 * True when an error thrown from the WASM boundary indicates the GPU device
 * died (driver reset, OOM, tab backgrounded) rather than a logic bug. Such
 * errors are recoverable: the compositor tears itself down and rebuilds on a
 * fresh device. Anything else must propagate.
 *
 * `unreachable` matters as much as the `panicked at ...` text: wasm-bindgen
 * cannot unwind a Rust panic, so the value that actually THROWN into JS is a
 * bare `RuntimeError: unreachable`. The "panicked at" string only ever
 * appears on the console via `console_error_panic_hook` and is not part of
 * the error object. Matching on "panicked" alone therefore missed every real
 * wasm panic, so the device was never rebuilt and the preview stayed frozen
 * until a full page reload.
 */
function isGpuDeviceLostError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("createBuffer") ||
		message.includes("device is lost") ||
		message.includes("GPUDevice") ||
		message.includes("panicked") ||
		message.includes("unreachable") ||
		message.includes("GPU context not initialized") ||
		message.includes("Compositor is not initialized")
	);
}

class WasmCompositor {
	private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	private initializedSize: { width: number; height: number } | null = null;
	/**
	 * The externally-owned canvas handed to `ensureInitializedWithCanvas`
	 * (worker path). Recovery MUST re-create the compositor on this exact
	 * canvas — the worker's `CanvasSource` keeps encoding it, so swapping in
	 * a new canvas would silently encode blank frames.
	 */
	private pinnedCanvas: OffscreenCanvas | null = null;
	/**
	 * Non-null while a device-lost recovery is in flight: the GPU runtime was
	 * destroyed and `initializeGpu` is rebuilding it. Renders are dropped
	 * until the promise resolves.
	 */
	private recoveryPromise: Promise<void> | null = null;
	/** `true` while the compositor is unusable (device lost, not yet rebuilt). */
	private deviceLost = false;
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
		if (this.deviceLost || this.recoveryPromise) {
			// Don't re-init until the GPU recovery promise has resolved
			return;
		}
		if (!this.canvas) {
			if (this.pinnedCanvas) {
				// Worker path (first init or post-recovery rebuild): reuse the
				// pinned canvas so the worker's CanvasSource keeps its identity.
				initCompositorWithCanvas(this.pinnedCanvas);
				this.canvas = this.pinnedCanvas;
				this.initializedSize = null;
			} else {
				initCompositor(width, height);
				this.canvas = getCompositorCanvas();
				this.initializedSize = { width, height };
			}
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
		// Pin the canvas so a later device-lost recovery rebuilds on it.
		this.pinnedCanvas = canvas;
		if (this.deviceLost || this.recoveryPromise) {
			return;
		}
		if (!this.canvas) {
			initCompositorWithCanvas(canvas);
			this.canvas = canvas;
			this.initializedSize = null;
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

	/** True while a GPU recovery is pending (device lost, rebuild in flight). */
	get inRecovery(): boolean {
		return this.deviceLost || this.recoveryPromise !== null;
	}

	/**
	 * Resolves once the in-flight GPU recovery has rebuilt the device and
	 * compositor. Rejects when the recovery itself failed (adapter gone) so
	 * callers like the export worker can fail the export instead of encoding
	 * garbage forever. Resolves immediately when no recovery is running.
	 */
	whenRecovered(): Promise<void> {
		return this.recoveryPromise ?? Promise.resolve();
	}

	/**
	 * Release the preview's GPU resources so an export worker gets the full
	 * GPU budget. The main-thread device, its uploaded textures and the
	 * compositor surface are destroyed and rebuilt lazily in the background;
	 * the next preview render after the export transparently re-uploads.
	 */
	releaseForExport(): void {
		// beginRecovery is idempotent: a recovery already in flight is reused,
		// and a retry after a failed recovery is exactly what we want here.
		this.beginRecovery();
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
				try {
					releaseTexture(previousId);
					this.uploadedTextures.delete(previousId);
				} catch (error) {
					if (isGpuDeviceLostError(error)) {
						this.beginRecovery();
						return;
					}
					throw error;
				}
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

			try {
				uploadTexture({
					id: texture.id,
					source: texture.source,
					width: texture.width,
					height: texture.height,
				});
			} catch (error) {
				// A panicking upload (OOM, device loss) must tear down the
				// compositor exactly like a panicking render — otherwise the
				// stale bookkeeping keeps "skip re-upload" decisions and every
				// later frame renders with missing textures.
				if (isGpuDeviceLostError(error)) {
					this.beginRecovery();
					return;
				}
				throw error;
			}
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
			if (isGpuDeviceLostError(error)) {
				console.warn("[compositor] GPU device lost, recovering...");
				this.beginRecovery();
				return;
			}
			throw error;
		}
	}

	/**
	 * Tear the GPU runtime down and rebuild it in the background. Shared by
	 * the panic path (`render`/`syncTextures`) and the deliberate handover to
	 * an export worker (`releaseForExport`).
	 *
	 * Idempotent: a recovery already in flight is reused. The compositor is
	 * rebuilt on the pinned canvas when there is one (worker path — the
	 * `CanvasSource` keeps encoding that exact canvas), or on a fresh canvas
	 * (main thread) at the last known size.
	 */
	private beginRecovery(): Promise<void> {
		if (this.recoveryPromise) return this.recoveryPromise;

		const size = this.initializedSize;
		this.deviceLost = true;
		this.canvas = null;
		this.initializedSize = null;
		this.uploadedTextures.clear();
		this.retainedTextureIdsA.clear();
		this.retainedTextureIdsB.clear();

		try {
			// Drop the compositor runtime (surface, textures, pipelines) and
			// the dead GPU runtime; `initializeGpu` builds a fresh device.
			destroyCompositor();
			destroyGpu();
		} catch (error) {
			console.error("[compositor] teardown during recovery failed:", error);
		}

		const recovery = initializeGpu()
			.then(() => {
				if (this.pinnedCanvas) {
					initCompositorWithCanvas(this.pinnedCanvas);
					this.canvas = this.pinnedCanvas;
				} else if (size) {
					initCompositor(size.width, size.height);
					this.canvas = getCompositorCanvas();
				} else {
					// Nothing to rebuild onto yet — the next
					// ensureInitialized call creates the compositor.
					this.recoveryPromise = null;
					this.deviceLost = false;
					return;
				}
				// Canvas elements (HTML and Offscreen) both expose width/height,
				// so no DOM-global type check is needed here — the Bun test env
				// has no OffscreenCanvas constructor.
				this.initializedSize = {
					width: this.canvas.width,
					height: this.canvas.height,
				};
				this.deviceLost = false;
				// Clear so a later recovery (next panic, next export handover)
				// can run — beginRecovery treats a non-null promise as in-flight.
				this.recoveryPromise = null;
			})
			.catch((error) => {
				console.error("[compositor] GPU recovery failed:", error);
				// Stay lost: renders keep dropping. Clear the promise so a
				// later beginRecovery (e.g. next export) can retry.
				this.recoveryPromise = null;
				this.deviceLost = true;
				throw error;
			});
		this.recoveryPromise = recovery;
		void recovery.catch(() => {
			// Already logged above; this swallow keeps the promise chain from
			// surfacing as an unhandled rejection when nobody awaits it.
		});
		return recovery;
	}
}

export const wasmCompositor = new WasmCompositor();
