import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const phase = process.argv[2] ?? "before";
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
const report = [];
page.on("pageerror", (error) =>
	report.push({ error: error.message, url: page.url() }),
);
const capture = async (name) => {
	await page.screenshot({
		path: `features/ui-polish-2026-09-06/screenshots/${phase}-${name}.png`,
	});
	report.push({
		name,
		url: page.url(),
		text: (await page.locator("body").innerText()).slice(0, 12_000),
		metrics: await page.evaluate(() => ({
			width: innerWidth,
			scrollWidth: document.documentElement.scrollWidth,
			font: getComputedStyle(document.body).fontFamily,
		})),
	});
};
try {
	await page.goto("http://127.0.0.1:3005/editor/ui-polish-qa", {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	await page.waitForFunction(
		() =>
			Boolean(
				window.__ARTIDOR_API__ && window.__ARTIDOR_DEBUG__?.getState().tracks,
			),
		null,
		{ timeout: 30_000 },
	);
	await page.waitForTimeout(1800);
	await capture("editor-empty");
	await page.evaluate(async () => {
		const result = await window.__ARTIDOR_API__.run("insert_text_element", {
			content: "The quiet coast",
			durationSeconds: 5,
		});
		if (!result.ok) throw new Error(result.message);
	});
	await page.waitForTimeout(800);
	await capture("editor-selected-text");
	for (const label of [
		"Text",
		"Elements",
		"Transitions",
		"Effects",
		"Overlays",
		"Audio",
		"Motion",
		"Adjust",
		"Templates",
		"Preset",
		"Tools",
		"Plugins",
		"Captions",
		"Scripting",
		"Settings",
		"Arth",
	]) {
		await page
			.getByRole("button", { name: label, exact: true })
			.first()
			.click();
		await page.waitForTimeout(700);
		await capture(`editor-${label.toLowerCase()}`);
	}
	await page.getByRole("button", { name: "Export", exact: true }).click();
	await page.waitForTimeout(400);
	await capture("export");
	await page.keyboard.press("Escape");
	await page.goto("http://127.0.0.1:3005/projects", {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	await page.waitForTimeout(1800);
	await capture("projects");
	await page.setViewportSize({ width: 768, height: 1024 });
	await capture("projects-768");
	await page.goto("http://127.0.0.1:3005/", {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	await page.waitForTimeout(1200);
	await capture("home-768");
	await page.setViewportSize({ width: 375, height: 812 });
	await capture("home-375");
	await page.setViewportSize({ width: 1440, height: 960 });
	await capture("home-1440");
} finally {
	await writeFile(
		`features/ui-polish-2026-09-06/${phase}-inspection.json`,
		JSON.stringify(report, null, 2),
	);
	await browser.close();
}
console.log(
	JSON.stringify(
		report.map(({ text, ...entry }) => entry),
		null,
		2,
	),
);
