/**
 * Unified compositor — auto-switches between WASM and Native (Tauri).
 *
 * Strategy:
 * - Preview rendering: ALWAYS uses WASM compositor (fast, no IPC overhead).
 * - Export/offline rendering: uses native WGPU when in Tauri (better quality,
 *   IPC roundtrip acceptable for offline).
 *
 * This avoids the per-frame IPC roundtrip that would make native preview
 * slower than WASM, while still getting native GPU acceleration for export.
 *
 * The native compositor is lazily initialized on first export request.
 */

import { isTauri } from "@/lib/tauri/detect";
import type { FrameDescriptor } from "./types";
import {
	wasmCompositor,
	type TextureUploadDescriptor,
} from "./wasm-compositor";

export type { TextureUploadDescriptor } from "./wasm-compositor";

class UnifiedCompositor {
	private nativeAvailable: boolean;
	private nativeReady = false;

	constructor() {
		this.nativeAvailable = isTauri();
	}

	/**
	 * Initialize the preview compositor (WASM).
	 * Always uses WASM — native is only for export.
	 */
	ensureInitialized({ width, height }: { width: number; height: number }) {
		wasmCompositor.ensureInitialized({ width, height });
	}

	getCanvas(): HTMLCanvasElement | OffscreenCanvas {
		return wasmCompositor.getCanvas();
	}

	syncTextures(textures: TextureUploadDescriptor[]) {
		wasmCompositor.syncTextures(textures);
	}

	/**
	 * Render a frame. Always uses WASM for preview (synchronous, fast).
	 */
	render(frame: FrameDescriptor) {
		try {
			wasmCompositor.render(frame);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (
				msg.includes("createBuffer") ||
				msg.includes("device is lost") ||
				msg.includes("GPUDevice") ||
				msg.includes("panicked")
			) {
				return;
			}
			throw error;
		}
	}

	/**
	 * Async render — used by export pipeline when in Tauri.
	 *
	 * In browser: delegates to WASM (sync, returned immediately).
	 * In Tauri: uses native WGPU via IPC for better export quality.
	 */
	async renderAsync(frame: FrameDescriptor): Promise<void> {
		// Browser: use WASM (sync)
		if (!this.nativeAvailable) {
			wasmCompositor.render(frame);
			return;
		}

		// Tauri: try native, fall back to WASM on any error
		try {
			await this.renderNative(frame);
		} catch (err) {
			console.warn(
				"[compositor] native render failed, falling back to WASM:",
				err,
			);
			wasmCompositor.render(frame);
		}
	}

	/**
	 * Native render via IPC. Only called from renderAsync when in Tauri.
	 * Initializes the native compositor on first call.
	 */
	private async renderNative(frame: FrameDescriptor): Promise<void> {
		if (!this.nativeReady) {
			const { invoke } = await import("@tauri-apps/api/core");
			await invoke("init_compositor", {
				width: frame.width ?? 1920,
				height: frame.height ?? 1080,
			});
			this.nativeReady = true;
		}

		const { invoke } = await import("@tauri-apps/api/core");
		const bytes = await invoke<number[]>("render_frame", { frame });
		const uint8 = new Uint8Array(bytes);

		// Draw BGRA bytes to the WASM compositor's canvas via putImageData.
		// This keeps the output canvas consistent with the preview path.
		const canvas = wasmCompositor.getCanvas();
		const width = (canvas as HTMLCanvasElement).width;
		const height = (canvas as HTMLCanvasElement).height;

		const ctx = (canvas as HTMLCanvasElement).getContext("2d");
		if (!ctx) throw new Error("Failed to get 2d context for native output");

		// BGRA → RGBA conversion
		const rgba = new Uint8ClampedArray(width * height * 4);
		for (let i = 0; i < uint8.length; i += 4) {
			rgba[i] = uint8[i + 2];
			rgba[i + 1] = uint8[i + 1];
			rgba[i + 2] = uint8[i];
			rgba[i + 3] = uint8[i + 3];
		}

		const imageData = new ImageData(rgba, width, height);
		ctx.putImageData(imageData, 0, 0);
	}

	get isNative(): boolean {
		return this.nativeAvailable && this.nativeReady;
	}
}

/**
 * Singleton — replaces `wasmCompositor` everywhere.
 *
 * Preview: always WASM (fast, no IPC).
 * Export: native WGPU when in Tauri (better quality).
 */
export const compositor = new UnifiedCompositor();
