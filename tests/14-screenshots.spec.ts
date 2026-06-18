/**
 * Screenshot tests — visual regression baseline.
 *
 * Captures the editor at the moments the user explicitly
 * listed as "important areas" in the request. These PNGs are
 * stored under `test-results/screenshots/` so they can be
 * diffed against a future baseline.
 *
 * The tests are intentionally lightweight: they only
 * navigate + screenshot, no assertions on pixel data.
 */
import { test, expect } from "@playwright/test";
import {
	bootEditor,
	clickAssetTab,
	insertAndSelectText,
	insertMockVideo,
	runCommand,
} from "./helpers";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const SHOTS_DIR = "test-results/screenshots";

test.beforeAll(async () => {
	await mkdir(SHOTS_DIR, { recursive: true });
});

test("Editor main screen", async ({ page }) => {
	await bootEditor(page);
	await expect(page.locator(".editing-screen").first()).toBeVisible();
	await page.screenshot({
		path: join(SHOTS_DIR, "01-editor-main.png"),
		fullPage: false,
	});
});

test("Inspector with a text element selected", async ({ page }) => {
	await bootEditor(page);
	await insertAndSelectText(page, { content: "Screenshot Text" });
	await page.waitForTimeout(500);
	const inspector = page.getByTestId("properties-panel");
	await expect(inspector).toBeVisible();
	await inspector.screenshot({
		path: join(SHOTS_DIR, "02-inspector-text.png"),
	});
});

test("Text tab content", async ({ page }) => {
	await bootEditor(page);
	await insertAndSelectText(page, { content: "TextTabDemo" });
	await page.waitForTimeout(500);
	const textTab = page
		.getByTestId("properties-panel")
		.locator('button[aria-label="Text"]')
		.first();
	await textTab.click({ force: true });
	await page.waitForTimeout(300);
	await page.screenshot({
		path: join(SHOTS_DIR, "03-text-tab.png"),
		fullPage: false,
	});
});

test("Adjust tab content", async ({ page }) => {
	await bootEditor(page);
	await clickAssetTab(page, /^Adjust$/i);
	await page.waitForTimeout(500);
	await page.screenshot({
		path: join(SHOTS_DIR, "04-adjust-tab.png"),
		fullPage: false,
	});
});

test("Audio tab content", async ({ page }) => {
	await bootEditor(page);
	await clickAssetTab(page, /^Audio$/i);
	await page.waitForTimeout(500);
	await page.screenshot({
		path: join(SHOTS_DIR, "05-audio-tab.png"),
		fullPage: false,
	});
});

test("Effects grid", async ({ page }) => {
	await bootEditor(page);
	await clickAssetTab(page, /^Effects$/i);
	await page.waitForTimeout(2_000);
	await page.screenshot({
		path: join(SHOTS_DIR, "06-effects-grid.png"),
		fullPage: false,
	});
});

test("Plugin panel", async ({ page }) => {
	await bootEditor(page);
	await clickAssetTab(page, /^Plugins$/i);
	await page.waitForTimeout(500);
	await page.screenshot({
		path: join(SHOTS_DIR, "07-plugins.png"),
		fullPage: false,
	});
});

test("Preset panel", async ({ page }) => {
	await bootEditor(page);
	await clickAssetTab(page, /^Preset$/i);
	await page.waitForTimeout(500);
	await page.screenshot({
		path: join(SHOTS_DIR, "08-presets.png"),
		fullPage: false,
	});
});

test("Speed curve panel", async ({ page }) => {
	await bootEditor(page);
	const id = await insertMockVideo(page, { durationSeconds: 5 });
	const state = await page.evaluate(() => window.__ARTIDOR_DEBUG__?.getState());
	const el = (state as { elements: { id: string; trackId: string }[] })
		.elements.find((e) => e.id === id);
	await runCommand(page, "select_elements", {
		elements: [{ trackId: el!.trackId, elementId: id }],
	});
	await page.waitForTimeout(500);
	const speedTab = page
		.getByTestId("properties-panel")
		.locator('button[aria-label="Speed"]')
		.first();
	await speedTab.click({ force: true });
	await page.waitForTimeout(500);
	// Expand any collapsed sections.
	const expandBtns = page
		.getByTestId("properties-panel")
		.getByRole("button", { name: /Expand section/i });
	const count = await expandBtns.count();
	for (let i = 0; i < count; i++) {
		await expandBtns.nth(i).click({ force: true });
		await page.waitForTimeout(80);
	}
	await page.waitForTimeout(300);
	await page.screenshot({
		path: join(SHOTS_DIR, "09-speed-curve.png"),
		fullPage: false,
	});
});

test("Frame interpolation panel", async ({ page }) => {
	await bootEditor(page);
	const id = await insertMockVideo(page, { durationSeconds: 5 });
	const state = await page.evaluate(() => window.__ARTIDOR_DEBUG__?.getState());
	const el = (state as { elements: { id: string; trackId: string }[] })
		.elements.find((e) => e.id === id);
	await runCommand(page, "select_elements", {
		elements: [{ trackId: el!.trackId, elementId: id }],
	});
	await page.waitForTimeout(500);
	const speedTab = page
		.getByTestId("properties-panel")
		.locator('button[aria-label="Speed"]')
		.first();
	await speedTab.click({ force: true });
	await page.waitForTimeout(500);
	// Expand the Speed section + the Advanced details so the
	// Frame Interpolation chips are visible.
	const expandBtns = page
		.getByTestId("properties-panel")
		.getByRole("button", { name: /Expand section/i });
	const count = await expandBtns.count();
	for (let i = 0; i < count; i++) {
		await expandBtns.nth(i).click({ force: true });
		await page.waitForTimeout(80);
	}
	const advanced = page
		.getByTestId("properties-panel")
		.getByText(/Advanced — pick a specific method/i)
		.first();
	if (await advanced.isVisible({ timeout: 500 }).catch(() => false)) {
		await advanced.click({ force: true });
		await page.waitForTimeout(200);
	}
	await page.screenshot({
		path: join(SHOTS_DIR, "10-frame-interp.png"),
		fullPage: false,
	});
});
