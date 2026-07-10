import { expect, test, type Page } from "@playwright/test";
import { bootEditor, clickAssetTab } from "./helpers";

async function measureLongTasks(
	page: Page,
	action: () => Promise<void>,
): Promise<{ longTasks: number; durationMs: number }> {
	await page.evaluate(() => {
		const state = window as unknown as { __perfLongTasks?: number };
		state.__perfLongTasks = 0;
		try {
			new PerformanceObserver((list) => {
				state.__perfLongTasks =
					(state.__perfLongTasks ?? 0) + list.getEntries().length;
			}).observe({ entryTypes: ["longtask"] });
		} catch {
			state.__perfLongTasks = 0;
		}
	});
	const start = Date.now();
	await action();
	await page.waitForTimeout(100);
	const longTasks = await page.evaluate(
		() =>
			(window as unknown as { __perfLongTasks?: number }).__perfLongTasks ?? 0,
	);
	return { longTasks, durationMs: Date.now() - start };
}

async function insertMockVideos(
	page: Page,
	count: number,
	opts: { durationSeconds?: number } = {},
): Promise<void> {
	await page.evaluate(
		({ clipCount, options }) => {
			const debug = (
				window as unknown as {
					__ARTIDOR_DEBUG__?: {
						insertMockVideos?: (
							count: number,
							opts?: { durationSeconds?: number },
						) => void;
					};
				}
			).__ARTIDOR_DEBUG__;
			if (!debug?.insertMockVideos) throw new Error("insertMockVideos missing");
			debug.insertMockVideos(clipCount, options);
		},
		{ clipCount: count, options: opts },
	);
}

test("timeline handles 1000 mock clips without long-task storm", async ({
	page,
}) => {
	await bootEditor(page);
	const measurement = await measureLongTasks(page, async () => {
		await insertMockVideos(page, 1000, { durationSeconds: 1 });
	});
	await page.waitForTimeout(1000);
	const clipCount = await page.locator(".timeline-clip").count();
	expect(clipCount).toBeGreaterThan(0);
	expect(measurement.longTasks).toBeLessThan(200);
});

test("export dialog opens on a 500 clip timeline", async ({ page }) => {
	await bootEditor(page);
	await insertMockVideos(page, 500, { durationSeconds: 1 });
	await page
		.getByRole("button", { name: /export/i })
		.first()
		.click({ force: true });
	await expect(page.getByText(/export project/i).first()).toBeVisible({
		timeout: 15_000,
	});
});

test("editor remains usable after stress setup", async ({ page }) => {
	await bootEditor(page);
	await insertMockVideos(page, 200, { durationSeconds: 1 });
	await clickAssetTab(page, /^Effects$/i);
	await clickAssetTab(page, /^Assets$/i);
	await expect(page.locator(".editing-screen").first()).toBeVisible();
});
