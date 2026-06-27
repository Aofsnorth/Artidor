/**
 * Tauri IPC bridge for the native WGPU compositor.
 *
 * When running inside Tauri, this module replaces the WASM compositor
 * (`wasm-compositor.ts`) with native Tauri commands that call into the
 * Rust `compositor` crate via IPC. The interface mirrors `WasmCompositor`
 * so the renderer can switch between WASM and native transparently.
 *
 * Performance advantage: native WGPU (DX12/Metal/Vulkan) is faster than
 * WASM WGPU (WebGPU) and avoids the OffscreenCanvas → ImageBitmap copy.
 * The native compositor renders directly to a GPU texture and reads back
 * BGRA bytes, which are drawn to the canvas via `putImageData`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { FrameDescriptor } from "@/services/renderer/compositor/types";

/**
 * Native compositor bridge — mirrors the `WasmCompositor` interface.
 *
 * Unlike the WASM compositor, the native compositor:
 * - Does not need an OffscreenCanvas (renders offscreen on the GPU)
 * - Returns BGRA bytes directly (no canvas readback)
 * - Uses native WGPU (DX12/Metal/Vulkan) instead of WebGPU
 */
export class NativeCompositor {
	private initialized = false;

	/**
	 * Initialize the native WGPU compositor.
	 *
	 * Creates a native GPU context and compositor instance on the Rust
	 * side. Called once when the renderer starts.
	 */
	async ensureInitialized({ width, height }: { width: number; height: number }): Promise<void> {
		if (this.initialized) return;
		await invoke("init_compositor", { width, height });
		this.initialized = true;
	}

	/**
	 * Render a frame and return the BGRA pixel data.
	 *
	 * Sends the `FrameDescriptor` to the Rust compositor via IPC and
	 * receives raw BGRA bytes back. The caller draws these bytes to a
	 * canvas via `ImageData` + `putImageData`.
	 *
	 * The returned `Uint8Array` contains `width * height * 4` bytes in
	 * BGRA order, matching the canvas's `ImageData` format.
	 */
	async renderFrame(frame: FrameDescriptor): Promise<Uint8Array> {
		if (!this.initialized) {
			throw new Error("NativeCompositor not initialized — call ensureInitialized first");
		}
		const bytes = await invoke<number[]>("render_frame", { frame });
		return new Uint8Array(bytes);
	}

	/**
	 * Check if the native compositor is ready.
	 */
	async isReady(): Promise<boolean> {
		try {
			return await invoke<boolean>("is_compositor_ready");
		} catch {
			return false;
		}
	}
}

/**
 * Singleton instance — the native compositor is process-global.
 */
let nativeCompositor: NativeCompositor | null = null;

/**
 * Returns the singleton `NativeCompositor` instance.
 *
 * Returns `null` if not running in Tauri.
 */
export function getNativeCompositor(): NativeCompositor | null {
	if (!nativeCompositor) {
		nativeCompositor = new NativeCompositor();
	}
	return nativeCompositor;
}
