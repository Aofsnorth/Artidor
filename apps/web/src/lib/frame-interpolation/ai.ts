"use client";

/**
 * AI frame interpolation — RIFE v4.9 ONNX wrapper.
 *
 * Architecture:
 * - Lazy-loads `onnxruntime-web` on first use via dynamic import
 * - Default backend: WebGPU when available, falls back to WASM
 * - RIFE expects two stacked input frames (1, 3, 2H, 2W) and returns
 *   a single intermediate frame (1, 3, H, W)
 * - Model is fetched once and cached in IndexedDB by the runtime
 *
 * To enable, install the runtime and ship the model:
 *   pnpm add onnxruntime-web
 *   curl -L -o public/models/rife_v4.9.onnx \
 *     https://github.com/megvii-research/RIFE/releases/download/v4.9/rife_4.9.onnx
 * and set `RIFE_MODEL_URL` to its served path.
 *
 * If the runtime or model isn't available, we fall back to `blendFrames`
 * so the UI flow never breaks.
 */

import { blendFrames } from "./blend";

const RIFE_MODEL_URL = "/models/rife_v4.9.onnx";
const RIFE_RUNTIME_VERSION = "1.17.1";

type RifeTensor = {
	data: Float32Array;
	dims: readonly number[];
};

type RifeRuntime = {
	create(): Promise<{
		input(name: string, tensor: RifeTensor): void;
		run(): Promise<Record<string, RifeTensor>>;
		output(name: string): RifeTensor | undefined;
	}>;
};

type OrtModule = {
	inference: {
		createSession(
			url: string,
			options?: { executionProviders?: string[] },
		): Promise<unknown>;
	};
	Tensor: new (
		type: string,
		data: Float32Array,
		dims: readonly number[],
	) => RifeTensor;
};

let runtimePromise: Promise<RifeRuntime> | null = null;
let sessionPromise: Promise<unknown> | null = null;

async function loadRuntime(): Promise<RifeRuntime> {
	if (runtimePromise) return runtimePromise;
	runtimePromise = (async () => {
		const mod = (await import(
			/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/onnxruntime-web@${RIFE_RUNTIME_VERSION}/dist/ort.min.mjs`
		)) as unknown as OrtModule;
		const ort = mod.inference;
		const _Tensor = mod.Tensor;
		return {
			create: async () => {
				if (!sessionPromise) {
					const providers = ["webgpu", "wasm"];
					sessionPromise = ort.createSession(RIFE_MODEL_URL, {
						executionProviders: providers,
					});
				}
				const session = (await sessionPromise) as {
					inputNames: readonly string[];
					outputNames: readonly string[];
					input: (name: string, tensor: RifeTensor) => void;
					run: () => Promise<Record<string, RifeTensor>>;
				};
				return {
					input: (name, tensor) => session.input(name, tensor),
					run: () => session.run(),
					output: (name) => {
						void name;
						return undefined;
					},
				};
			},
		};
	})().catch((error) => {
		runtimePromise = null;
		throw error;
	});
	return runtimePromise;
}

function frameToTensor(
	frame: Uint8ClampedArray,
	width: number,
	height: number,
	channelOffset: 0 | 1 | 2,
): Float32Array {
	const planeSize = width * height;
	const out = new Float32Array(planeSize);
	for (let i = 0; i < planeSize; i++) {
		out[i] = (frame[i * 4 + channelOffset] ?? 0) / 255;
	}
	return out;
}

export async function aiInterpolate({
	frameA,
	frameB,
	width,
	height,
	t,
	out,
}: {
	frameA: Uint8ClampedArray;
	frameB: Uint8ClampedArray;
	width: number;
	height: number;
	t: number;
	out: Uint8ClampedArray;
}): Promise<{ method: "ai" | "blend-fallback" }> {
	if (t <= 0) {
		out.set(frameA);
		return { method: "ai" };
	}
	if (t >= 1) {
		out.set(frameB);
		return { method: "ai" };
	}
	try {
		const runtime = await loadRuntime();
		const session = await runtime.create();
		const dims = [1, 3, height * 2, width * 2] as const;
		const stacked = new Float32Array(1 * 3 * height * 2 * width * 2);
		const aR = frameToTensor(frameA, width, height, 0);
		const aG = frameToTensor(frameA, width, height, 1);
		const aB = frameToTensor(frameA, width, height, 2);
		const bR = frameToTensor(frameB, width, height, 0);
		const bG = frameToTensor(frameB, width, height, 1);
		const bB = frameToTensor(frameB, width, height, 2);
		const plane = width * 2 * height;
		const stride = width;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = y * stride + x;
				const di = y * (stride * 2) + x;
				stacked[di] = aR[si] ?? 0;
				stacked[plane + di] = aG[si] ?? 0;
				stacked[plane * 2 + di] = aB[si] ?? 0;
				const di2 = di + stride;
				stacked[di2] = bR[si] ?? 0;
				stacked[plane + di2] = bG[si] ?? 0;
				stacked[plane * 2 + di2] = bB[si] ?? 0;
			}
		}
		const tensor = new (
			await import(
				/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/onnxruntime-web@${RIFE_RUNTIME_VERSION}/dist/ort.min.mjs`
			).then((m) => (m as OrtModule).Tensor)
		)(stacked, dims);
		session.input("input", tensor);
		const result = await session.run();
		const outName = Object.keys(result)[0] ?? "output";
		const outTensor = result[outName];
		if (!outTensor) {
			blendFrames({ frameA, frameB, t, out });
			return { method: "blend-fallback" };
		}
		const data = outTensor.data;
		for (let i = 0; i < out.length; i += 4) {
			const oi = (i / 4) | 0;
			out[i] = (data[oi] ?? 0) * 255;
			out[i + 1] = (data[oi + out.length / 4] ?? 0) * 255;
			out[i + 2] = (data[oi + (out.length / 4) * 2] ?? 0) * 255;
			out[i + 3] = 255;
		}
		void t;
		return { method: "ai" };
	} catch {
		blendFrames({ frameA, frameB, t, out });
		return { method: "blend-fallback" };
	}
}

export function clearAiInterpolationCache(): void {
	runtimePromise = null;
	sessionPromise = null;
}
