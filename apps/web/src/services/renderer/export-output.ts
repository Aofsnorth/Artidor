import type { StreamTargetChunk } from "mediabunny";

interface RandomAccessWritable {
	seek(position: number): Promise<void>;
	write(data: Uint8Array<ArrayBuffer>): Promise<void>;
	close(): Promise<void>;
}

/** Adapts File System Access writes to mediabunny's positioned chunks. */
export function createRandomAccessWritableStream(
	file: RandomAccessWritable,
): WritableStream<StreamTargetChunk> {
	return new WritableStream({
		async write(chunk) {
			await file.seek(chunk.position);
			await file.write(chunk.data);
		},
		close: () => file.close(),
	});
}

/** Creates a temporary OPFS file for disk-backed long-export muxing. */
export async function createExportTempFile(): Promise<{
	handle: FileSystemFileHandle;
	stream: WritableStream<StreamTargetChunk>;
	remove: () => Promise<void>;
}> {
	const root = await navigator.storage.getDirectory();
	const directory = await root.getDirectoryHandle("exports", { create: true });
	const name = `export-${crypto.randomUUID()}.tmp`;
	const handle = await directory.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	return {
		handle,
		stream: createRandomAccessWritableStream(writable),
		remove: () => directory.removeEntry(name),
	};
}

export function isDiskBackedExportSupported(): boolean {
	return typeof navigator !== "undefined" && "getDirectory" in navigator.storage;
}
