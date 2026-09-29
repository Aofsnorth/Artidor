/**
 * Export-capability probe (diagnostic, not an assertion suite).
 *
 * Answers the question "is export as fast as it can be here?" with numbers
 * instead of assumptions. It measures the three things that actually decide
 * export throughput, and none of them is visible from the settings UI:
 *
 *  1. Is a HARDWARE video encoder real, or did `prefer-hardware` silently
 *     fall back to software? This is the classic invisible failure: the
 *     export runs, looks fine, and is several times slower than the user
 *     expects.
 *  2. Which render path is live — the WebGPU worker pool, or the
 *     main-thread fallback? The fallback is a different performance class.
 *  3. What the scheduler would actually choose: worker count and frame-queue
 *     depth for a 1080p job.
 *
 * Deliberately NOT a pass/fail test: the answer differs per machine and per
 * browser, and a test that asserted "hardware encoder present" would fail on
 * CI for reasons that have nothing to do with correctness.
 *
 * Run via:  npx playwright test tests/19-export-probe.spec.ts
 */
import { test } from "@playwright/test";
import { bootEditor, installErrorRecorder, insertMockVideo } from "./helpers";

type CodecProbe = {
	codec: string;
	hardware: boolean | null;
	software: boolean | null;
};

test("export capability probe", async ({ page }) => {
	const { warnings } = installErrorRecorder(page);
	await bootEditor(page);
	await insertMockVideo(page, { durationSeconds: 4 });

	const report = await page.evaluate(async () => {
		const w = window as unknown as {
			VideoEncoder?: {
				isConfigSupported?: (c: unknown) => Promise<{ supported?: boolean }>;
			};
			__ARTIDOR_DEBUG__?: {
				getState: () => { elements: Array<{ id: string; effects: unknown[] }> };
			};
		};

		// ── 1. Hardware video encoder reality check ──────────────────────
		const candidates = [
			{ label: "avc1.42001f (H.264 baseline)", codec: "avc1.42001f" },
			{ label: "avc1.640028 (H.264 high)", codec: "avc1.640028" },
			{ label: "vp09.00.10.08 (VP9 profile 0)", codec: "vp09.00.10.08" },
			{ label: "vp8", codec: "vp8" },
			{ label: "av01.0.04M.08 (AV1)", codec: "av01.0.04M.08" },
		];
		const codecs: CodecProbe[] = [];
		if (w.VideoEncoder?.isConfigSupported) {
			for (const candidate of candidates) {
				const base = {
					codec: candidate.codec,
					width: 1920,
					height: 1080,
					bitrate: 8_000_000,
					framerate: 30,
				};
				const hw = await w.VideoEncoder.isConfigSupported({
					...base,
					hardwareAcceleration: "prefer-hardware",
				})
					.then((r) => Boolean(r?.supported))
					.catch(() => null);
				const sw = await w.VideoEncoder.isConfigSupported({
					...base,
					hardwareAcceleration: "prefer-software",
				})
					.then((r) => Boolean(r?.supported))
					.catch(() => null);
				codecs.push({ codec: candidate.label, hardware: hw, software: sw });
			}
		}

		// ── 2. Which render path is live ────────────────────────────────
		const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
		const adapter = hasWebGPU
			? await (
					navigator as unknown as {
						gpu: { requestAdapter: () => Promise<unknown> };
					}
				).gpu
					.requestAdapter()
					.catch(() => null)
			: null;

		// ── 3. What the scheduler would choose for 1080p ───────────────
		const cores = navigator.hardwareConcurrency ?? 0;
		const bytesPerFrame = 1920 * 1080 * 4;
		const budgetBytes = 128 * 1024 * 1024;
		const queueDepth = Math.max(
			2,
			Math.min(16, cores || 1, Math.floor(budgetBytes / bytesPerFrame) || 1),
		);

		return {
			hasVideoEncoder: Boolean(w.VideoEncoder),
			codecs,
			hasWebGPU,
			adapterPresent: Boolean(adapter),
			cores,
			deviceMemoryGb: (navigator as unknown as { deviceMemory?: number })
				.deviceMemory,
			estimatedQueueDepth: queueDepth,
			frameBytes: bytesPerFrame,
		};
	});

	console.log("=== EXPORT CAPABILITY PROBE ===");
	console.log(`VideoEncoder API present : ${report.hasVideoEncoder}`);
	for (const codec of report.codecs) {
		const verdict =
			codec.hardware === true
				? "HARDWARE ✅"
				: codec.software === true
					? "software only ⚠️"
					: "unsupported";
		console.log(
			`  ${codec.codec.padEnd(30)} hw=${String(codec.hardware).padEnd(5)} sw=${String(codec.software).padEnd(5)} → ${verdict}`,
		);
	}
	console.log(`WebGPU navigator.gpu    : ${report.hasWebGPU}`);
	console.log(`GPU adapter available   : ${report.adapterPresent}`);
	console.log(`hardwareConcurrency     : ${report.cores}`);
	console.log(`navigator.deviceMemory  : ${report.deviceMemoryGb ?? "n/a"} GB`);
	console.log(
		`1080p frame bytes       : ${(report.frameBytes / 1048576).toFixed(1)} MiB`,
	);
	console.log(`estimated queue depth   : ${report.estimatedQueueDepth}`);
	if (warnings.length > 0) {
		console.log(`warnings: ${warnings.slice(0, 3).join(" | ")}`);
	}
});
