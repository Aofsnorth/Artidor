/**
 * `useEditor` re-runs the selector on every subscribed subsystem notify and
 * only skips the re-render when the fresh snapshot compares equal to the
 * cached one. `isShallowEqual` is that gate, so its semantics are load-bearing
 * for every `useEditor(selector)` call site: a false "equal" pins a stale
 * value in the UI, a false "different" costs a re-render.
 *
 * These cases pin the documented contract (primitives/identical references
 * short-circuit, nullish never matches non-nullish, arrays compare per index,
 * objects compare by own-enumerable key count + per-key `Object.is`) and the
 * non-allocating object path (no `Object.keys` on either side).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { isShallowEqual } from "./editor-snapshot-equality";

const MODULE_SOURCE = readFileSync(
	`${import.meta.dir}/editor-snapshot-equality.ts`,
	"utf8",
);

describe("editor snapshot equality", () => {
	test("identical references and primitives short-circuit", () => {
		const object = { id: "a" };
		expect(isShallowEqual(object, object)).toBe(true);
		expect(isShallowEqual(1, 1)).toBe(true);
		expect(isShallowEqual("x", "x")).toBe(true);
		expect(isShallowEqual(true, true)).toBe(true);
		// NaN is equal to itself (Object.is), unlike `===`.
		expect(isShallowEqual(Number.NaN, Number.NaN)).toBe(true);
		// +0 and -0 differ under Object.is.
		expect(isShallowEqual(0, -0)).toBe(false);
		expect(isShallowEqual(1, 2)).toBe(false);
		expect(isShallowEqual("a", "b")).toBe(false);
	});

	test("nullish never matches a non-nullish value", () => {
		expect(isShallowEqual(null, null)).toBe(true);
		expect(isShallowEqual(undefined, undefined)).toBe(true);
		expect(isShallowEqual(null, undefined)).toBe(false);
		expect(isShallowEqual(null, {})).toBe(false);
		expect(isShallowEqual(undefined, { a: 1 })).toBe(false);
		expect(isShallowEqual({}, null)).toBe(false);
		expect(isShallowEqual(0, null)).toBe(false);
		expect(isShallowEqual(false, undefined)).toBe(false);
	});

	test("arrays compare by length then per index", () => {
		const nested = { id: "n" };
		expect(isShallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(isShallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
		expect(isShallowEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(isShallowEqual([nested], [nested])).toBe(true);
		// Array members compare by reference, not recursively.
		expect(isShallowEqual([{ id: "a" }], [{ id: "a" }])).toBe(false);
		expect(isShallowEqual([{ id: "a" }], [{ id: "b" }])).toBe(false);
		expect(isShallowEqual([], [])).toBe(true);
	});

	test("object path: fresh objects with equal fields compare equal", () => {
		// The motivating case: `editor.scenes.getActiveSceneOrNull()` hands
		// back a fresh `Scene` reference on every call.
		expect(
			isShallowEqual({ id: "s", name: "Scene" }, { id: "s", name: "Scene" }),
		).toBe(true);
		expect(
			isShallowEqual({ id: "s", name: "Scene" }, { id: "s", name: "Other" }),
		).toBe(false);
		expect(isShallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(isShallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
		expect(isShallowEqual({}, {})).toBe(true);
		// Differently-keyed objects with the same undefined-valued value are
		// treated as equal — matches the historical `Object.keys` behaviour.
		expect(isShallowEqual({ x: undefined }, { y: undefined })).toBe(true);
	});

	test("object path ignores inherited enumerable keys", () => {
		const inherited = { a: 1 };
		const withProto = Object.create(inherited) as { b: number };
		withProto.b = 2;
		const plain = { b: 2 };
		// `for…in` visits inherited keys; the own-property check must not
		// count them, otherwise this would compare as unequal.
		expect(isShallowEqual(withProto, plain)).toBe(true);
	});

	test("object path keeps key order and non-enumerable props out", () => {
		expect(isShallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);

		const hidden = { a: 1 };
		Object.defineProperty(hidden, "secret", {
			value: 9,
			enumerable: false,
		});
		// `Object.keys` (and the replacement) ignore non-enumerable props.
		expect(isShallowEqual({ a: 1 }, hidden)).toBe(true);
	});

	test("mismatched kinds are unequal", () => {
		expect(isShallowEqual({ 0: "a" }, ["a"])).toBe(true); // historical: both key sets are ["0"]
		expect(
			isShallowEqual(
				() => 1,
				() => 1,
			),
		).toBe(false);
		expect(isShallowEqual("a", { 0: "a" })).toBe(false);
	});

	test("object path does not materialise key arrays", () => {
		// Structural guard: the previous implementation called `Object.keys`
		// on BOTH sides, allocating two arrays on every comparison — the
		// hottest allocation in the editor's re-render path.
		expect(MODULE_SOURCE.includes("Object.keys(")).toBe(false);
	});
});
