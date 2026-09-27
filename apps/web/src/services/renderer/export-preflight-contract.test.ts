/**
 * Renderer manager — export pre-flight and audio-handover wiring.
 *
 * `RendererManager.exportProject` needs a live editor core, a WebGPU device and
 * WebCodecs, so the assertions here are source contracts. The *policy* those
 * contracts delegate to (`planExportMemory`, `readExportHostHeadroom`) is unit
 * tested for real in `export-performance.test.ts`.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	`${import.meta.dir}/../../core/managers/renderer-manager.ts`,
	"utf8",
);

describe("renderer manager pre-flight (static-only)", () => {
	test("runs before any expensive work and refuses an impossible export", () => {
		// The pre-flight must precede the audio mixdown, otherwise a doomed
		// export still pays for a full mix.
		const preflightAt = source.indexOf("planExportMemory({");
		const mixAt = source.indexOf("const mixAudio = ()");
		expect(preflightAt).toBeGreaterThan(-1);
		expect(mixAt).toBeGreaterThan(-1);
		expect(preflightAt).toBeLessThan(mixAt);

		// It reads the real browser signals and never trusts a zero.
		expect(source).toContain("readExportHostHeadroom()");
		expect(source).toContain("storageQuotaBytes: hostHeadroom.storageQuotaBytes");
		expect(source).toContain("deviceMemoryGb: hostHeadroom.deviceMemoryGb");
	});

	test("returns a real error instead of starting the export", () => {
		expect(source).toMatch(
			/if \(memoryPlan\.insufficient\) \{[\s\S]{0,400}?success: false,/,
		);
		// No fake success: the reason is surfaced verbatim.
		expect(source).toContain("error:\n\t\t\t\t\t\tmemoryPlan.reason ??");
	});

	test("the plan lowers the parallel fan-out instead of only warning", () => {
		expect(source).toContain("maxWorkerCount: memoryPlan.workerCount");
	});

	test("budgets disk only for the worker paths, two copies for the parallel one", () => {
		// The main-thread `SceneExporter` muxes into RAM, so a browser without
		// worker support must not be charged for OPFS space it will not use.
		expect(source).toContain("workerPathAvailable && streamToDisk ? 2");
		expect(source).toContain("workerPathAvailable ? 1 : 0");
		// Both signals are read once, not re-queried later.
		expect(source.match(/isDiskBackedExportSupported\(\)/g) ?? []).toHaveLength(
			1,
		);
		expect(source.match(/isExportWorkerSupported\(\)/g) ?? []).toHaveLength(1);
	});
});

describe("renderer manager audio handover (static-only)", () => {
	test("the worker attempt consumes the mixdown by transfer", () => {
		expect(source).toContain("consumeAudioBuffer: !!includeAudio");
		expect(source).toContain("if (includeAudio) audioConsumedByWorker = true;");
	});

	test("every later consumer re-mixes so no fallback is silent", () => {
		// The whole point of the flag: a detached mixdown must be replaced
		// before the software retry or the main-thread fallback reads it.
		expect(source).toContain("const ensureAudio = async ()");
		expect(source).toContain("const swAudio = await ensureAudio();");
		expect(source).toContain("const mainThreadAudio = await ensureAudio();");
		expect(source).toContain("audioBuffer: swAudio || null,");
		expect(source).toContain("audioBuffer: mainThreadAudio || undefined,");
		// The flag is cleared once the buffer has been replaced, so a second
		// fallback does not re-mix needlessly.
		expect(source).toContain("audioConsumedByWorker = false;");
	});
});
