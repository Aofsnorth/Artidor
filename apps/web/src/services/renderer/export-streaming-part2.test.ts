/**
 * Streaming export — Part 2 (bridge / manager / UI / lifecycle).
 *
 * No browser here: OPFS is faked at the `navigator.storage` boundary and the
 * worker/bridge handshake is asserted as a source contract (a live `Worker`
 * needs a real browser). Pure helpers (`lib/export`) are tested directly.
 * Honest marker: `static-only` where no runtime behavior is exercised.
 */

import { describe, expect, test } from "bun:test";
import {
	exportResultByteLength,
	filenameForExportResult,
	hasExportContent,
	streamedExportFileExtension,
} from "@/lib/export";
import {
	deleteExportTempFileByName,
	openStreamedExportFile,
	sweepStaleExportTempFiles,
} from "./export-output";

/* ---- Fake OPFS boundary ---- */

type FakeFile = {
	bytes: Uint8Array;
	lastModified: number;
	failGetFile?: boolean;
};

function installFakeOpfs({
	files = new Map<string, FakeFile>(),
	removed = [] as string[],
	missingDir = false,
} = {}): { files: Map<string, FakeFile>; removed: string[] } {
	const directory = {
		getFileHandle: async (name: string) => {
			const file = files.get(name);
			if (!file) throw new Error(`not found: ${name}`);
			return {
				getFile: async () => {
					if (file.failGetFile) throw new Error("unreadable");
					return {
						size: file.bytes.length,
						lastModified: file.lastModified,
						type: "",
						arrayBuffer: async () => file.bytes.slice().buffer as ArrayBuffer,
					};
				},
			};
		},
		removeEntry: async (name: string) => {
			removed.push(name);
			files.delete(name);
		},
		values: async function* () {
			for (const name of files.keys()) yield { name, kind: "file" };
		},
	};
	const originalNavigator = (globalThis as Record<string, unknown>).navigator;
	(globalThis as Record<string, unknown>).navigator = {
		storage: {
			getDirectory: async () => {
				if (missingDir) throw new Error("no OPFS");
				return {
					getDirectoryHandle: async () => directory,
				};
			},
		},
	};
	// Restore helper for callers (bun --isolate still shares globals per file).
	(globalThis as Record<string, unknown>).__restoreNavigator = () => {
		if (originalNavigator === undefined) {
			delete (globalThis as Record<string, unknown>).navigator;
		} else {
			(globalThis as Record<string, unknown>).navigator = originalNavigator;
		}
	};
	return { files, removed };
}

function restoreNavigator(): void {
	(
		globalThis as Record<string, { __restoreNavigator?: () => void }>
	).__restoreNavigator?.();
}

describe("streaming export part 2 — result variant helpers", () => {
	test("hasExportContent accepts buffer and streamed, rejects empty/error", () => {
		expect(
			hasExportContent({
				result: { success: true, buffer: new ArrayBuffer(4) },
			}),
		).toBe(true);
		expect(
			hasExportContent({
				result: {
					success: true,
					streamed: { byteLength: 4, fileName: "export-x.mp4" },
				},
			}),
		).toBe(true);
		expect(hasExportContent({ result: { success: true } })).toBe(false);
		expect(
			hasExportContent({ result: { success: false, error: "boom" } }),
		).toBe(false);
	});

	test("exportResultByteLength reads buffer or streamed byteLength", () => {
		expect(
			exportResultByteLength({
				result: { success: true, buffer: new ArrayBuffer(7) },
			}),
		).toBe(7);
		expect(
			exportResultByteLength({
				result: {
					success: true,
					streamed: { byteLength: 123, fileName: "export-x.mp4" },
				},
			}),
		).toBe(123);
		expect(exportResultByteLength({ result: { success: true } })).toBe(0);
	});

	test("streamed extension allow-list: webm stays webm, anything else is mp4", () => {
		expect(streamedExportFileExtension({ fileName: "export-a.webm" })).toBe(
			".webm",
		);
		expect(streamedExportFileExtension({ fileName: "export-a.mp4" })).toBe(
			".mp4",
		);
		// A corrupt/hand-edited name can never smuggle an exotic suffix through.
		expect(streamedExportFileExtension({ fileName: "export-a.exe" })).toBe(
			".mp4",
		);
		expect(streamedExportFileExtension({ fileName: "export-a.WEBM" })).toBe(
			".webm",
		);
	});

	test("filenameForExportResult takes the extension from the streamed file", () => {
		expect(
			filenameForExportResult({
				filename: "MyProject.mp4",
				result: {
					success: true,
					streamed: { byteLength: 1, fileName: "export-x.webm" },
				},
			}),
		).toBe("MyProject.webm");
		// Buffer results keep the caller filename untouched (legacy behavior).
		expect(
			filenameForExportResult({
				filename: "MyProject.mp4",
				result: { success: true, buffer: new ArrayBuffer(1) },
			}),
		).toBe("MyProject.mp4");
	});
});

