import type { StorageAdapter } from "./types";

export class OPFSAdapter implements StorageAdapter<File> {
	private directoryName: string;
	private directoryPromise: Promise<FileSystemDirectoryHandle> | null = null;

	constructor(directoryName = "media") {
		this.directoryName = directoryName;
	}

	private getDirectory(): Promise<FileSystemDirectoryHandle> {
		if (!this.directoryPromise) {
			this.directoryPromise = (async () => {
				const opfsRoot = await navigator.storage.getDirectory();
				return await opfsRoot.getDirectoryHandle(this.directoryName, {
					create: true,
				});
			})();
		}
		return this.directoryPromise;
	}

	async get(key: string): Promise<File | null> {
		try {
			const directory = await this.getDirectory();
			const fileHandle = await directory.getFileHandle(key);
			return await fileHandle.getFile();
		} catch (error) {
			if ((error as Error).name === "NotFoundError") {
				return null;
			}
			throw error;
		}
	}

	async set(key: string, file: File): Promise<void> {
		const directory = await this.getDirectory();
		const fileHandle = await directory.getFileHandle(key, { create: true });
		const writable = await fileHandle.createWritable();

		await writable.write(file);
		await writable.close();
	}

	async setBatch(
		entries: Array<{ key: string; file: File }>,
		{ concurrency = 4 }: { concurrency?: number } = {},
	): Promise<void> {
		const directory = await this.getDirectory();
		let index = 0;
		const worker = async () => {
			while (index < entries.length) {
				const { key, file } = entries[index++];
				const fileHandle = await directory.getFileHandle(key, {
					create: true,
				});
				const writable = await fileHandle.createWritable();
				await writable.write(file);
				await writable.close();
			}
		};
		const workers = Array.from(
			{ length: Math.min(concurrency, entries.length) },
			() => worker(),
		);
		await Promise.all(workers);
	}

	async remove(key: string): Promise<void> {
		try {
			const directory = await this.getDirectory();
			await directory.removeEntry(key);
		} catch (error) {
			if ((error as Error).name !== "NotFoundError") {
				throw error;
			}
		}
	}

	async list(): Promise<string[]> {
		const directory = await this.getDirectory();
		const keys: string[] = [];

		for await (const name of directory.keys()) {
			keys.push(name);
		}

		return keys;
	}

	async clear(): Promise<void> {
		const directory = await this.getDirectory();

		for await (const name of directory.keys()) {
			await directory.removeEntry(name);
		}
	}

	static isSupported(): boolean {
		return "storage" in navigator && "getDirectory" in navigator.storage;
	}
}
