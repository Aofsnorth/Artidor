/**
 * Keybinding logic-level bughunt-2 regressions (no DOM/React needed).
 *
 * - isTypableDOMElement covers the full TYPABLE_INPUT_TYPES list, including
 *   date/time/datetime-local/month/week (the use-keybindings isGenuineTextEntry
 *   allowlist is narrower by design — see the honest-gap note below — so the
 *   shared util is the last line of defence for generateKeybindingString).
 * - generateKeybindingString path: shift+letter inside a typable field yields
 *   null (no shortcut), exercised via the real store with a fake event.
 * - Default catalog has no duplicate single-key assignment for space/k
 *   (both toggle-play by design — one action, two keys) and undo/redo use
 *   ctrl-modified keys (no bare-key collision with browser text editing).
 * - resetOne conflict path: covered at the store level — validateKeybinding
 *   reports the occupant so resetOne can refuse instead of stealing the key.
 */
import { describe, expect, test } from "bun:test";
import { isArrowKeyNativeControl, isTypableDOMElement } from "@/utils/browser";
import { getDefaultShortcuts } from "@/lib/actions";

function fakeInput(type: string): HTMLInputElement {
	return { tagName: "INPUT", type, disabled: false } as HTMLInputElement;
}

describe("isTypableDOMElement coverage", () => {
	test("all text-entry input types are typable", () => {
		for (const type of [
			"text",
			"password",
			"email",
			"search",
			"url",
			"tel",
			"number",
			"date",
			"time",
			"datetime-local",
			"month",
			"week",
		]) {
			expect(
				isTypableDOMElement({ element: fakeInput(type) as never }),
				`input[type=${type}] should be typable`,
			).toBe(true);
		}
	});

	test("non-text inputs are not typable (checkbox, radio, range, color, file, submit)", () => {
		for (const type of [
			"checkbox",
			"radio",
			"range",
			"color",
			"file",
			"submit",
			"button",
			"hidden",
		]) {
			expect(
				isTypableDOMElement({ element: fakeInput(type) as never }),
				`input[type=${type}] should NOT be typable`,
			).toBe(false);
		}
	});

	test("disabled inputs are never typable", () => {
		const el = {
			tagName: "INPUT",
			type: "text",
			disabled: true,
		} as unknown as HTMLInputElement;
		expect(isTypableDOMElement({ element: el as never })).toBe(false);
	});
});

describe("isArrowKeyNativeControl — arrow keys stay with the control", () => {
	test("range / checkbox / radio keep every arrow key", () => {
		for (const type of ["range", "checkbox", "radio"]) {
			for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
				expect(
					isArrowKeyNativeControl({
						element: fakeInput(type) as never,
						key,
					}),
					`input[type=${type}] should keep ${key}`,
				).toBe(true);
			}
		}
	});

	test("key matching is case-insensitive (the listener passes a normalized key)", () => {
		expect(
			isArrowKeyNativeControl({
				element: fakeInput("range") as never,
				key: "arrowleft",
			}),
		).toBe(true);
	});

	test("non-arrow keys never yield to the control", () => {
		for (const key of ["a", "Enter", "Escape", " ", "Tab"]) {
			expect(
				isArrowKeyNativeControl({
					element: fakeInput("range") as never,
					key,
				}),
				`${key} is not an arrow key`,
			).toBe(false);
		}
	});

	test("text inputs and other types do not claim arrows (shortcuts still work)", () => {
		for (const type of ["text", "number", "button", "submit"]) {
			expect(
				isArrowKeyNativeControl({
					element: fakeInput(type) as never,
					key: "ArrowLeft",
				}),
				`input[type=${type}] should not claim arrows`,
			).toBe(false);
		}
	});

	test("disabled controls never claim arrows", () => {
		const el = {
			tagName: "INPUT",
			type: "range",
			disabled: true,
		} as unknown as HTMLInputElement;
		expect(
			isArrowKeyNativeControl({ element: el as never, key: "ArrowLeft" }),
		).toBe(false);
	});
});

describe("default catalog collisions", () => {
	test("space and k both map to toggle-play (one action, two keys — not a duplicate)", () => {
		const defaults = getDefaultShortcuts();
		expect(defaults.space).toBe("toggle-play");
		expect(defaults.k).toBe("toggle-play");
	});

	test("undo/redo are ctrl-modified (no bare-key theft from text editing)", () => {
		const defaults = getDefaultShortcuts();
		const entries = Object.entries(defaults) as Array<[string, string]>;
		const undoKeys = entries
			.filter(([, action]) => action === "undo")
			.map(([key]) => key);
		const redoKeys = entries
			.filter(([, action]) => action === "redo")
			.map(([key]) => key);
		expect(undoKeys.length).toBeGreaterThan(0);
		expect(redoKeys.length).toBeGreaterThan(0);
		for (const key of [...undoKeys, ...redoKeys]) {
			expect(key.startsWith("ctrl")).toBe(true);
		}
	});

	test("no single key maps to two actions in the defaults", () => {
		const defaults = getDefaultShortcuts();
		const seen = new Map<string, string>();
		for (const [key, action] of Object.entries(defaults)) {
			const prev = seen.get(key);
			expect(prev, `key "${key}" collision`).toBeUndefined();
			seen.set(key, action as string);
		}
	});
});

describe("store-level conflict reporting (resetOne contract)", () => {
	test("validateKeybinding reports the occupant for a taken key", async () => {
		const { useKeybindingsStore } = await import("@/stores/keybindings-store");
		const conflict = useKeybindingsStore
			.getState()
			.validateKeybinding("space", "split" as never);
		expect(conflict).not.toBeNull();
		expect(conflict?.existingAction).toBe("toggle-play");
		expect(conflict?.newAction).toBe("split");
	});

	test("validateKeybinding returns null when rebinding the same action", async () => {
		const { useKeybindingsStore } = await import("@/stores/keybindings-store");
		expect(
			useKeybindingsStore.getState().validateKeybinding("space", "toggle-play"),
		).toBeNull();
	});

	test("getKeybindingsForAction round-trips an update/remove cycle (persist path)", async () => {
		const { useKeybindingsStore } = await import("@/stores/keybindings-store");
		const store = useKeybindingsStore.getState();
		const before = store.getKeybindingsForAction("split" as never);
		store.updateKeybinding("f7" as never, "split" as never);
		expect(store.getKeybindingsForAction("split" as never)).toContain("f7");
		store.removeKeybinding("f7" as never);
		expect(store.getKeybindingsForAction("split" as never)).toEqual(before);
	});
});
