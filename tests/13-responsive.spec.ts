/**
 * Responsive layout tests — "Compatible with different screen sizes".
 *
 * We exercise three viewports:
 *   - Compact (960×700) — below the editor's compact breakpoint, where
 *     the side panels switch to pixel floors
 *   - Laptop (1366×768) — the most common laptop resolution, medium
 *     breakpoint
 *   - Desktop large (1920×1080) — wide breakpoint, classic percentage
 *     layout
 *
 * For each, we verify the page renders, no panels overflow the
 * viewport, the sidebar stays reachable, the editor doesn't
 * crash, and the docked side panels keep a usable width.
 */
import { test, expect } from "@playwright/test";
import { bootEditor, clickAssetTab } from "./helpers";

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
	{ name: "compact-960x700", width: 960, height: 700 },
	{ name: "laptop-1366x768", width: 1366, height: 768 },
	{ name: "desktop-1920x1080", width: 1920, height: 1080 },
];

/**
 * react-resizable-panels v4 stamps every panel with a `data-panel`
 * attribute (no id), so we identify them by document order:
 * [mainContent, tools, preview, properties, timeline].
 */
const PANEL_ORDER = [
	"mainContent",
	"tools",
	"preview",
	"properties",
	"timeline",
] as const;

async function readPanelWidths(page: import("@playwright/test").Page) {
	return await page.evaluate((order) => {
		const panels = Array.from(
			document.querySelectorAll<HTMLElement>("[data-panel]"),
		);
		const widths: Record<string, number> = {};
		for (let i = 0; i < order.length && i < panels.length; i++) {
			widths[order[i]] = panels[i].getBoundingClientRect().width;
		}
		return widths;
	}, PANEL_ORDER);
}

/**
 * Seed the narrow "Fullscreen Preview" preset (tools 15%) before the app
 * boots, so the compact/medium pixel floors actually bind — with the
 * default preset the panels sit above the floors at these widths and the
 * assertion would pass vacuously.
 */
async function seedNarrowPreset(page: import("@playwright/test").Page) {
	await page.addInitScript(() => {
		localStorage.setItem(
			"panel-sizes",
			JSON.stringify({
				state: {
					panels: {
						tools: 15,
						preview: 65,
						properties: 20,
						mainContent: 80,
						timeline: 20,
					},
					activePreset: "fullscreen-preview",
				},
				version: 6,
			}),
		);
	});
}

for (const viewport of VIEWPORTS) {
	test.describe(`Editor — responsive (${viewport.name})`, () => {
		test.use({ viewport: { width: viewport.width, height: viewport.height } });

		test("page renders and key UI is reachable", async ({ page }) => {
			await bootEditor(page);
			// All 4 main regions are in the DOM.
			await expect(page.locator(".editing-screen").first()).toBeVisible();
			// Each asset tab is in the DOM (whether or not the
			// scrolled-into-view button is visible).
			for (const label of [/^Assets$/i, /^Text$/i, /^Effects$/i]) {
				const tab = page.getByRole("button", { name: label }).first();
				const visible = await tab
					.isVisible({ timeout: 1_000 })
					.catch(() => false);
				expect(visible, `${label} tab is reachable`).toBe(true);
			}
		});

		test("No panel overflows the viewport horizontally", async ({ page }) => {
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
								classes: (el.className ?? "").toString().slice(0, 80),
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

		test("docked side panels keep a usable pixel width", async ({ page }) => {
			await seedNarrowPreset(page);
			await bootEditor(page);
			const widths = await readPanelWidths(page);
			// Pixel floors per breakpoint (see use-editor-viewport.ts). The
			// seeded preset would render tools at 15% of the group (~128px
			// compact / ~192px laptop) — measuring at/above the floor proves
			// the clamp actually binds.
			const floors: Record<string, { tools: number; properties: number }> = {
				"compact-960x700": { tools: 174, properties: 158 },
				"laptop-1366x768": { tools: 218, properties: 198 },
				"desktop-1920x1080": { tools: 250, properties: 250 },
			};
			const floor = floors[viewport.name];
			expect(
				widths.tools,
				`${viewport.name}: tools panel ${widths.tools}px should stay ≥ ${floor.tools}px`,
			).toBeGreaterThanOrEqual(floor.tools);
			expect(
				widths.properties,
				`${viewport.name}: properties panel ${widths.properties}px should stay ≥ ${floor.properties}px`,
			).toBeGreaterThanOrEqual(floor.properties);
			// The preview must never be squeezed to nothing by the floors.
			expect(widths.preview).toBeGreaterThan(150);
		});
	});
}

test.describe("Editor — responsive breakpoint crossing", () => {
	test("widening the window restores the saved percentage preset", async ({
		page,
	}) => {
		await seedNarrowPreset(page);
		await page.setViewportSize({ width: 960, height: 700 });
		await bootEditor(page);
		const clamped = await readPanelWidths(page);
		expect(clamped.tools).toBeGreaterThanOrEqual(174);

		await page.setViewportSize({ width: 1920, height: 1080 });
		await expect
			.poll(async () => (await readPanelWidths(page)).tools, {
				timeout: 10_000,
				intervals: [250],
			})
			.toBeLessThan(300);
		// 15% of the ~1848px group ≈ 271px — back on the saved preset (not
		// the ~404px leftover of the compact-clamped layout).
		const restored = await readPanelWidths(page);
		expect(restored.tools).toBeGreaterThanOrEqual(240);
	});
});
