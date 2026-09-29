/**
 * Advanced viewers — diagnostics panel.
 *
 * Regression for a duplication that shipped and was then removed: the panel
 * used to carry an "Artidor Adjust" grading surface that mirrored the
 * inspector's Adjust tab control for control. Grading now lives only in the
 * inspector, and the panel is diagnostics — the wide signal analysis that
 * does not fit in a narrow inspector column.
 *
 * Also covers the histogram scope, which shares the downsampled preview
 * frame the waveform / vectorscope / parade already consume.
 */
import { expect, test } from "@playwright/test";
import { bootEditor, installErrorRecorder, insertMockVideo } from "./helpers";

async function openAdvancedViewers(page: import("@playwright/test").Page) {
	await page
		.getByRole("button", { name: /advanced viewers/i })
		.first()
		.click({ force: true });
	const panel = page.locator("#advanced-viewers-panel");
	await expect(panel, "advanced viewers panel opens").toBeVisible({
		timeout: 10_000,
	});
	return panel;
}

test.describe("Advanced viewers", () => {
	test("no longer hosts a grading surface that duplicates the inspector", async ({
		page,
	}) => {
		const { errors } = installErrorRecorder(page);
		await bootEditor(page);
		await insertMockVideo(page, { durationSeconds: 3 });
		const panel = await openAdvancedViewers(page);

		// The duplicated grading tab must be gone by name...
		await expect(panel.getByText(/artidor adjust/i)).toHaveCount(0);
		await expect(panel.getByText(/^color$/i)).toHaveCount(0);
		// ...and the diagnostics that ARE unique to this panel must remain.
		await expect(panel).toContainText(/advanced viewers/i);
		expect(errors, errors.join("\n")).toEqual([]);
	});

	test("offers waveform, vectorscope, parade and histogram", async ({
		page,
	}) => {
		await bootEditor(page);
		await insertMockVideo(page, { durationSeconds: 3 });
		const panel = await openAdvancedViewers(page);

		// The scope switcher labels its buttons with the full scope name and
		// shows a short code inside, so match on the accessible name.
		for (const name of [
			/^waveform$/i,
			/^vectorscope$/i,
			/parade/i,
			/^histogram$/i,
		]) {
			await expect(
				panel.getByRole("button", { name }),
				`${String(name)} scope control`,
			).toBeVisible({ timeout: 10_000 });
		}
	});

	test("selecting the histogram renders it without errors", async ({
		page,
	}) => {
		const { errors } = installErrorRecorder(page);
		await bootEditor(page);
		await insertMockVideo(page, { durationSeconds: 3 });
		const panel = await openAdvancedViewers(page);

		await panel
			.getByRole("button", { name: /^histogram$/i })
			.click({ force: true });
		await page.waitForTimeout(800);

		await expect(
			panel.getByText(/distribution/i).first(),
			"histogram format label",
		).toBeVisible({ timeout: 10_000 });
		expect(errors, errors.join("\n")).toEqual([]);
	});
});
