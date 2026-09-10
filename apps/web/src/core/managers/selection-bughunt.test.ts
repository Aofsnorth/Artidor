import { describe, expect, test } from "bun:test";
import { SelectionManager } from "@/core/managers/selection-manager";
import type { EditorCore } from "@/core";

/**
 * Panels bughunt regressions: SelectionManager must not alias caller arrays.
 * Before the fix the getter returned the live array and the setter stored the
 * caller's reference — one caller could push/mutate another snapshot without
 * notify(), desyncing inspector + timeline selection UI silently.
 */
describe("selection aliasing guards", () => {
	function manager() {
		return new SelectionManager({} as EditorCore);
	}

	test("getter returns a copy: mutating it does not touch internal state", () => {
		const m = manager();
		m.setSelectedElements({
			elements: [{ trackId: "t", elementId: "e" }],
		});
		const snapshot = m.getSelectedElements();
		snapshot.push({ trackId: "t", elementId: "evil" });
		expect(m.getSelectedElements()).toHaveLength(1);
	});

	test("setter copies the input: later caller mutation is ignored", () => {
		const m = manager();
		const input = [{ trackId: "t", elementId: "e" }];
		m.setSelectedElements({ elements: input });
		input.push({ trackId: "t", elementId: "evil" });
		expect(m.getSelectedElements()).toHaveLength(1);
	});

	test("keyframe setter/getter copy as well", () => {
		const m = manager();
		const kf = [
			{
				trackId: "t",
				elementId: "e",
				propertyPath: "opacity" as never,
				keyframeId: "k",
			},
		];
		m.setSelectedKeyframes({ keyframes: kf });
		kf.push({
			trackId: "t",
			elementId: "e",
			propertyPath: "opacity" as never,
			keyframeId: "evil",
		});
		expect(m.getSelectedKeyframes()).toHaveLength(1);
		m.getSelectedKeyframes().push({
			trackId: "t",
			elementId: "e",
			propertyPath: "opacity" as never,
			keyframeId: "evil2",
		});
		expect(m.getSelectedKeyframes()).toHaveLength(1);
	});
});