describe("streaming export part 2 — handed-over file lifecycle (fake OPFS)", () => {
	test("openStreamedExportFile opens without copying to ArrayBuffer", async () => {
		const { files } = installFakeOpfs();
		try {
			files.set("export-ok.mp4", {
				bytes: new Uint8Array([1, 2, 3]),
				lastModified: Date.now(),
			});
			const file = await openStreamedExportFile("export-ok.mp4");
			// The bridge resolves metadata from size — the file stays on disk.
			expect(file.size).toBe(3);
		} finally {
			restoreNavigator();
		}
	});

	test("openStreamedExportFile rejects path traversal without touching OPFS", async () => {
		const { removed } = installFakeOpfs();
		try {
			await expect(openStreamedExportFile("../evil.mp4")).rejects.toThrow(
				/unsafe/,
			);
			await expect(openStreamedExportFile("other.txt")).rejects.toThrow(
				/unsafe/,
			);
			expect(removed).toEqual([]);
		} finally {
			restoreNavigator();
		}
	});

	test("deleteExportTempFileByName removes the handover (dialog close / new export / cancel)", async () => {
		const { files, removed } = installFakeOpfs();
		try {
			files.set("export-old.mp4", {
				bytes: new Uint8Array([9]),
				lastModified: Date.now(),
			});
			await deleteExportTempFileByName("export-old.mp4");
			expect(removed).toEqual(["export-old.mp4"]);
			expect(files.has("export-old.mp4")).toBe(false);
		} finally {
			restoreNavigator();
		}
	});

	test("deleteExportTempFileByName never throws (bridge error/timeout path)", async () => {
		installFakeOpfs({ missingDir: true });
		try {
			// OPFS entirely unavailable (Firefox/Safari): resolves silently.
			await expect(
				deleteExportTempFileByName("export-gone.mp4"),
			).resolves.toBeUndefined();
			// Unsafe names resolve silently without touching storage.
			await expect(
				deleteExportTempFileByName("../../etc/passwd"),
			).resolves.toBeUndefined();
		} finally {
			restoreNavigator();
		}
	});

	test("boot sweep removes only export-* files older than 24h", async () => {
		const now = Date.now();
		const hour = 60 * 60 * 1000;
		const { files } = installFakeOpfs();
		try {
			files.set("export-stale.mp4", {
				bytes: new Uint8Array([1]),
				lastModified: now - 25 * hour,
			});
			files.set("export-fresh.mp4", {
				bytes: new Uint8Array([2]),
				// May belong to another live tab still previewing — must survive.
				lastModified: now - 1 * hour,
			});
			const { removed, kept } = await sweepStaleExportTempFiles({ now });
			expect(removed).toBe(1);
			expect(kept).toBe(1);
			expect(files.has("export-stale.mp4")).toBe(false);
			expect(files.has("export-fresh.mp4")).toBe(true);
		} finally {
			restoreNavigator();
		}
	});

	test("boot sweep is bounded and never throws without OPFS", async () => {
		installFakeOpfs({ missingDir: true });
		try {
			await expect(sweepStaleExportTempFiles()).resolves.toEqual({
				removed: 0,
				kept: 0,
			});
		} finally {
			restoreNavigator();
		}
	});
});

