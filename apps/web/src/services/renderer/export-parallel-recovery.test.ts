/**
 * Parallel export — segment recovery and main-thread discipline.
 *
 * Two halves:
 *  - the retry policy (`selectRetryableSegmentIndexes`) is a pure function, so
 *    it is tested directly: the whole point is that finished work survives a
 *    sibling's failure;
 *  - everything else (OPFS ownership, cancellation, yielding, progress) needs a
 *    live `Worker` plus mediabunny's muxer, so it is asserted as a source
 *    contract. Marked `static-only`, consistent with the other export suites.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { selectRetryableSegmentIndexes } from "./parallel-export";
import type { ExportWorkerResult } from "./export-worker-bridge";

const source = readFileSync(`${import.meta.dir}/parallel-export.ts`, "utf8");

const ok = (buffer: ArrayBuffer): ExportWorkerResult => ({
	success: true,
	buffer,
});
const okStreamed = (fileName: string): ExportWorkerResult => ({
	success: true,
	streamed: { byteLength: 10, fileName },
});
const failed = (error: string): ExportWorkerResult => ({
	success: false,
	error,
});
const cancelled: ExportWorkerResult = { success: false, cancelled: true };

describe("selectRetryableSegmentIndexes", () => {
	test("retries only the failed segment and keeps the finished ones", () => {
		const indexes = selectRetryableSegmentIndexes([
			ok(new ArrayBuffer(1)),
			failed("worker died"),
			ok(new ArrayBuffer(1)),
			ok(new ArrayBuffer(1)),
		]);
		expect(indexes).toEqual([1]);
	});

	test("treats a streamed segment as finished work", () => {
		expect(
			selectRetryableSegmentIndexes([
				okStreamed("export-a.mp4"),
				okStreamed("export-b.mp4"),
			]),
		).toEqual([]);
	});

	test("never relaunches a segment the user cancelled", () => {
		// Relaunching after a cancel would keep burning CPU on an export the
		// user already stopped.
		expect(
			selectRetryableSegmentIndexes([ok(new ArrayBuffer(1)), cancelled]),
		).toEqual([]);
		expect(selectRetryableSegmentIndexes([cancelled, cancelled])).toEqual([]);
	});

	test("returns every index when the whole round failed", () => {
		expect(
			selectRetryableSegmentIndexes([
				failed("a"),
				failed("b"),
				failed("c"),
				failed("d"),
			]),
		).toEqual([0, 1, 2, 3]);
	});

	test("returns nothing for an empty or fully successful round", () => {
		expect(selectRetryableSegmentIndexes([])).toEqual([]);
		expect(
			selectRetryableSegmentIndexes([ok(new ArrayBuffer(1)), ok(new ArrayBuffer(1))]),
		).toEqual([]);
	});
});

describe("parallel export segment recovery (static-only)", () => {
	test("the retry merges into the results, keeping the untouched successes", () => {
		// `results[planIndex] = retried[slot]` overwrites only the failed slots.
		expect(source).toContain("results[planIndex] = retried[slot]");
		// The retry launches only the failed plans, never all of them again.
		expect(source).toContain(
			"failedIndexes.map((index) => plans[index])",
		);
	});

	test("an encoder-config rejection retries that segment in software", () => {
		// The pinned codec is left alone, so the retried segment stays
		// bitstream-compatible with its siblings and no re-encode is needed.
		expect(source).toContain("isEncoderConfigError(failure.error)");
		expect(source).toContain("forceSoftwareEncoding: force");
	});

	test("a segment that still fails throws so the caller falls back", () => {
		expect(source).toContain(`Parallel segment failed: \${segmentError}`);
	});

	test("segment files are adopted once and deleted on every exit path", () => {
		// Adoption (the bridge forgets the file, so somebody must own it).
		expect(source).toContain("ownedFiles.add(result.streamed.fileName)");
		// Cancellation.
		expect(source).toMatch(
			/if \(wasCancelled \|\| getCancelled\?\.\(\)\) \{\s*discardOwnedFiles\(\);/,
		);
		// Unrecoverable segment error.
		expect(source).toMatch(
			/if \(segmentError !== null\) \{\s*discardOwnedFiles\(\);/,
		);
		// Success *and* a throwing stitch: the `finally` is the only thing that
		// stops every segment file from being orphaned in OPFS.
		expect(source).toMatch(
			/\} finally \{\s*\n\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*discardOwnedFiles\(\);/,
		);
	});
});

describe("parallel export main-thread discipline (static-only)", () => {
	test("the stitch yields the event loop between packet batches", () => {
		expect(source).toContain("await yieldToEventLoop()");
		expect(source).toContain("if (++sinceYield >= CONCAT_PACKETS_PER_YIELD)");
		// A microtask-only yield would keep the browser starving.
		expect(source).toContain("scheduler?.yield");
		expect(source).toContain("setTimeout(resolve, 0)");
	});

	test("the stitch reports byte-weighted progress", () => {
		expect(source).toContain("CONCAT_PROGRESS_SHARE");
		expect(source).toContain("copiedBytes += packet.byteLength");
		expect(source).toContain("reportBytes(copiedBytes)");
	});

	test("the stitch checks cancellation at every segment and packet", () => {
		// Once before each segment's work…
		expect(source).toMatch(
			/for \(const segment of segments\) \{\s*\n\s*if \(getCancelled\?\.\(\)\)/,
		);
		// …and once per packet, so a long segment is interruptible.
		expect(source).toMatch(
			/while \(packet\) \{\s*\n\s*if \(getCancelled\?\.\(\)\)/,
		);
		expect(source).toContain("await abortOutput();");
		// The partial output must not survive an abort.
		expect(source).toContain("await tempOutput?.remove().catch(() => {});");
	});

	test("worker startup is staggered on the post-GPU-ready signal", () => {
		expect(source).toContain("waitForWorkerGpuReady(gpuReady");
		// The ready signal must actually reach the worker: a gate that is never
		// opened just waits out the fallback delay for every worker.
		expect(source).toContain("run(plan, () => signalGpuReady?.())");
		expect(source).toContain("launchSegments(targets, (plan, onGpuReady) => {");
		expect(source).toContain(
			"runSegment(plan, { forceSoftwareEncoding: force, onGpuReady })",
		);
		expect(source).toContain("onReady: onGpuReady,");
		// The bound is named and documented, not a bare 500ms literal.
		expect(source).toContain("const GPU_READY_FALLBACK_MS = 5_000;");
		expect(source).not.toContain("waitForWorkerGpuReady(gpuReady, 500)");
	});

	test("the stitch hands the output file over instead of reading it back", () => {
		expect(source).toContain(
			"streamed: { byteLength, fileName: tempOutput.name }",
		);
		expect(source).not.toContain("arrayBuffer()");
	});
});
