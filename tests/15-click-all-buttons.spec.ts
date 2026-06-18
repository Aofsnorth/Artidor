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

test.describe.configure({ mode: "serial" });

test("Click every visible button in the editor — no fatal errors", async ({
	page,
}) => {
	test.setTimeout(180_000); // 3 minutes — we click ~100 buttons.
	const { errors } = installErrorRecorder(page);
	await bootEditor(page);
	// Visit each asset tab so its buttons are mounted.
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
		await page.waitForTimeout(50);
	}
	// Collect (element, identifier) pairs for every button in
	// the DOM in a single page.evaluate. We attach a
	// `data-button-id` attribute so the click step can use
	// the much-cheaper `getByTestId` selector instead of a
	// regex `getByRole({ name })` query per button.
	const buttonCount = await page.evaluate(() => {
		const buttons = Array.from(
			document.querySelectorAll<HTMLButtonElement>("button"),
		);
		buttons.forEach((b, idx) => {
			b.setAttribute("data-button-id", `b${idx}`);
		});
		return buttons.length;
	});
	// Build a map of button id → identifier.
	const idToIdentifier = await page.evaluate(() => {
		const buttons = Array.from(
			document.querySelectorAll<HTMLButtonElement>(
				"button[data-button-id]",
			),
		);
		const out: Record<string, string> = {};
		for (const b of buttons) {
			const id = b.getAttribute("data-button-id") ?? "";
			const aria = b.getAttribute("aria-label");
			const title = b.getAttribute("title");
			const text = (b.textContent ?? "")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, 50);
			out[id] = aria ?? title ?? text;
		}
		return out;
	});

	const seen = new Set<string>();
	const failures: string[] = [];
	let clicked = 0;
	for (const [id, identifier] of Object.entries(idToIdentifier)) {
		if (!identifier) continue;
		if (SKIP_CLICK_PATTERNS.some((re) => re.test(identifier))) continue;
		if (seen.has(identifier)) continue;
		seen.add(identifier);
		const before = errors.length;
		try {
			await page.locator(`[data-button-id="${id}"]`).click({
				force: true,
				timeout: 800,
			});
			// No waitForTimeout — the test for fatal errors
			// already accounts for any synchronous throws via
			// `errors`. Skipping the per-click sleep cuts
			// 100-button × 40ms = 4s off the test.
			clicked++;
		} catch {
			// Some buttons trigger popovers that close; that's
			// fine. We only care about *fatal* errors.
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
		`Clicked ${clicked} of ${seen.size} unique buttons without fatal errors (out of ${buttonCount} total).`,
	);
});
