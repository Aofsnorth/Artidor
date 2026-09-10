import type { PersistStorage } from "zustand/middleware";

/**
 * Throttled `PersistStorage` wrapper for zustand `persist`.
 *
 * Problem: `persist` writes to storage on EVERY `set` — including
 * high-frequency transient updates (drag positions, connection-status
 * flips, slider moves) that share a store with persisted fields. Each
 * write is a synchronous `JSON.stringify` + `localStorage.setItem` on the
 * main thread, so a drag that fires 60 `set`s/sec produces 60 serializes
 * and 60 storage writes/sec for state the user never needs mid-gesture.
 *
 * Fix: coalesce bursts with trailing-edge throttling. The FIRST write in a
 * burst goes through immediately (so a single discrete edit — the common
 * case — persists with zero added latency), subsequent writes within
 * `waitMs` are coalesced and only the LATEST value is flushed when the
 * window elapses. `getItem`/`removeItem` always pass through unwrapped so
 * rehydrate and logout-clear semantics are unchanged.
 *
 * Durability tradeoff: a tab closed mid-burst (within `waitMs` of the last
 * `set`) can lose the trailing writes. Accepted for UI-preference stores
 * (panel layout, floating positions, connection snapshots); NOT for
 * document/model data, which must use unthrottled storage.
 *
 * No new dependencies — plain `setTimeout`, works in browsers and tests.
 *
 * Generic over the store's persisted state so `persist`'s `storage` option
 * typechecks without casts at each call site.
 */
export function createThrottledStorage<S>({
	storage,
	waitMs,
}: {
	/** Underlying persist storage (usually `browserStorage`). */
	storage: PersistStorage<S> | undefined;
	/** Coalescing window in ms. 250–500 suits drag/slider bursts. */
	waitMs: number;
}): PersistStorage<S> | undefined {
	if (!storage) return undefined;
	// `browserStorage` is a lazy `createJSONStorage(() => localStorage)` that
	// resolves to `undefined` under SSR — propagate that so the store keeps
	// its existing server behavior. The throttle state below only exists in
	// the browser where `storage` is defined.
	const inner: PersistStorage<S> = storage;
	let timer: ReturnType<typeof setTimeout> | null = null;
	type PersistValue = Parameters<PersistStorage<S>["setItem"]>[1];
	let pending: { name: string; value: PersistValue } | null = null;
	let lastWriteAt = 0;

	const flush = () => {
		timer = null;
		if (!pending) return;
		const { name, value } = pending;
		pending = null;
		lastWriteAt = Date.now();
		inner.setItem(name, value);
	};

	return {
		getItem: (name) => inner.getItem(name),
		setItem: (name, value) => {
			const now = Date.now();
			// First write after an idle window goes through immediately so a
			// single discrete edit persists with zero added latency.
			if (timer === null && now - lastWriteAt >= waitMs) {
				lastWriteAt = now;
				inner.setItem(name, value);
				return;
			}
			// Inside a burst: keep only the latest value, flush on trailing edge.
			pending = { name, value };
			if (timer === null) {
				timer = setTimeout(flush, waitMs);
			}
		},
		removeItem: (name) => {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			pending = null;
			return inner.removeItem(name);
		},
	};
}
