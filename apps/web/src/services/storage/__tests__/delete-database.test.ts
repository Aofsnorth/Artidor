/**
 * `deleteDatabase` must not hang forever when another connection keeps the
 * database open (`onblocked`). Bun has no IndexedDB, so this file installs the
 * smallest possible delete-request shim and drives the callbacks by hand.
 */
import { afterAll, expect, test } from "bun:test";

const originalIndexedDB = Object.getOwnPropertyDescriptor(
	globalThis,
	"indexedDB",
);

interface FakeDeleteRequest {
	error: Error | null;
	onsuccess: (() => void) | null;
	onerror: (() => void) | null;
	onblocked: (() => void) | null;
}

let lastRequest: FakeDeleteRequest | null = null;

Object.assign(globalThis, {
	indexedDB: {
		deleteDatabase: () => {
			const request: FakeDeleteRequest = {
				error: null,
				onsuccess: null,
				onerror: null,
				onblocked: null,
			};
			lastRequest = request;
			return request;
		},
	},
});

const { deleteDatabase } = await import("@/services/storage/indexeddb-adapter");

afterAll(() => {
	if (originalIndexedDB) {
		Object.defineProperty(globalThis, "indexedDB", originalIndexedDB);
	} else {
		Reflect.deleteProperty(globalThis, "indexedDB");
	}
});

test("deleteDatabase rejects with a clear error when blocked past the timeout", async () => {
	const pending = deleteDatabase({
		dbName: "blocked-db",
		blockedTimeoutMs: 5,
	});

	lastRequest?.onblocked?.();

	await expect(pending).rejects.toThrow(
		'Deleting database "blocked-db" is blocked by another open connection.',
	);
});

test("deleteDatabase resolves when the blocking connection closes in time", async () => {
	const pending = deleteDatabase({
		dbName: "released-db",
		blockedTimeoutMs: 100,
	});

	lastRequest?.onblocked?.();
	lastRequest?.onsuccess?.();

	await expect(pending).resolves.toBeUndefined();
});
