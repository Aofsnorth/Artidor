/** Quick check: does the jump-forward button actually seek? */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3005";
const push = (entry) => console.log(JSON.stringify(entry));

const browser = await chromium.launch({ headless: true, timeout: 20_000 });
const context = await browser.newContext({
	viewport: { width: 1440, height: 960 },
	reducedMotion: "reduce",
});
await context.addInitScript(() => {
	if (location.origin === "http://127.0.0.1:3005") {
		localStorage.setItem("hasSeenOnboarding", "true");
	}
});
const page = await context.newPage();
page.on("pageerror", (e) => push({ pageError: e.message.slice(0, 200) }));
page.on("console", (m) => {
	if (m.type() === "error") push({ consoleError: m.text().slice(0, 200) });
});

try {
	await page.goto(`${BASE}/editor/timeline-seek-jump`, {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	await page.waitForSelector(".editing-screen", { timeout: 30_000 });
	await page.waitForFunction(
		() => Boolean(window.__ARTIDOR_API__ && window.__ARTIDOR_DEBUG__),
		null,
		{ timeout: 30_000 },
	);
	await page.waitForTimeout(1500);

	const readPlayhead = () =>
		page.evaluate(() => {
			const playhead = document.querySelector(
				'[aria-label="Timeline playhead"]',
			);
			return {
				valuenow: playhead?.getAttribute("aria-valuenow") ?? null,
				rect: playhead
					? (() => {
							const r = playhead.getBoundingClientRect();
							return { x: Math.round(r.x), right: Math.round(r.right) };
						})()
					: null,
			};
		});

	push({ phase: "before", ...(await readPlayhead()) });

	const button = page.getByRole("button", {
		name: "Jump forward (or next bookmark)",
	});
	const count = await button.count();
	push({ phase: "button-count", count });
	if (count > 0) {
		const visible = await button.first().isVisible().catch(() => false);
		push({ phase: "button-visible", visible });
	}

	// Insert a text element via the API so the timeline is non-trivial.
	const insert = await page.evaluate(async () => {
		const api = window.__ARTIDOR_API__;
		return await api.run("insert_text_element", {
			content: "probe",
			durationSeconds: 4,
		});
	});
	push({ phase: "insert-text", ok: insert.ok });
	await page.waitForTimeout(1000);

	await button.first().click({ timeout: 10_000 });
	await page.waitForTimeout(800);
	push({ phase: "after-1-click", ...(await readPlayhead()) });

	await button.first().click({ timeout: 10_000 });
	await page.waitForTimeout(800);
	push({ phase: "after-2-click", ...(await readPlayhead()) });
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	await browser.close();
}
