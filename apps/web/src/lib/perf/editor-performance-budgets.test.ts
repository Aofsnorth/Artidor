import { expect, test } from "bun:test";
import {
	EDITOR_PERFORMANCE_BUDGETS,
	assertWithinBudget,
} from "./editor-performance-budgets";

test("editor performance budgets stay explicit", () => {
	expect(EDITOR_PERFORMANCE_BUDGETS.timelineCommitMsP95).toBeLessThanOrEqual(8);
	expect(EDITOR_PERFORMANCE_BUDGETS.dragFrameMsP95).toBeLessThanOrEqual(16.7);
	expect(EDITOR_PERFORMANCE_BUDGETS.mainThreadSliceMs).toBeLessThanOrEqual(8);
	expect(EDITOR_PERFORMANCE_BUDGETS.exportInitialBytes).toBe(0);
});

test("assertWithinBudget rejects over-budget values", () => {
	expect(() =>
		assertWithinBudget({ metric: "mainThreadSliceMs", value: 9 }),
	).toThrow("mainThreadSliceMs over budget");
});
