/**
 * Hardware detection for export worker sizing.
 *
 * Determines how many parallel segment workers to launch based on the user's
 * CPU cores, GPU adapter info, and available memory. Conservative defaults
 * ensure low-end machines don't thrash.
 */

import type { ExportMode } from "./index";

export interface HardwareInfo {
	/** Logical CPU cores (navigator.hardwareConcurrency). */
	cpuCores: number;
	/** Approximate device memory in GB (navigator.deviceMemory). */
	deviceMemoryGb: number;
	/** WebGPU adapter info if available, null if WebGPU unsupported. */
	gpuAdapter: GpuAdapterInfo | null;
}

export interface GpuAdapterInfo {
	/** Human-readable GPU vendor/name. */
	description: string;
	/** Vendor name (e.g. "nvidia", "intel", "amd"). */
	vendor: string;
	/** Architecture or family, if known. */
	architecture: string;
}

/**
 * Detect available hardware. Queries navigator.gpu for adapter info.
 * Falls back to conservative defaults when APIs are unavailable.
 */
export async function detectHardware(): Promise<HardwareInfo> {
	const cpuCores =
		typeof navigator !== "undefined" && navigator.hardwareConcurrency
			? navigator.hardwareConcurrency
			: 4;

	const deviceMemoryGb =
		typeof navigator !== "undefined" && (navigator as Navigator & { deviceMemory?: number }).deviceMemory
			? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
			: 4;

	let gpuAdapter: GpuAdapterInfo | null = null;
	try {
		if (typeof navigator !== "undefined" && navigator.gpu) {
			const adapter = await navigator.gpu.requestAdapter();
			if (adapter) {
				// requestAdapterInfo is not yet in all TS DOM lib versions.
				const info = await (adapter as GPUAdapter & {
					requestAdapterInfo?: () => Promise<{
						description?: string;
						vendor?: string;
						architecture?: string;
					}>;
				}).requestAdapterInfo?.();
				if (info) {
					gpuAdapter = {
						description: info.description || "Unknown GPU",
						vendor: info.vendor || "unknown",
						architecture: info.architecture || "",
					};
				}
			}
		}
	} catch {
		// WebGPU not available — CPU-only mode.
	}

	return { cpuCores, deviceMemoryGb, gpuAdapter };
}

/**
 * Recommend a number of parallel segment workers based on hardware and mode.
 *
 * Heuristics:
 * - CPU mode: one worker per logical core (up to 8). No GPU contention.
 * - GPU/Auto mode: 1 worker per 2 cores (GPU is shared, so more workers
 *   means more GPU context switching). Capped at 4.
 * - Low-memory machines (≤4GB): cap at 2 workers regardless.
 * - Single-core machines: always 1 (no parallelism benefit).
 */
export function recommendWorkerCount(
	hardware: HardwareInfo,
	mode: ExportMode,
): number {
	const { cpuCores, deviceMemoryGb, gpuAdapter } = hardware;

	// Single-core or unknown → no parallelism.
	if (cpuCores <= 1) return 1;

	// Low-memory machines can't sustain many workers (each ~50-200MB).
	const memoryCap = deviceMemoryGb <= 2 ? 1 : deviceMemoryGb <= 4 ? 2 : 16;

	if (mode === "cpu") {
		// CPU-only: no GPU contention, so one worker per core is fine.
		// Use all available cores (up to memory cap) for maximum CPU utilization.
		return Math.min(cpuCores, memoryCap, 16);
	}

	if (mode === "turbo") {
		// Turbo: maximum utilization. Use all cores + GPU. No cap below 16
		// (memory cap still applies). This will push both CPU and GPU to
		// ~100% by having many workers feeding the GPU render queue while
		// CPU encoders are busy.
		return Math.min(cpuCores, memoryCap, 16);
	}

	// GPU/Auto mode: More workers = more render work queued to GPU = higher
	// GPU utilization. Each worker also keeps a CPU encoder busy. The key
	// insight: GPU compositing is fast (~5ms/frame) but encoding is slow
	// (~50ms/frame), so we need many workers to keep the GPU fed while CPU
	// encoders are busy. Use 1 worker per core (not per 2 cores) to maximize
	// both GPU and CPU utilization.
	if (!gpuAdapter) {
		// No GPU available — treat as CPU mode.
		return Math.min(cpuCores, memoryCap, 16);
	}

	// GPU available: use all cores. GPU can handle multiple render contexts
	// (the overhead is small compared to the benefit of keeping it fed).
	return Math.min(cpuCores, memoryCap, 8);
}

/**
 * Human-readable summary of detected hardware for display in the UI.
 */
export function hardwareSummary(hardware: HardwareInfo): string {
	const parts = [`${hardware.cpuCores} CPU cores`];
	if (hardware.gpuAdapter) {
		parts.push(hardware.gpuAdapter.description);
	} else {
		parts.push("No GPU detected");
	}
	if (hardware.deviceMemoryGb > 0) {
		parts.push(`${hardware.deviceMemoryGb}GB RAM`);
	}
	return parts.join(" · ");
}
