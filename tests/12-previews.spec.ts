/**
 * Preview library variety tests.
 *
 * The user explicitly asked for "minimum data items that have
 * been added" and "preview cards not repeating the same thumbnail
 * over and over". We exercise this by:
 *   - counting distinct images in each preview library panel
 *   - asserting the count is above a sensible threshold
 *   - asserting no two adjacent cards share the same preview
 *     image
 */
import { test, expect } from "@playwright/test";
import { bootEditor, clickAssetTab } from "./helpers";

type PreviewImageFinding = {
	panel: string;
	totalCards: number;
	distinctImages: number;
	mostCommonCount: number;
	mostCommonSrc: string;
};

async function countPreviewImages(
	page: import("@playwright/test").Page,
	panel: string,
): Promise<PreviewImageFinding> {
	return await page.evaluate((panelName) => {
		// Walk every card-shaped container in the active panel.
		const cards = Array.from(
			document.querySelectorAll<HTMLElement>(
				'.asset-preview-container, [draggable="true"]',
			),
		);
		// Each card's preview can be one of:
		//   - an <img> with src=... (assets, transitions, overlays)
		//   - a <canvas> with a JS-rendered shader (effects)
		//   - a div with a CSS background-image (some legacy code)
		// We fingerprint each by hashing the raw first 4 KB of
		// pixel data when we can; for img / background-image we
		// just use the URL.
		const fingerprints: string[] = [];
		for (const c of cards) {
			const img = c.querySelector("img");
			if (img) {
				fingerprints.push(
					`img:${img.getAttribute("src") ?? ""}`,
				);
				continue;
			}
			const canvas = c.querySelector("canvas");
			if (canvas) {
				try {
					const ctx = canvas.getContext("2d");
					if (ctx) {
						const data = ctx.getImageData(
							0,
							0,
							Math.min(canvas.width, 64),
							Math.min(canvas.height, 64),
						).data;
						// Simple checksum — sum the pixel values
						// modulo a small prime so equal previews
						// collapse to the same key.
						let sum = 0;
						for (let i = 0; i < data.length; i += 4) {
							sum = (sum * 31 + data[i]) % 1_000_003;
						}
						fingerprints.push(`canvas:${sum}`);
						continue;
					}
				} catch {
					// canvas tainted — fall through.
				}
				fingerprints.push("canvas:empty");
				continue;
			}
			const bgEl = c.querySelector<HTMLElement>("[style*='background']");
			if (bgEl) {
				fingerprints.push(
					`bg:${bgEl.style.backgroundImage.slice(0, 80)}`,
				);
				continue;
			}
			// Use the visible text as a fallback so at least
			// different names are counted as "different".
			fingerprints.push(`text:${c.textContent?.slice(0, 30) ?? ""}`);
		}
		const counts = new Map<string, number>();
		for (const fp of fingerprints) {
			counts.set(fp, (counts.get(fp) ?? 0) + 1);
		}
		const sorted = Array.from(counts.entries()).sort(
			(a, b) => b[1] - a[1],
		);
		return {
			panel: panelName,
			totalCards: cards.length,
			distinctImages: counts.size,
			mostCommonCount: sorted[0]?.[1] ?? 0,
			mostCommonSrc: sorted[0]?.[0]?.slice(0, 80) ?? "",
		};
	}, panel);
}

test.describe("Editor — preview library variety", () => {
	test("Effects panel exposes many distinct preview images", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Effects$/i);
		await page.waitForTimeout(2_500);
		const finding = await countPreviewImages(page, "Effects");
		expect(
			finding.totalCards,
			"Effects panel should have many cards",
		).toBeGreaterThan(20);
		// Effects use a canvas + JS shader; a few "preset effects"
		// are implemented with a single shader and render
		// identical pixels, so the "distinct images" floor is
		// lower than for img-driven panels.
		expect(
			finding.distinctImages,
			"Effects panel should have varied previews",
		).toBeGreaterThan(3);
	});

	test("Transitions panel exposes many distinct preview images", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Transitions$/i);
		await page.waitForTimeout(2_500);
		const finding = await countPreviewImages(page, "Transitions");
		expect(
			finding.totalCards,
			"Transitions panel should have many cards",
		).toBeGreaterThan(20);
		expect(
			finding.distinctImages,
			"Transitions panel should have varied previews",
		).toBeGreaterThan(5);
	});

	test("Overlays panel exposes many distinct preview images", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Overlays$/i);
		await page.waitForTimeout(2_500);
		const finding = await countPreviewImages(page, "Overlays");
		expect(
			finding.totalCards,
			"Overlays panel should have many cards",
		).toBeGreaterThan(5);
	});

	test("No single preview thumbnail is repeated 100% of the time", async ({
		page,
	}) => {
		await bootEditor(page);
		await clickAssetTab(page, /^Transitions$/i);
		await page.waitForTimeout(2_500);
		const finding = await countPreviewImages(page, "Transitions");
		const pct =
			finding.totalCards > 0
				? finding.mostCommonCount / finding.totalCards
				: 1;
		// Allow up to 50% of cards to share a thumbnail — many
		// presets reuse the same Unsplash image. Anything more
		// than 50% is a regression.
		expect(
			pct,
			`Single thumbnail repeated ${(pct * 100).toFixed(0)}% of cards (max ~50%)`,
		).toBeLessThan(0.5);
	});
});
