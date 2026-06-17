import type { InstalledPlugin } from "./types";

const DB_NAME = "artidor-plugins";
const DB_VERSION = 1;
const STORE_NAME = "installed";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = () => resolve(request.result);
	});
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
	return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function getAllPlugins(): Promise<InstalledPlugin[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = tx(db, "readonly").getAll();
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result ?? []);
	});
}

export async function getPlugin(
	id: string,
): Promise<InstalledPlugin | undefined> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = tx(db, "readonly").get(id);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result ?? undefined);
	});
}

export async function savePlugin(plugin: InstalledPlugin): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = tx(db, "readwrite").put(plugin);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function deletePlugin(id: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const request = tx(db, "readwrite").delete(id);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function updatePluginState(
	id: string,
	state: Record<string, unknown>,
): Promise<void> {
	const existing = await getPlugin(id);
	if (!existing) return;
	await savePlugin({ ...existing, state });
}
