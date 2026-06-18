/**
 * Click-every-button smoke test.
 *
 * The user asked us to "klik semua button juga" — click every
 * button the user listed and any other reachable button in the
 * editor. This test:
 *   1. Boots the editor.
 *   2. Walks every visible button in the DOM.
 *   3. For each, clicks it once and records whether the click
 *      produced a fatal error (page error, uncaught exception,
 *      "Editor hit a snag" crash boundary).
 *   4. Asserts that no button click caused a fatal error.
 *
 * The test deliberately does NOT verify behaviour per-button —
 * the per-button tests live in 03-bugfixes, 04-critical-buttons,
 * and 09-plugin. This is the "no button is a booby-trap" smoke.
 */
import { test, expect } from "@playwright/test";
import { bootEditor, installErrorRecorder, clickAssetTab } from "./helpers";

/**
 * Some buttons (Pop out, Project thumbnail) intentionally
 * open new windows or navigate. Skipping them keeps the test
 * hermetic (single page) while still exercising the rest.
 */
const SKIP_CLICK_PATTERNS: RegExp[] = [
	/Pop out /i,
	/Artidor Logo/i,
	/Invite/i,
	/Export/i,
	/Fullscreen preview/i,
	/Open issues overlay/i,
	/Collapse issues badge/i,
];

test("Click every visible button in the editor — no fatal errors", async ({
	page,
}) => {
	const { errors } = installErrorRecorder(page);
	await bootEditor(page);
	// Make sure each asset tab is visited at least once so its
	// buttons are mounted.
	for (const tab of [
		/^Assets$/i,
		/^Text$/i,
		/^Elements$/i,
		/^Effects$/i,
		/^Overlays$/i,
		/^Audio$/i,
		/^Motion$/i,
		/^Adjust$/i,
		/^Templates$/i,
		/^Preset$/i,
		/^Tools$/i,
		/^Plugins$/i,
	]) {
		await clickAssetTab(page, tab);
		await page.waitForTimeout(150);
	}
	// Collect every visible button the user can click. The
	// selector matches all buttons, then we filter by
	// `isVisible` so off-screen / dialog-hidden ones are
	// skipped.
	const buttons = page.getByRole("button");
	const total = await buttons.count();
	const seen = new Set<string>();
	const failures: string[] = [];
	let clicked = 0;
	for (let i = 0; i < total; i++) {
		const btn = buttons.nth(i);
		const visible = await btn
			.isVisible({ timeout: 500 })
			.catch(() => false);
		if (!visible) continue;
		const ariaLabel = await btn
			.getAttribute("aria-label")
			.catch(() => null);
		const title = await btn.getAttribute("title").catch(() => null);
		const text = ((await btn.textContent().catch(() => "")) ?? "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 50);
		const identifier = ariaLabel ?? title ?? text;
		if (!identifier) continue;
		if (SKIP_CLICK_PATTERNS.some((re) => re.test(identifier))) continue;
		if (seen.has(identifier)) continue;
		seen.add(identifier);

		// Snapshot the error count so we can attribute any new
		// errors to this specific click.
		const before = errors.length;
		try {
			await btn.click({ force: true, timeout: 1_500 });
			await page.waitForTimeout(80);
			clicked++;
		} catch {
			// Some buttons are in a popover / dialog that the
			// click closes; that's fine. We only care about
			// *fatal* errors, not click-time exceptions.
		}
		const newErrors = errors.slice(before);
		if (newErrors.length > 0) {
			failures.push(
				`${identifier} — new fatal error: ${newErrors.join(" | ")}`,
			);
		}
	}
	expect(
		failures,
		`${failures.length} of ${seen.size} button(s) crashed:\n  - ${failures.join("\n  - ")}`,
	).toEqual([]);
	// biome-ignore lint/suspicious/noConsoleLog: diagnostic
	console.log(
		`Clicked ${clicked} of ${seen.size} unique visible buttons without fatal errors.`,
	);
});
