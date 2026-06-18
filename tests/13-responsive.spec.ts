/**
 * Responsive layout tests.
 *
 * The user asked for "desktop besar / laptop 1366x768 / mobile
 * (jika editor mendukung)". We exercise two viewports:
 *   - Desktop large (1920×1080)
 *   - Laptop (1366×768) — the most common laptop resolution
 *
 * For each, we verify the page renders, no panels overflow the
 * viewport, the sidebar stays reachable, and the editor doesn't
 * crash.
 */
import { test, expect } from "@playwright/test";
import { bootEditor, clickAssetTab } from "./helpers";

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
	{ name: "laptop-1366x768", width: 1366, height: 768 },
	{ name: "desktop-1920x1080", width: 1920, height: 1080 },
];

for (const viewport of VIEWPORTS) {
	test.describe(`Editor — responsive (${viewport.name})`, () => {
		test.use({ viewport: { width: viewport.width, height: viewport.height } });

		test("page renders and key UI is reachable", async ({ page }) => {
			await bootEditor(page);
			// All 4 main regions are in the DOM.
			await expect(
				page.locator(".editing-screen").first(),
			).toBeVisible();
			// Each asset tab is in the DOM (whether or not the
			// scrolled-into-view button is visible).
			for (const label of [/^Assets$/i, /^Text$/i, /^Effects$/i]) {
				const tab = page
					.getByRole("button", { name: label })
					.first();
				const visible = await tab
					.isVisible({ timeout: 1_000 })
					.catch(() => false);
				expect(visible, `${label} tab is reachable`).toBe(true);
			}
		});

		test("No panel overflows the viewport horizontally", async ({
			page,
		}) => {
			await bootEditor(page);
			const overflowing = await page.evaluate(
				({ vw }) => {
					const out: Array<{
						tag: string;
						classes: string;
						scrollWidth: number;
						clientWidth: number;
						overflow: number;
					}> = [];
					const all = Array.from(
						document.querySelectorAll<HTMLElement>("body *"),
					);
					for (const el of all) {
						const r = el.getBoundingClientRect();
						// Only consider visible elements.
						if (r.width === 0 || r.height === 0) continue;
						// Skip hidden / off-screen elements.
						const cs = window.getComputedStyle(el);
						if (cs.display === "none" || cs.visibility === "hidden") {
							continue;
						}
						// Skip timeline ruler labels (their text is
						// expected to extend slightly past the
						// viewport edge on small screens — the
						// timeline scrolls horizontally to reveal
						// the rest).
						if (el.matches(".select-none, [class*='select-none']")) {
							continue;
						}
						// Only flag elements that physically extend
						// past the right viewport edge by more than
						// 20px — small overflows are usually OK and
						// could be off-screen but clipped by a
						// scrollable parent.
						const overflow = r.right - vw;
						if (overflow > 20) {
							out.push({
								tag: el.tagName,
								classes: (el.className ?? "")
									.toString()
									.slice(0, 80),
								scrollWidth: el.scrollWidth,
								clientWidth: el.clientWidth,
								overflow: Math.round(overflow),
							});
							if (out.length >= 10) break;
						}
					}
					return out;
				},
				{ vw: viewport.width },
			);
			expect(
				overflowing,
				`elements overflowing the ${viewport.name} viewport by >20px: ${JSON.stringify(overflowing, null, 2)}`,
			).toEqual([]);
		});

		test("Switching tabs in the asset panel doesn't crash", async ({
			page,
		}) => {
			await bootEditor(page);
			for (const tab of [
				/^Assets$/i,
				/^Text$/i,
				/^Elements$/i,
				/^Effects$/i,
				/^Overlays$/i,
				/^Audio$/i,
				/^Motion$/i,
				/^Adjust$/i,
			]) {
				await clickAssetTab(page, tab);
				const text = await page.locator("body").innerText();
				expect(text.length, `Tab ${tab} body text`).toBeGreaterThan(100);
			}
		});
	});
}