describe("streaming export part 2 — bridge/manager contract (static-only)", () => {
	test("bridge handles complete-streamed and forwards streamToDisk in init", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/export-worker-bridge.ts`,
			"utf8",
		);
		// New message type is handled (no longer falls through silently).
		expect(source).toContain('"complete-streamed"');
		expect(source).toContain("openStreamedExportFile");
		// Handover resolves metadata only — never buffers the file.
		expect(source).toContain("streamed: { byteLength, fileName }");
		expect(source).not.toContain("arrayBuffer()");
		// streamToDisk opt-in param, default false = legacy behavior.
		expect(source).toContain("streamToDisk = false");
		expect(source).toContain("streamToDisk,");
		// Main-thread cleanup on error/cancel/timeout (worker is terminated then).
		expect(source).toContain("deleteExportTempFileByName");
		expect(source).toContain("discardPendingStreamedFile");
	});

	test("manager opts in via isDiskBackedExportSupported and threads streamed results", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/../../core/managers/renderer-manager.ts`,
			"utf8",
		);
		// Auto opt-in with BufferTarget fallback (worker falls back on OPFS fail).
		expect(source).toContain("isDiskBackedExportSupported()");
		expect(source).toContain("streamToDisk,");
		// Streamed handovers map to ExportResult.streamed, not buffer.
		expect(source).toContain("toExportResult(");
		expect(source).toContain("streamed: {");
	});

	test("project-manager lifecycle deletes streamed files (new export / dismiss / no cache)", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/../../core/managers/project-manager.ts`,
			"utf8",
		);
		// (b) new export discards the previous handover; (a) dismiss does too.
		expect(
			source.match(/discardStreamedExportFile/g)?.length ?? 0,
		).toBeGreaterThanOrEqual(3);
		// Streamed results are never cached (file would dangle after delete).
		expect(source).toContain("if (result.buffer)");
		// Cache hits still replay either backing.
		expect(source).toContain("hasExportContent");
	});

	test("UI supports streamed preview/download without buffer copies", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/../../components/editor/export-button.tsx`,
			"utf8",
		);
		// Preview opens the OPFS File once; object URL streams from disk.
		expect(source).toContain("createExportPreviewUrl");
		expect(source).toContain("openStreamedExportFile");
		// Download reuses the preview URL when present (no second Blob).
		expect(source).toContain("downloadExportResult");
		// Playable gates accept either backing; revoke-on-unmount preserved.
		expect(source).toContain("isPlayableExportResult");
		expect(source).toContain("URL.revokeObjectURL");
		// Download filename follows the negotiated container extension.
		expect(source).toContain("filenameForExportResult");
	});

	test("concat still streams to OPFS when supported (no regression)", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/parallel-export.ts`,
			"utf8",
		);
		expect(source).toContain("new StreamTarget(tempOutput.stream");
		expect(source).toContain("reuseWorker: false");
		// The stitched result is handed over as a file, never read back into an
		// ArrayBuffer — reading it would re-inflate peak RAM to the file size.
		expect(source).toContain("streamed: { byteLength, fileName: tempOutput.name }");
		expect(source).not.toContain("arrayBuffer()");
	});

	test("segments stream to OPFS too, and the stitch reads their file handles", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/parallel-export.ts`,
			"utf8",
		);
		// Segments used to be buffer-backed, which meant every segment's
		// ArrayBuffer was held at once (~2x the output size in RAM).
		expect(source).toContain("streamToDisk: diskBacked");
		// The concatenator opens the OPFS file (a Blob) so mediabunny reads it
		// lazily through a bounded cache instead of materialising it.
		expect(source).toContain("openStreamedExportFile(segment.fileName)");
		// The buffer path survives for browsers without OPFS.
		expect(source).toContain("new Blob([segment.buffer as ArrayBuffer])");
		// Segment temp files are owned by the parallel exporter and deleted.
		expect(source).toContain("discardOwnedFiles");
		expect(source).toContain("deleteExportTempFileByName");
	});
});
