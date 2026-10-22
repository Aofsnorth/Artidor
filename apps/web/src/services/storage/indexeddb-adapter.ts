import type { StorageAdapter } from "./types";

/** Highest code point a string key can sort on — the prefix range upper bound. */
const MAX_CODE_POINT = String.fromCharCode(0xffff);

/**
 * How long `deleteDatabase` waits after `onblocked` before rejecting. Another
 * tab may hold the database open and close it shortly after; blocking forever
 * would hang every caller (including the migration runner).
 */
const DELETE_DATABASE_BLOCKED_TIMEOUT_MS = 5_000;

function getPrefixRange(prefix: string): IDBKeyRange {
	return IDBKeyRange.bound(prefix, prefix + MAX_CODE_POINT);
}

export class IndexedDBAdapter<T> implements StorageAdapter<T> {
	private dbName: string;
	private storeName: string;
	private version: number;
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(dbName: string, storeName: string, version = 1) {
		this.dbName = dbName;
		this.storeName = storeName;
		this.version = version;
	}

	private getDB(): Promise<IDBDatabase> {
		if (this.dbPromise) return this.dbPromise;

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => {
				this.dbPromise = null;
				reject(request.error);
			};
			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					this.dbPromise = null;
				};
				resolve(db);
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName, { keyPath: "id" });
				}
			};
		});

		return this.dbPromise;
	}

	async get(key: string): Promise<T | null> {
		const db = await this.getDB();
		const transaction = db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);

		return new Promise((resolve, reject) => {
			const request = store.get(key);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	/**
	 * Runs one read/write request and settles only when the transaction
	 * commits. `request.onsuccess` fires before the transaction is durable: a
	 * quota failure or an abort afterwards would otherwise leave the caller
	 * believing the write landed. Request errors still reject immediately; the
	 * abort that usually follows is ignored by the settled guard.
	 */
	private runWrite(
		db: IDBDatabase,
		operation: (store: IDBObjectStore) => IDBRequest,
	): Promise<void> {
		const transaction = db.transaction([this.storeName], "readwrite");
		const store = transaction.objectStore(this.storeName);

		return new Promise((resolve, reject) => {
			let settled = false;
			const settle = (callback: () => void) => {
				if (settled) return;
				settled = true;
				callback();
			};

			const request = operation(store);
			request.onerror = () =>
				settle(() =>
					reject(request.error ?? new Error("IndexedDB write request failed")),
				);
			transaction.oncomplete = () => settle(resolve);
			transaction.onerror = () =>
				settle(() =>
					reject(
						transaction.error ?? new Error("IndexedDB transaction failed"),
					),
				);
			transaction.onabort = () =>
				settle(() =>
					reject(
						transaction.error ?? new Error("IndexedDB transaction aborted"),
					),
				);
		});
	}

	async set(key: string, value: T): Promise<void> {
		const db = await this.getDB();
		await this.runWrite(db, (store) => store.put({ id: key, ...value }));
	}

	async remove(key: string): Promise<void> {
		const db = await this.getDB();
		await this.runWrite(db, (store) => store.delete(key));
	}

	async list(): Promise<string[]> {
		const db = await this.getDB();
		const transaction = db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);

		return new Promise((resolve, reject) => {
			const request = store.getAllKeys();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result as string[]);
		});
	}

	async getAll(): Promise<T[]> {
		const db = await this.getDB();
		const transaction = db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);

		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	async clear(): Promise<void> {
		const db = await this.getDB();
		await this.runWrite(db, (store) => store.clear());
	}

	/**
	 * Every record whose key starts with `prefix`, in key order.
	 *
	 * Used by the split project layout, where one store holds per-scene records
	 * for every project under a `${projectId}::` key prefix. The upper bound
	 * appends U+FFFF, the highest code point a key can sort on, so the range
	 * covers exactly the prefixed keys. (A key that itself contained U+FFFF
	 * would sort past the bound; scene ids are uuids, so that cannot happen.)
	 */
	async getAllByPrefix(prefix: string): Promise<T[]> {
		const db = await this.getDB();
		const transaction = db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);
		const range = getPrefixRange(prefix);

		return new Promise((resolve, reject) => {
			const request = store.getAll(range);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	/** Deletes every record whose key starts with `prefix`, in one transaction. */
	async removeByPrefix(prefix: string): Promise<void> {
		const db = await this.getDB();
		const range = getPrefixRange(prefix);
		await this.runWrite(db, (store) => store.delete(range));
	}

	/**
	 * Releases the open connection. Callers that mint adapters per key
	 * (see the media adapters in the storage service) use this to avoid leaking
	 * one connection per project for the lifetime of the tab.
	 */
	close(): void {
		if (!this.dbPromise) return;
		const pending = this.dbPromise;
		this.dbPromise = null;
		void pending.then(
			(db) => db.close(),
			() => undefined,
		);
	}
}

export async function deleteDatabase({
	dbName,
	blockedTimeoutMs = DELETE_DATABASE_BLOCKED_TIMEOUT_MS,
}: {
	dbName: string;
	/** Test/override hook; production callers use the default. */
	blockedTimeoutMs?: number;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(dbName);
		let settled = false;
		let blockedTimer: ReturnType<typeof setTimeout> | null = null;

		const settle = (callback: () => void) => {
			if (settled) return;
			settled = true;
			if (blockedTimer !== null) {
				clearTimeout(blockedTimer);
				blockedTimer = null;
			}
			callback();
		};

		request.onsuccess = () => settle(resolve);
		request.onerror = () =>
			settle(() =>
				reject(
					request.error ?? new Error(`Failed to delete database "${dbName}"`),
				),
			);
		// `onblocked` means another connection keeps the database open. Give it
		// a bounded window to close rather than hanging the caller forever.
		request.onblocked = () => {
			if (blockedTimer !== null || settled) return;
			blockedTimer = setTimeout(() => {
				blockedTimer = null;
				settle(() =>
					reject(
						new Error(
							`Deleting database "${dbName}" is blocked by another open connection.`,
						),
					),
				);
			}, blockedTimeoutMs);
		};
	});
}
