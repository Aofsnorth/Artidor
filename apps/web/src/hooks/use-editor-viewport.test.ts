/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
	EDITOR_VIEWPORT_COMPACT_PX,
	EDITOR_VIEWPORT_MEDIUM_PX,
	resolveEditorViewport,
	sidePanelConstraints,
} from "./use-editor-viewport";

describe("resolveEditorViewport", () => {
	test("classifies widths below the compact threshold as compact", () => {
		expect(resolveEditorViewport(0)).toBe("compact");
		expect(resolveEditorViewport(500)).toBe("compact");
		expect(resolveEditorViewport(EDITOR_VIEWPORT_COMPACT_PX - 1)).toBe(
			"compact",
		);
	});

	test("classifies compact..medium widths as medium", () => {
		expect(resolveEditorViewport(EDITOR_VIEWPORT_COMPACT_PX)).toBe("medium");
		expect(resolveEditorViewport(1366)).toBe("medium");
		expect(resolveEditorViewport(EDITOR_VIEWPORT_MEDIUM_PX - 1)).toBe("medium");
	});

	test("classifies widths from the medium threshold up as wide", () => {
		expect(resolveEditorViewport(EDITOR_VIEWPORT_MEDIUM_PX)).toBe("wide");
		expect(resolveEditorViewport(1920)).toBe("wide");
		expect(resolveEditorViewport(2560)).toBe("wide");
	});
});

describe("sidePanelConstraints", () => {
	test("wide keeps the historical percentage bounds", () => {
		for (const panel of ["tools", "properties"] as const) {
			expect(sidePanelConstraints("wide", panel)).toEqual({
				minSize: "15%",
				maxSize: "40%",
			});
		}
	});

	test("medium floors both side panels in pixels", () => {
		const tools = sidePanelConstraints("medium", "tools");
		const properties = sidePanelConstraints("medium", "properties");
		expect(tools.minSize).toBe("220px");
		expect(properties.minSize).toBe("200px");
		// The ceiling must stay above the floor at the medium threshold:
		// 220px of a 1024px-wide editor group is ~23%.
		expect(tools.maxSize).toBe("45%");
		expect(properties.maxSize).toBe("45%");
	});

	test("compact floors are lower and the ceiling relaxes further", () => {
		const tools = sidePanelConstraints("compact", "tools");
		const properties = sidePanelConstraints("compact", "properties");
		expect(tools.minSize).toBe("176px");
		expect(properties.minSize).toBe("160px");
		expect(tools.maxSize).toBe("60%");
		expect(properties.maxSize).toBe("60%");
	});

	test("the pixel floor always fits inside the max size at the breakpoint's narrowest group", () => {
		// Narrowest editor group per breakpoint: window width minus the
		// fixed tab rail (~72px) and outer padding. The floor percentage
		// of that group must not exceed maxSize, otherwise react-
		// resizable-panels receives contradictory constraints.
		const narrowest: Record<string, number> = {
			medium: 1024 - 72 - 12,
			compact: 700 - 72 - 12,
		};
		for (const viewport of ["medium", "compact"] as const) {
			for (const panel of ["tools", "properties"] as const) {
				const { minSize, maxSize } = sidePanelConstraints(viewport, panel);
				const floorPx = Number.parseFloat(minSize);
				const floorPct = (floorPx / narrowest[viewport]) * 100;
				const ceilingPct = Number.parseFloat(maxSize);
				expect(
					floorPct,
					`${viewport}/${panel}: floor ${minSize} = ${floorPct.toFixed(1)}% of ${narrowest[viewport]}px group must be ≤ ${maxSize}`,
				).toBeLessThanOrEqual(ceilingPct);
			}
		}
	});
});
