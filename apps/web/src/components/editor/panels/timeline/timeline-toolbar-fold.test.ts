/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
	TOOLBAR_FOLD_TIER1_PX,
	TOOLBAR_FOLD_TIER2_PX,
	toolbarFoldTier,
} from "./timeline-toolbar-fold";

describe("toolbarFoldTier", () => {
	test("unmeasured and wide toolbars stay unfolded", () => {
		expect(toolbarFoldTier(0)).toBe(0);
		expect(toolbarFoldTier(-1)).toBe(0);
		expect(toolbarFoldTier(TOOLBAR_FOLD_TIER1_PX)).toBe(0);
		expect(toolbarFoldTier(2560)).toBe(0);
	});

	test("medium toolbars fold the secondary right-hand groups", () => {
		expect(toolbarFoldTier(TOOLBAR_FOLD_TIER1_PX - 1)).toBe(1);
		expect(toolbarFoldTier(TOOLBAR_FOLD_TIER2_PX)).toBe(1);
	});

	test("narrow toolbars fold both secondary groups", () => {
		expect(toolbarFoldTier(TOOLBAR_FOLD_TIER2_PX - 1)).toBe(2);
		expect(toolbarFoldTier(600)).toBe(2);
	});
});
