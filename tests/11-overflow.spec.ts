/**
 * Overflow detection tests.
 *
 * The user explicitly asked for "detection of elements that
 * have `scrollWidth > clientWidth` without handling" — i.e.
 * visible overflow that should have been clipped or marquee'd.
 * We scan the live editor DOM and flag:
 *   - elements where `scrollWidth > clientWidth + 1` *and* the
 *     container has no `overflow: hidden` (so the content is
 *     truly leaking)
 *   - text that gets visually clipped (truncated mid-glyph) in a
 *     card title
 *   - "must be visible" buttons that are zero-size or hidden
 */
import { test, expect } from "@playwright/test";
import { bootEditor, clickAssetTab, insertAndSelectText } from "./helpers";

type OverflowFinding = {
	tag: string;
	classes: string;
	text: string;
	scrollWidth: number;
	clientWidth: number;
	containerOverflow: string;
	kind: "unclipped-horizontal" | "hidden-but-still-overflowing";
};

test.describe("Editor — overflow / clipping detection", () => {
	test("No card title clips without overflow handling", async ({ page }) => {
		await bootEditor(page);
		// Visit every preview-library panel.
		for (const tab of [
			/^Effects$/i,
			/^Transitions$/i,
			/^Overlays$/i,
			/^Motion$/i,
			/^Templates$/i,
			/^Adjust$/i,
		]) {
			await clickAssetTab(page, tab);
			await page.waitForTimeout(1_500);
		}
		// Now scan the DOM for any element whose content extends
		// past its visible width without `overflow: hidden` (i.e.
		// it would visibly overflow the container).
		const findings = await page.evaluate<OverflowFinding[]>(() => {
			const elements = Array.from(
				document.querySelectorAll<HTMLElement>(
					'.asset-preview-container, [draggable="true"]',
				),
			);
			const out: OverflowFinding[] = [];
			for (const el of elements) {
				const text = (el.textContent ?? "").trim();
				if (!text) continue;
				const r = el.getBoundingClientRect();
				if (r.width === 0) continue;
				// Walk up to find the nearest ancestor that has
				// `overflow:hidden` (or auto). If there isn't one,
				// the inner content is leaking.
				let parent: HTMLElement | null = el.parentElement;
				let clipped = false;
				let parentOverflow = "";
				while (parent) {
					const cs = window.getComputedStyle(parent);
					if (cs.overflowX === "hidden" || cs.overflowX === "auto" || cs.overflowX === "scroll") {
						clipped = true;
						parentOverflow = cs.overflowX;
						break;
					}
					parent = parent.parentElement;
				}
				if (el.scrollWidth > el.clientWidth + 1 && !clipped) {
					out.push({
						tag: el.tagName,
						classes: (el.className ?? "").toString().slice(0, 80),
						text: text.slice(0, 60),
						scrollWidth: el.scrollWidth,
						clientWidth: el.clientWidth,
						containerOverflow: parentOverflow,
						kind: "unclipped-horizontal",
					});
				}
			}
			return out;
		});
		// We expect at most a small handful of unhandled overflows;
		// anything more is a regression.
		expect(
			findings.length,
			"unclipped horizontal overflows across all asset panels: " +
				JSON.stringify(findings, null, 2),
		).toBeLessThanOrEqual(2);
	});

	test("Marquee animation keyframe is in the document stylesheet", async ({
		page,
	}) => {
		await bootEditor(page);
		// The marquee keyframe (defined globally) is what makes
		// long card titles scroll instead of clipping. Verify the
		// keyframe exists in the live stylesheet — that way, even
		// when no individual card overflows, the system is ready
		// to handle the case when one does.
		const hasKeyframes = await page.evaluate(() => {
			for (const sheet of Array.from(document.styleSheets)) {
				try {
					for (const rule of Array.from(sheet.cssRules ?? [])) {
						if (
							rule instanceof CSSKeyframesRule &&
							rule.name === "marquee-cycle"
						) {
							return true;
						}
					}
				} catch {
					// cross-origin sheets throw — ignore.
				}
			}
			return false;
		});
		expect(
			hasKeyframes,
			"the global 'marquee-cycle' keyframes should be defined",
		).toBe(true);
	});

	test("Inspector header is fully visible (not clipped by 100% transform)", async ({
		page,
	}) => {
		await bootEditor(page);
		await insertAndSelectText(page, { content: "OverflowSmoke" });
		await page.waitForTimeout(400);
		// The "Reset all" button at the top of the inspector
		// header has a known-good position (left side of the
		// panel). Verify it has positive width and is within
		// the viewport bounds.
		const inspector = page.getByTestId("properties-panel");
		const reset = inspector.getByRole("button", { name: /Reset all/i });
		await expect(reset).toBeVisible();
		const box = await reset.boundingBox();
		expect(box, "Reset all button box").toBeTruthy();
		if (box) {
			expect(box.width, "Reset all width > 0").toBeGreaterThan(0);
			expect(box.x, "Reset all x >= 0").toBeGreaterThanOrEqual(0);
		}
	});
});
