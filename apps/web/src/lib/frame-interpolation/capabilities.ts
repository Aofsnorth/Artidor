"use client";

import type { FrameInterpolationCapabilities } from "@/lib/timeline";

let cached: FrameInterpolationCapabilities | null = null;
let detectionPromise: Promise<FrameInterpolationCapabilities> | null = null;

const CACHE_DURATION_MS = 30_000;

function isWebGpuAvailable(): boolean {
	if (typeof navigator === "undefined") return false;
	const gpu = (
		navigator as Navigator & {
			gpu?: { requestAdapter?: () => Promise<unknown> };
		}
	).gpu;
	return Boolean(gpu?.requestAdapter);
}

function isWebGl2Available(): boolean {
	if (typeof document === "undefined") return false;
	try {
		const canvas = document.createElement("canvas");
		return Boolean(canvas.getContext("webgl2"));
	} catch {
		return false;
	}
}

async function detectHardware(): Promise<FrameInterpolationCapabilities> {
	const webgpu = isWebGpuAvailable();
	const webgl2 = isWebGl2Available();
	const hardware = webgpu ? "webgpu" : webgl2 ? "webgl2" : "wasm";

	return {
		blend: true,
		opticalFlow: webgl2 || webgpu,
		ai: webgpu,
		hardware,
	};
}

export async function getFrameInterpolationCapabilities(): Promise<FrameInterpolationCapabilities> {
	if (cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
		return cached.value;
	}
	if (!detectionPromise) {
		detectionPromise = detectHardware();
	}
	const value = await detectionPromise;
	detectionPromise = null;
	cached = { value, cachedAt: Date.now() };
	return value;
}

export function resetFrameInterpolationCache(): void {
	cached = null;
	detectionPromise = null;
}
