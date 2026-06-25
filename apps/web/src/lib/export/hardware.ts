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
 * - CPU mode: one worker per logical core (up to 16). No GPU contention.
 * - GPU/Auto mode: all cores up to 8 (GPU shared but can handle multiple
 *   contexts). With 16GB+ RAM, there's plenty of memory for 8 workers.
 * - Turbo mode: all cores up to 16. Maximum utilization for capable machines.
 * - Low-memory machines (≤4GB): cap at 2 workers regardless.
 * - Single-core machines: always 1 (no parallelism benefit).
 *
 * Note: navigator.deviceMemory is capped at 8GB by browsers for privacy,
 * so a 16GB machine reports 8. The memory cap uses this conservatively.
 */
export function recommendWorkerCount(
	hardware: HardwareInfo,
	mode: ExportMode,
): number {
	const { cpuCores, deviceMemoryGb, gpuAdapter } = hardware;

	// Single-core or unknown → no parallelism.
	if (cpuCores <= 1) return 1;

	// navigator.deviceMemory caps at 8, so "8" could mean 8GB or 16GB+.
	// Treat 8 as "plenty of RAM" — no memory cap beyond the mode cap.
	const memoryCap = deviceMemoryGb <= 2 ? 1 : deviceMemoryGb <= 4 ? 2 : 16;

	if (mode === "cpu") {
		// CPU-only: no GPU contention, one worker per core.
		return Math.min(cpuCores, memoryCap, 16);
	}

	if (mode === "turbo") {
		// Turbo: maximum utilization. All cores + GPU.
		return Math.min(cpuCores, memoryCap, 16);
	}

	// Auto/GPU mode: use all cores up to 8. With 16GB RAM (reported as 8),
	// 8 workers (~1.4GB) is well within budget and keeps GPU fed.
	if (!gpuAdapter) {
		// No GPU available — treat as CPU mode.
		return Math.min(cpuCores, memoryCap, 16);
	}

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
