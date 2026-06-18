/**
 * Diagnostic: verify setToolMode changes the visible UI.
 */
import { test } from "@playwright/test";
import { bootEditor } from "./helpers";

test("diag: setToolMode changes UI", async ({ page }) => {
	await bootEditor(page);
	const before = await page.evaluate(() => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: {
				setToolMode: (mode: string) => void;
			};
		};
		return {
			hasDebug: Boolean(w.__ARTIDOR_DEBUG__),
			hasSetToolMode: Boolean(w.__ARTIDOR_DEBUG__?.setToolMode),
		};
	});
	// biome-ignore lint/suspicious/noConsoleLog: diagnostic
	console.log("BEFORE:", JSON.stringify(before));

	// Set to draw mode
	await page.evaluate(() => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: { setToolMode: (mode: string) => void };
		};
		w.__ARTIDOR_DEBUG__?.setToolMode("draw");
	});
	await page.waitForTimeout(500);

	// Check the text "Drawing"
	const dump = await page.evaluate(() => {
		return {
			bodyHasDrawing: document.body.textContent?.includes("Drawing"),
			allText: document.body.textContent?.slice(0, 500),
		};
	});
	// biome-ignore lint/suspicious/noConsoleLog: diagnostic
	console.log("AFTER setToolMode(draw):", JSON.stringify(dump, null, 2));
});
