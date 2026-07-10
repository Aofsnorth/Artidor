#!/usr/bin/env bun
/**
 * scripts/capture-editor-screenshot.ts
 *
 * Captures a real screenshot of the running editor for the
 * marketing site. Falls back to /projects if the editor route
 * doesn't load.
 *
 * Run: `bun run scripts/capture-editor-screenshot.ts`
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"apps",
	"web",
	"public",
	"editor-preview.png",
);
const VIEWPORT = { width: 1920, height: 1200 };
const STICKY_HEADER_OFFSET = 56;

async function main() {
	await mkdir(dirname(OUT), { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();
	try {
		// Editor route — even with a bogus project id, the chrome
		// (tab bar, preview area, properties panel, timeline) renders.
		await page.goto(`${BASE_URL}/editor/demo`, {
			waitUntil: "domcontentloaded",
			timeout: 30_000,
		});
		// Give the editor a moment to mount the canvas + tiles.
		await page.waitForTimeout(5000);
		await page.screenshot({
			path: OUT,
			type: "png",
			fullPage: false,
			clip: {
				x: 0,
				y: STICKY_HEADER_OFFSET,
				width: VIEWPORT.width,
				height: VIEWPORT.height - STICKY_HEADER_OFFSET,
			},
		});
		console.log(`✓ wrote ${OUT}`);
	} finally {
		await context.close();
		await browser.close();
	}
}

main().catch((err) => {
	console.error("ERROR:", err?.message ?? err);
	process.exit(1);
});
