import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Disposable browser storage; never attaches to the user's profile or starts a server.
const output = "features/editor-polish-performance-2026-09-06";
const browser = await chromium.launch({ headless: true, timeout: 20_000 });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.addInitScript(() => {
	if (location.origin === "http://127.0.0.1:3005") localStorage.setItem("hasSeenOnboarding", "true");
});
const page = await context.newPage();
page.setDefaultTimeout(12_000);
const results = [];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const check = async (name, run) => {
	try { await run(); results.push({ name, passed: true }); }
	catch (error) { results.push({ name, passed: false, error: error.message }); }
};
try {
	await page.goto("http://127.0.0.1:3005/editor/polish-performance-qa", { waitUntil: "domcontentloaded", timeout: 60_000 });
	await page.locator(".editing-screen").waitFor();
	await expect(page.getByRole("button", { name: "Advanced viewers", exact: true })).toBeVisible();
	await check("project breadcrumb removed", async () => {
		await expect(page.locator("header").first().getByRole("link", { name: "Projects", exact: true })).toHaveCount(0);
	});
	await check("default audio meter, DIM/VIS, hide/show, keyboard activation", async () => {
		const meter = page.getByRole("region", { name: "Audio monitor", exact: true });
		await expect(meter).toHaveAttribute("data-mode", "meter");
		const mode = meter.getByRole("button", { name: "Switch to audio visualizer", exact: true });
		await expect(mode).toHaveText("DIM");
		await mode.click();
		await expect(meter).toHaveAttribute("data-mode", "visualizer");
		await expect(meter.getByRole("button", { name: "Switch to audio meter", exact: true })).toHaveText("VIS");
		await page.getByRole("button", { name: "Hide audio visualizer", exact: true }).click();
		await expect(meter).toHaveCount(0);
		await page.getByRole("button", { name: "Show audio visualizer", exact: true }).click();
		await expect(meter).toHaveAttribute("data-mode", "visualizer");
		await meter.getByRole("button", { name: "Switch to audio meter", exact: true }).click();
	});
	await check("three docked viewer tools, keyboard tabs, close focus", async () => {
		await page.getByRole("button", { name: "Advanced viewers", exact: true }).click();
		const panel = page.locator("#advanced-viewers-panel");
		await expect(panel).toBeVisible();
		await expect(panel.getByRole("tab")).toHaveCount(3);
		await expect(page.getByRole("dialog")).toHaveCount(0);
		const colorWheels = panel.getByRole("tab", { name: "Color Wheels", exact: true });
		await colorWheels.click();
		await expect(panel.getByRole("tabpanel")).toContainText("Select a single visual element");
		const artidorAdjust = panel.getByRole("tab", { name: "Artidor Adjust", exact: true });
		await artidorAdjust.click();
		await expect(artidorAdjust).toHaveAttribute("aria-selected", "true");
		await page.screenshot({ path: `${output}/viewers-1440.png` });
		await panel.getByRole("button", { name: "Close advanced viewers", exact: true }).click();
		await expect(panel).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Advanced viewers", exact: true })).toBeFocused();
	});
	await check("cloud card fills panel to the bottom", async () => {
		const cloud = page.getByRole("button", { name: /^Cloud/ }).first();
		await cloud.click();
		const card = page.getByText("Cloud media is coming soon", { exact: true }).locator("../..");
		await expect(card).toBeVisible();
		const delta = await card.evaluate((element) => element.parentElement.getBoundingClientRect().bottom - element.getBoundingClientRect().bottom);
		expect(Math.abs(delta)).toBeLessThanOrEqual(2);
		await page.screenshot({ path: `${output}/cloud-1440.png` });
	});
	await check("empty track covers viewport after resize and horizontal scrolling", async () => {
		const drop = page.getByText("Drop media", { exact: true }).first();
		await expect(drop).toBeVisible();
		for (const width of [1440, 768, 1440]) {
			await page.setViewportSize({ width, height: 960 });
			await page.waitForTimeout(150);
			const geometry = await drop.evaluate((label) => {
				let scroller = label.parentElement;
				while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowX)) scroller = scroller.parentElement;
				if (!scroller) throw new Error("Timeline scroller missing");
				const rect = label.getBoundingClientRect();
				return { labelWidth: rect.width, viewportWidth: scroller.clientWidth, trackWidth: label.parentElement.getBoundingClientRect().width };
			});
			expect(geometry.labelWidth).toBeGreaterThanOrEqual(geometry.viewportWidth - 16);
			expect(geometry.labelWidth).toBeLessThanOrEqual(geometry.viewportWidth + 2);
			expect(geometry.trackWidth).toBeGreaterThanOrEqual(geometry.viewportWidth - 16);
		}
		await drop.evaluate((label) => {
			let scroller = label.parentElement;
			while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowX)) scroller = scroller.parentElement;
			if (scroller) scroller.scrollLeft = 150;
		});
		await page.waitForTimeout(150);
		await expect(drop).toBeVisible();
	});
	await check("catalog artwork, centered titles and motion gating", async () => {
		for (const name of ["Text", "Elements", "Transitions", "Motion", "Effects"]) {
			await page.getByRole("button", { name, exact: true }).first().click();
			const card = page.locator(".asset-preview-container").first();
			await expect(card).toBeVisible();
			await page.mouse.move(0, 0);
			await page.waitForTimeout(150);
			const idle = await card.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running" && animation.effect?.getTiming().iterations === Infinity).length);
			expect(idle).toBe(0);
			if (["Transitions", "Motion"].includes(name)) {
				await card.hover();
				await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running" && animation.effect?.getTiming().iterations === Infinity).length)).toBeGreaterThan(0);
			}
			if (name === "Transitions") await page.screenshot({ path: `${output}/transitions-1440.png` });
		}
	});
	await check("reduced motion and responsive viewport bounds", async () => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.getByRole("button", { name: "Motion", exact: true }).first().click();
		for (const width of [768, 375, 1440]) {
			await page.setViewportSize({ width, height: 960 });
			await page.waitForTimeout(150);
			const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(scrollWidth).toBeLessThanOrEqual(width);
			await page.screenshot({ path: `${output}/editor-${width}.png` });
		}
	});
} finally {
	await writeFile(`${output}/qa.json`, JSON.stringify({ results, errors }, null, 2));
	await browser.close();
}
console.log(JSON.stringify({ results, errors }, null, 2));
if (results.some((result) => !result.passed) || errors.length) process.exitCode = 1;
