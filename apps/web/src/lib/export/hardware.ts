/**
 * Hardware detection for export worker sizing.
 *
 * Determines how many parallel segment workers to launch based on the user's
 * CPU cores, GPU adapter info, and available memory. Conservative defaults
 * ensure low-end machines don't thrash.
 */

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

	const navigatorDeviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
	const deviceMemoryGb =
		typeof navigator !== "undefined" && navigatorDeviceMemory
			? navigatorDeviceMemory
			: 4;

	let gpuAdapter: GpuAdapterInfo | null = null;
	try {
		if (typeof navigator !== "undefined" && navigator.gpu) {
			const adapter = await navigator.gpu.requestAdapter();
			if (adapter) {
				// requestAdapterInfo() is the older API; adapter.info is the
				// newer property. Try both for cross-browser compatibility.
				const info = await (adapter as GPUAdapter & {
					requestAdapterInfo?: () => Promise<{
						description?: string;
						vendor?: string;
						architecture?: string;
					}>;
					info?: {
						description?: string;
						vendor?: string;
						architecture?: string;
					};
				}).requestAdapterInfo?.();
				const adapterInfo = info ?? (adapter as GPUAdapter & {
					info?: {
						description?: string;
						vendor?: string;
						architecture?: string;
					};
				}).info;
				if (adapterInfo) {
					gpuAdapter = {
						description: adapterInfo.description || "Unknown GPU",
						vendor: adapterInfo.vendor || "unknown",
						architecture: adapterInfo.architecture || "",
					};
				} else {
					// Adapter exists but no info available — still report a GPU.
					gpuAdapter = {
						description: "GPU (info unavailable)",
						vendor: "unknown",
						architecture: "",
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
 * Recommend a number of parallel segment workers based on hardware.
 *
 * Heuristics:
 * - 1-2 core machines: always 1 worker. The main thread (React/UI/concat)
 *   needs a core too — 2 workers + main thread = 3 threads on 2 cores causes
 *   heavy context switching, making exports ~2x slower than a single worker.
 * - 3+ cores: one worker per core, capped by available memory.
 * - Low-memory machines (≤4GB): cap at 2 workers regardless.
 *
 * Note: navigator.deviceMemory is capped at 8GB by browsers for privacy,
 * so a 16GB machine reports 8. The memory cap uses this conservatively.
 */
export function recommendWorkerCount(hardware: HardwareInfo): number {
	const { cpuCores, deviceMemoryGb } = hardware;

	// Single-core or unknown → no parallelism.
	if (cpuCores <= 1) return 1;

	// 2-core machines: always 1 worker. The main thread (React/UI/concat)
	// needs a core too — 2 workers + main thread = 3 threads on 2 cores
	// causes heavy context switching and memory pressure, making exports
	// ~2x slower than a single worker. Measured: 1 worker=18.8s vs 2 workers=32.9s.
	if (cpuCores <= 2) return 1;

	// navigator.deviceMemory caps at 8, so "8" could mean 8GB or 16GB+.
	// Treat 8 as "plenty of RAM" — no memory cap beyond the core cap.
	const memoryCap = deviceMemoryGb <= 2 ? 1 : deviceMemoryGb <= 4 ? 2 : 16;

	return Math.min(cpuCores, memoryCap, 8);
}

/**
 * Recommend export workers after accounting for WebGPU compositor pressure.
 *
 * Each parallel segment owns a WebGPU device, decoder, encoder queue, and
 * output canvas. CPU-based worker counts alone can over-subscribe one GPU:
 * competing contexts reduce throughput and can force driver memory eviction.
 * The cap is based on output pixels, which is known before work starts and is
 * more reliable than privacy-reduced adapter strings.
 */
export function recommendExportWorkerCount({
	hardware,
	width,
	height,
}: {
	hardware: HardwareInfo;
	width: number;
	height: number;
}): number {
	if (!hardware.gpuAdapter) return 1;

	const pixels = Math.max(0, width) * Math.max(0, height);
	const fourKPixels = 3840 * 2160;
	const gpuWorkerCap = pixels > fourKPixels ? 1 : pixels >= fourKPixels ? 2 : 4;

	return Math.min(recommendWorkerCount(hardware), gpuWorkerCap);
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
