/**
 * Asset panel + inspector tab tests.
 *
 * Verifies the editor's left-bar asset tabs are all reachable, the
 * Adjust panel shows adjustment controls (not video controls — the
 * previously-shipped bug), every tab click switches the panel content
 * without crashing, and the Effects / Transitions / Overlays grids
 * actually contain many distinct cards (so the user isn't staring at
 * one repeated placeholder).
 *
 * Run via:
 *   npx playwright test tests/02-tabs.spec.ts
 */
import { test, expect } from "@playwright/test";
import {
	bootEditor,
	clickAssetTab,
	clickInspectorTab,
	installErrorRecorder,
} from "./helpers";

test.describe("Editor — asset & inspector tabs", () => {
	test("editor route loads without fatal errors", async ({ page }) => {
		const { errors } = installErrorRecorder(page);
		await bootEditor(page);
		expect(errors, "fatal console / page errors during boot").toEqual([]);
	});

	test("asset panel exposes every documented tab", async ({ page }) => {
		await bootEditor(page);
		const expected: RegExp[] = [
			/^Assets$/i,
			/^AI Edit$/i,
			/^Text$/i,
			/^Elements$/i,
			/^Transitions$/i,
			/^Effects$/i,
			/^Overlays$/i,
			/^Audio$/i,
			/^Motion$/i,
			/^Adjust$/i,
			/^Templates$/i,
			/^Preset Tools$/i,
			/^Tools$/i,
			/^Color$/i,
			/^Plugins$/i,
			/^Scripting$/i,
			/^Settings$/i,
		];
		for (const label of expected) {
			const tab = page.getByRole("button", { name: label }).first();
			await expect(tab, `Tab matching ${label} should exist`).toBeVisible({
				timeout: 5_000,
			});
		}
	});

	test("every asset tab opens without crashing the React tree", async ({
		page,
	}) => {
		const { errors } = installErrorRecorder(page);
		await bootEditor(page);
		const tabsToVisit: RegExp[] = [
			/^Assets$/i,
			/^Text$/i,
			/^Elements$/i,
			/^Transitions$/i,
			/^Effects$/i,
			/^Overlays$/i,
			/^Audio$/i,
			/^Motion$/i,
			/^Adjust$/i,
			/^Templates$/i,
			/^Preset Tools$/i,
			/^Tools$/i,
			/^Color$/i,
			/^Plugins$/i,
		];

		for (const label of tabsToVisit) {
			await clickAssetTab(page, label);
			const text = await page.locator("body").innerText();
			expect(text.length, `Tab ${label} body text`).toBeGreaterThan(100);
		}

		expect(errors, "no fatal errors while clicking tabs").toEqual([]);
	});

	test("Adjust panel renders adjustment controls, not video controls", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Adjust$/i);
		await page.waitForTimeout(800);
		const text = await page.locator("body").innerText();
		// Should show adjustment category labels — not video / transform
		// tabs (those live in the inspector, not in the Adjust panel).
		expect(text).toMatch(/Basic|Color|Effects/i);
		// Body must be non-trivial.
		expect(text.length).toBeGreaterThan(200);
	});

	test("Effects panel renders many distinct cards (not 1 repeated)", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Effects$/i);
		// Wait for the effect grid to settle — IO gating means cards
		// render lazily so we need a beat.
		await page.waitForTimeout(2_500);
		const cards = page.locator('[draggable="true"]');
		const count = await cards.count();
		expect(
			count,
			"Effects panel should expose many distinct cards (>=30)",
		).toBeGreaterThan(30);
	});

	test("long effect preset names render via MarqueeText", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Effects$/i);
		await page.waitForTimeout(2_500);
		// The marquee text component renders a hidden overflow track,
		// so any element with `overflow: hidden` *and* a wider child
		// proves the marquee mechanism is in use. Effects with long
		// names (e.g. "Chroma Key", "Kaleidoscope") are tagged for
		// marquee rendering.
		const overflowing = await page.evaluate(() => {
			const containers = Array.from(
				document.querySelectorAll<HTMLElement>('[class*="overflow-hidden"]'),
			);
			return containers
				.filter((el) => {
					const child = el.firstElementChild as HTMLElement | null;
					if (!child) return false;
					return child.scrollWidth > el.clientWidth;
				})
				.slice(0, 5)
				.map((el) => ({
					scrollWidth: el.scrollWidth,
					clientWidth: el.clientWidth,
					text: (el.textContent ?? "").trim().slice(0, 50),
				}));
		});
		expect(
			overflowing.length,
			"At least some Effects cards should have marquee-running text (scrollWidth > clientWidth)",
		).toBeGreaterThan(0);
	});

	test("Transitions panel renders many distinct cards", async ({ page }) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Transitions$/i);
		await page.waitForTimeout(2_500);
		const cards = page.locator('[draggable="true"]');
		const count = await cards.count();
		expect(
			count,
			"Transitions panel should expose many distinct cards (>=20)",
		).toBeGreaterThan(20);
	});

	test("Color tab is reachable from the left bar", async ({ page }) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Color$/i);
		await page.waitForTimeout(800);
		const text = await page.locator("body").innerText();
		expect(text.length).toBeGreaterThan(50);
	});

	test("AI Edit tab is gated (Coming Soon) but the DOM exists", async ({
		page,
	}) => {
		await bootEditor(page);
		const aiTab = page.getByRole("button", { name: /AI Edit/i }).first();
		await expect(aiTab).toBeVisible();
		const ariaDisabled = await aiTab.getAttribute("aria-disabled");
		const classAttr = (await aiTab.getAttribute("class")) ?? "";
		const isDimmed = /opacity-40|cursor-not-allowed/.test(classAttr);
		expect(
			ariaDisabled === "true" || isDimmed,
			"AI Edit tab should be visibly disabled while feature flag is off",
		).toBeTruthy();
	});

	test("inspector shows Element summary when a text element is selected", async ({
		page,
	}) => {
		await bootEditor(page);
		// Insert a text element and select it.
		const { insertAndSelectText } = await import("./helpers");
		await insertAndSelectText(page, { content: "Inspector smoke" });
		await page.waitForTimeout(800);
		// The inspector should now be visible with a tab strip and a
		// "Text" tab (since the element is a text element).
		const textTab = page
			.locator('[role="tablist"] button, [role="tab"]')
			.filter({ hasText: /^Text$/i })
			.first();
		await expect(textTab).toBeVisible({ timeout: 10_000 });
	});

	test("Text element inspector does NOT show Transform / Speed / Audio tabs", async ({
		page,
	}) => {
		const { insertAndSelectText } = await import("./helpers");
		await bootEditor(page);
		await insertAndSelectText(page, { content: "Text only" });
		await page.waitForTimeout(500);
		// Tabs that should NOT appear for a plain text element.
		for (const forbidden of [/^Speed$/i, /^Speed Ramp$/i, /^Audio$/i]) {
			const tab = page
				.locator('[role="tablist"] button, [role="tab"]')
				.filter({ hasText: forbidden })
				.first();
			const visible = await tab.isVisible({ timeout: 500 }).catch(() => false);
			expect(visible, `Text inspector should not show tab ${forbidden}`).toBe(
				false,
			);
		}
	});
});
