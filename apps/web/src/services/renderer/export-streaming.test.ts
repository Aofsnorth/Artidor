/**
 * Streaming export — Part 1 (worker + output only).
 *
 * Covers the new OPFS streaming helpers without a browser: the fake OPFS
 * writable captures positioned writes, so we can assert the exact parity
 * property the worker relies on — bytes written through
 * `createRandomAccessWritableStream` land at the same offsets as a
 * reference in-memory model fed the same packet sequence.
 *
 * NOTE: a real mediabunny `BufferTarget` is intentionally NOT used as the
 * reference — constructing one shares a 64 KiB backing store and its first
 * `_write` can stall for seconds under bun (pre-existing mediabunny/bun
 * behavior, unrelated to this change). The sparse-Map model below captures
 * the same write-position semantics deterministically and fast.
 */

import { describe, expect, test } from "bun:test";
import {
	createExportTempFile,
	createRandomAccessWritableStream,
	discardExportTempFile,
	exportTempExtensionForFormat,
	tryCreateExportTempFile,
} from "./export-output";

type Packet = { position: number; data: number[] };

/** Same packet sequence fed to both targets (out-of-order + overwrite). */
const PACKETS: Packet[] = [
	{ position: 8, data: [9, 10, 11, 12] },
	{ position: 0, data: [1, 2, 3, 4, 5, 6, 7, 8] },
	{ position: 12, data: [13, 14] },
	{ position: 4, data: [99] },
];

async function feedReferenceModel(
	packets: Packet[],
): Promise<Map<number, number>> {
	const bytes = new Map<number, number>();
	for (const packet of packets) {
		for (let i = 0; i < packet.data.length; i++) {
			bytes.set(packet.position + i, packet.data[i] as number);
		}
	}
	return bytes;
}

async function feedStreamTarget(
	packets: Packet[],
	file: { data: Map<number, number>; closed: boolean },
): Promise<void> {
	const stream = createRandomAccessWritableStream({
		seek: async (position: number) => {
			file.closed = false;
			(file as { pos?: number }).pos = position;
		},
		write: async (data: Uint8Array) => {
			const pos = (file as { pos?: number }).pos ?? 0;
			for (let i = 0; i < data.length; i++) {
				file.data.set(pos + i, data[i] as number);
			}
		},
		close: async () => {
			file.closed = true;
		},
	});
	const writer = stream.getWriter();
	for (const packet of packets) {
		await writer.write({
			type: "write",
			position: packet.position,
			data: new Uint8Array(packet.data),
		});
	}
	await writer.close();
}

describe("streaming export part 1 — byte parity", () => {
	test("streamed bytes equal reference-model bytes for the same packet sequence", async () => {
		const file = { data: new Map<number, number>(), closed: false };
		await feedStreamTarget(PACKETS, file);
		expect(file.closed).toBe(true);

		const expected = await feedReferenceModel(PACKETS);
		const maxPos = Math.max(...PACKETS.map((p) => p.position + p.data.length));
		for (let i = 0; i < maxPos; i++) {
			expect(file.data.get(i) ?? 0).toBe(expected.get(i) ?? 0);
		}
	});
});

