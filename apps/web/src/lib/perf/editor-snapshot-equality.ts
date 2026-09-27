/**
 * Snapshot equality used by `useEditor` to decide whether a re-notified
 * subsystem actually changed the value a selector returned.
 *
 * `useEditor` re-runs the selector for every subscribed subsystem notify and
 * only skips the re-render when the freshly computed snapshot compares equal
 * to the cached one. The comparison therefore runs on the hot path of every
 * `useEditor(selector)` call site, which is why it lives in its own
 * dependency-free module: it must stay unit-testable without pulling React or
 * `artidor-wasm` into the test process.
 *
 * Semantics are deliberately shallow and unchanged from the previous inline
 * implementation:
 * - `Object.is` wins first (primitives, identical references, `NaN`).
 * - `null`/`undefined` never compare equal to a non-nullish value.
 * - Arrays compare by length + per-index `Object.is`.
 * - Plain objects compare by own-enumerable key count + per-key `Object.is`.
 * - Anything else (functions, primitives of differing value, …) is unequal.
 *
 * The object path avoids `Object.keys` on either side — that allocated two
 * key arrays per call, twice per notify, on the hottest comparison in the
 * editor. `for…in` + `Object.hasOwn` enumerates exactly the own enumerable
 * string keys `Object.keys` would have returned, without materialising them.
 */

/**
 * Counts own enumerable string keys without allocating a key array.
 * `for…in` also visits inherited enumerable properties, so inherited keys
 * are filtered out with an own-property check — matching `Object.keys`.
 */
function countOwnEnumerableKeys(value: object): number {
	let count = 0;
	for (const key in value) {
		if (Object.hasOwn(value, key)) {
			count++;
		}
	}
	return count;
}

/**
 * Non-allocating shallow comparison of the two objects' own enumerable keys.
 * Key counts are compared first (cheap, no property lookups) so the common
 * "different shape" case exits before any per-key work.
 */
function shallowEqualObjects(a: object, b: object): boolean {
	if (countOwnEnumerableKeys(a) !== countOwnEnumerableKeys(b)) {
		return false;
	}
	for (const key in a) {
		if (!Object.hasOwn(a, key)) continue;
		const left = (a as Record<string, unknown>)[key];
		const right = (b as Record<string, unknown>)[key];
		if (!Object.is(left, right)) return false;
	}
	return true;
}

export function isShallowEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	// Empty/null short-circuit — both empty `null`/`undefined`
	// compare as equal regardless of path below.
	if (a == null || b == null) return false;
	// Array fast-path: identical lengths + per-index `Object.is`
	// is the common case for selectors that return `getAssets()`
	// or `bookmarks` arrays. Kept on `every` so sparse arrays keep
	// skipping holes, exactly as before.
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => Object.is(item, b[i]));
	}
	// Object path: catches the most common case of
	// `editor.scenes.getActiveSceneOrNull()` returning a fresh `Scene`
	// object reference every call but with the same primitive fields.
	if (typeof a === "object" && typeof b === "object") {
		return shallowEqualObjects(a, b);
	}
	return false;
}
