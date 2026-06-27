/**
 * Unified compositor — auto-switches between WASM and Native (Tauri).
 *
 * When running inside Tauri, delegates to the native WGPU compositor
 * via IPC for better performance (DX12/Metal/Vulkan instead of WebGPU).
 * When running in a browser, uses the WASM compositor as before.
 *
 * The interface mirrors `WasmCompositor` so `CanvasRenderer` can use
 * either transparently.
 */

import { isTauri } from "@/lib/tauri/detect";
import type { FrameDescriptor } from "./types";
import {
	wasmCompositor,
	type TextureUploadDescriptor,
} from "./wasm-compositor";

export type { TextureUploadDescriptor } from "./wasm-compositor";

/**
 * Unified compositor that switches between WASM and native.
 *
 * Native path:
 * - ensureInitialized → invoke("init_compositor")
 * - syncTextures → no-op (native compositor handles textures internally)
 * - render → invoke("render_frame") → BGRA bytes → putImageData to canvas
 *
 * WASM path:
 * - delegates entirely to `wasmCompositor`
 */
class UnifiedCompositor {
	private nativeMode = false;
	private nativeReady = false;
	private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
	private initialized = false;

	constructor() {
		this.nativeMode = isTauri();
	}

	ensureInitialized({ width, height }: { width: number; height: number }) {
		if (this.nativeMode) {
			this.ensureNativeInitialized({ width, height });
			return;
		}
		wasmCompositor.ensureInitialized({ width, height });
		this.canvas = wasmCompositor.getCanvas();
		this.initialized = true;
	}

	private async ensureNativeInitialized({ width, height }: { width: number; height: number }) {
		if (this.initialized && this.canvas) return;

		// Create a canvas for putImageData output
		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2d context for native compositor");
		this.ctx = ctx;

		// Init native compositor via IPC
		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("init_compositor", { width, height });
		this.nativeReady = true;
		this.initialized = true;
	}

	getCanvas(): HTMLCanvasElement | OffscreenCanvas {
		if (!this.canvas) {
			throw new Error("Compositor is not initialized");
		}
		return this.canvas;
	}

	syncTextures(textures: TextureUploadDescriptor[]) {
		if (!this.nativeMode) {
			wasmCompositor.syncTextures(textures);
		}
		// Native: textures are handled by the Rust compositor directly.
		// The FrameDescriptor contains texture data that the Rust side
		// processes natively.
	}

	render(frame: FrameDescriptor) {
		if (!this.nativeMode) {
			wasmCompositor.render(frame);
			return;
		}
		// Native render is async — but render() is called synchronously
		// by CanvasRenderer. We need to handle this differently.
		// The native path uses renderAsync() instead.
		throw new Error(
			"Native compositor requires async render — use renderAsync()",
		);
	}

	/**
	 * Async render for native mode. Returns a promise that resolves
	 * when the frame is drawn to the canvas.
	 *
	 * For WASM mode, this is synchronous (returns immediately).
	 */
	async renderAsync(frame: FrameDescriptor): Promise<void> {
		if (!this.nativeMode) {
			wasmCompositor.render(frame);
			return;
		}

		if (!this.nativeReady || !this.ctx || !this.canvas) {
			throw new Error("Native compositor not initialized");
		}

		const { invoke } = await import("@tauri-apps/api/core");
		const bytes = await invoke<number[]>("render_frame", { frame });
		const uint8 = new Uint8Array(bytes);

		const width = (this.canvas as HTMLCanvasElement).width;
		const height = (this.canvas as HTMLCanvasElement).height;

		// BGRA → RGBA conversion for putImageData
		const rgba = new Uint8ClampedArray(width * height * 4);
		for (let i = 0; i < uint8.length; i += 4) {
			rgba[i] = uint8[i + 2];     // R ← B
			rgba[i + 1] = uint8[i + 1]; // G
			rgba[i + 2] = uint8[i];     // B ← R
			rgba[i + 3] = uint8[i + 3]; // A
		}

		const imageData = new ImageData(rgba, width, height);
		this.ctx.putImageData(imageData, 0, 0);
	}

	get isNative(): boolean {
		return this.nativeMode;
	}
}

/**
 * Singleton — replaces `wasmCompositor` everywhere.
 *
 * In Tauri: uses native WGPU compositor via IPC.
 * In browser: delegates to `wasmCompositor`.
 */
export const compositor = new UnifiedCompositor();