describe("streaming export part 1 — temp file naming", () => {
	test("extension follows the container (webm stays webm, mp4-family stays mp4)", () => {
		expect(exportTempExtensionForFormat("webm")).toBe("webm");
		expect(exportTempExtensionForFormat("mp4")).toBe("mp4");
		expect(exportTempExtensionForFormat("hevc")).toBe("mp4");
		expect(exportTempExtensionForFormat("av1")).toBe("mp4");
	});

	test("createExportTempFile uses the requested extension", async () => {
		const removed: string[] = [];
		const writable = {
			seek: async () => {},
			write: async () => {},
			close: async () => {},
		};
		const handles = new Map<string, unknown>();
		const directory = {
			getFileHandle: async (name: string) => {
				handles.set(name, {});
				return { createWritable: async () => writable };
			},
			removeEntry: async (name: string) => {
				removed.push(name);
			},
		};
		const root = {
			getDirectoryHandle: async () => directory,
		};
		const originalNavigator = (globalThis as Record<string, unknown>).navigator;
		const originalCrypto = (globalThis as Record<string, unknown>).crypto;
		(globalThis as Record<string, unknown>).navigator = {
			storage: { getDirectory: async () => root },
		};
		(globalThis as Record<string, unknown>).crypto = {
			randomUUID: () => "test-uuid",
		};
		try {
			const temp = await createExportTempFile("webm");
			expect(temp.name).toBe("export-test-uuid.webm");
			await temp.remove();
			expect(removed).toEqual(["export-test-uuid.webm"]);
		} finally {
			if (originalNavigator === undefined) {
				delete (globalThis as Record<string, unknown>).navigator;
			} else {
				(globalThis as Record<string, unknown>).navigator = originalNavigator;
			}
			(globalThis as Record<string, unknown>).crypto = originalCrypto;
		}
	});

	test("tryCreate falls back to null when getDirectory throws (Firefox/Safari workers)", async () => {
		const originalNavigator = (globalThis as Record<string, unknown>).navigator;
		(globalThis as Record<string, unknown>).navigator = {
			storage: {
				getDirectory: async () => {
					throw new Error("OPFS unavailable in worker");
				},
			},
		};
		try {
			await expect(tryCreateExportTempFile("mp4")).resolves.toBeNull();
		} finally {
			if (originalNavigator === undefined) {
				delete (globalThis as Record<string, unknown>).navigator;
			} else {
				(globalThis as Record<string, unknown>).navigator = originalNavigator;
			}
		}
	});
});

describe("streaming export part 1 — temp cleanup", () => {
	test("discard removes the temp file (cancel path)", async () => {
		const removed: string[] = [];
		await discardExportTempFile({
			handle: {} as FileSystemFileHandle,
			stream: new WritableStream(),
			name: "export-x.mp4",
			remove: async () => {
				removed.push("export-x.mp4");
			},
		});
		expect(removed).toEqual(["export-x.mp4"]);
	});

	test("discard removes the temp file (error path) and never throws", async () => {
		const removed: string[] = [];
		await discardExportTempFile({
			handle: {} as FileSystemFileHandle,
			stream: new WritableStream(),
			name: "export-y.webm",
			remove: async () => {
				removed.push("export-y.webm");
				throw new Error("already gone");
			},
		});
		expect(removed).toEqual(["export-y.webm"]);
		await expect(discardExportTempFile(null)).resolves.toBeUndefined();
		await expect(discardExportTempFile(undefined)).resolves.toBeUndefined();
	});
});

describe("streaming export part 1 — worker contract", () => {
	test("init accepts streamToDisk and worker emits complete-streamed", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(`${import.meta.dir}/export-worker.ts`, "utf8");
		// Init flag.
		expect(source).toContain("streamToDisk?: boolean");
		// OPFS file created after negotiation, before Output creation.
		const handlerAt = source.indexOf("async function handleExport");
		const negotiateAt = source.indexOf("await negotiateVideoCodec", handlerAt);
		const tryCreateAt = source.indexOf("tryCreateExportTempFile", handlerAt);
		const outputAt = source.indexOf("new Output({", handlerAt);
		expect(negotiateAt).toBeGreaterThan(-1);
		expect(tryCreateAt).toBeGreaterThan(negotiateAt);
		expect(outputAt).toBeGreaterThan(tryCreateAt);
		// Chunked StreamTarget + new message shape.
		expect(source).toContain(
			"new StreamTarget(streamTempFile.stream, { chunked: true })",
		);
		expect(source).toContain('"complete-streamed"');
		expect(source).toContain("byteLength");
		expect(source).toContain("fileName");
		// Temp deleted on cancel + error paths (no orphans).
		expect(source).toContain("discardActiveStreamTempFile");
		expect(source).toContain("discardExportTempFile(streamTempFile)");
	});

	test("bridge switch ignores unknown message types (safe for part 2)", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			`${import.meta.dir}/export-worker-bridge.ts`,
			"utf8",
		);
		// The handler is a switch over data.type with no default branch, so an
		// unknown type (e.g. future "complete-streamed" before part 2 wires it)
		// falls through silently — no throw, no resolve.
		expect(source).toContain("switch (data.type)");
		expect(source.includes("default:")).toBe(false);
	});
});
