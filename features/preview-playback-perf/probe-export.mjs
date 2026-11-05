/**
 * Export failure probe.
 *
 * Reproduces the failing export with FULL console capture (every message, not
 * just `[export]` prefixed ones) so the actual error survives, plus timestamps
 * relative to the export start to expose stalls.
 *
 * Also records the OPFS `exports/` directory before and after, so leftover
 * temp files from a failed run are visible.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3005";
const VIDEO =
	process.env.PROBE_VIDEO ??
	join(tmpdir(), "artidor-qa", "sample-1080p60.mp4").replaceAll("\\", "/");
const LABEL = process.env.PROBE_LABEL ?? "export";
const QUALITY = process.env.PROBE_EXPORT_QUALITY ?? "high";
const FORMAT = process.env.PROBE_EXPORT_FORMAT ?? "mp4";

const result = { label: LABEL, video: VIDEO, quality: QUALITY, format: FORMAT, console: [], export: null };

async function dismissDialogs(page) {
	for (let round = 0; round < 3; round++) {
		const dialog = page.locator('[role="dialog"]');
		if (!(await dialog.count())) return;
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(400);
		if (await dialog.count()) {
			const buttons = dialog.first().locator("button");
			const count = await buttons.count();
			if (count > 0) await buttons.nth(count - 1).click().catch(() => {});
			await page.waitForTimeout(400);
		}
	}
}

const browser = await chromium.launch({
	headless: false,
	channel: process.env.PROBE_CHANNEL === "chromium" ? undefined : (process.env.PROBE_CHANNEL ?? "chrome"),
	args: ["--window-size=1460,980", "--disable-renderer-backgrounding"],
});

try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const messages = [];
	let captureStart = 0;
	page.on("console", (msg) => {
		messages.push({
			t: captureStart ? Math.round(performance.now() - captureStart) : null,
			type: msg.type(),
			text: msg.text().slice(0, 400),
		});
	});
	page.on("pageerror", (err) => {
		messages.push({ t: captureStart ? Math.round(performance.now() - captureStart) : null, type: "pageerror", text: String(err).slice(0, 400) });
	});

	await page.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded", timeout: 120000 });
	await page.waitForTimeout(2500);
	await dismissDialogs(page);
	await page.getByRole("button", { name: /create your first project/i }).first().click({ timeout: 30000 });
	await page.waitForSelector(".editing-screen", { timeout: 180000 });
	await page.waitForTimeout(2500);
	await dismissDialogs(page);

	await page.locator('input[type="file"]').first().setInputFiles(VIDEO);
	const assetName = VIDEO.split("/").pop().replace(/\.mp4$/i, "");
	await page.getByText(assetName, { exact: false }).first().waitFor({ timeout: 180000 });
	await page.waitForTimeout(2500);
	const card = page.locator("div.group", { hasText: assetName }).last();
	await card.hover({ timeout: 15000 });
	await card.locator("button").last().click({ timeout: 10000 });
	for (let i = 0; i < 40; i++) {
		const count = await page.evaluate(
			() => window.__ARTIDOR_DEBUG__?.getState?.()?.tracks?.main?.elementCount ?? 0,
		);
		if (count > 0) break;
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(2000);

	// Deselect so the properties panel is not re-rendering during the export.
	await page.evaluate(() => window.__ARTIDOR_API__?.run("clear_selection"));
	await page.waitForTimeout(500);

	result.project = await page.evaluate(async () => {
		const info = await window.__ARTIDOR_API__?.run("get_project_info");
		return info?.data ?? null;
	});

	const listOpfs = () =>
		page.evaluate(async () => {
			try {
				const root = await navigator.storage.getDirectory();
				const dir = await root.getDirectoryHandle("exports", { create: false });
				const names = [];
				for await (const entry of dir.values()) names.push(entry.name);
				return names;
			} catch {
				return [];
			}
		});
	result.opfsBefore = await listOpfs();

	messages.length = 0;
	captureStart = await page.evaluate(() => performance.now());
	const started = Date.now();
	const response = await page.evaluate(async ({ format, quality }) => {
		const result = await window.__ARTIDOR_API__?.run("export_project", {
			format,
			quality,
			includeAudio: true,
		});
		return {
			ok: result?.ok ?? false,
			message: result?.message ?? null,
			byteLength:
				result?.data?.streamed?.byteLength ?? result?.data?.buffer?.byteLength ?? null,
			raw: JSON.stringify(result?.data ?? null).slice(0, 600),
		};
	}, { format: FORMAT, quality: QUALITY });
	const wallMs = Date.now() - started;

	result.opfsAfter = await listOpfs();
	result.export = { wallMs, ...response };
	result.console = messages;
	await page.screenshot({ path: fileURLToPath(new URL(`./shot-${LABEL}.png`, import.meta.url)) });
} catch (error) {
	result.error = String(error?.stack ?? error).slice(0, 1500);
} finally {
	writeFileSync(new URL(`./result-${LABEL}.json`, import.meta.url), JSON.stringify(result, null, 2));
	await browser.close();
}

const ex = result.export;
console.log(`export: ${ex ? (ex.ok ? "OK" : "FAILED") : "n/a"} in ${ex?.wallMs ?? "?"}ms`);
console.log(`message: ${ex?.message ?? "-"}`);
console.log(`opfs before: ${JSON.stringify(result.opfsBefore)} after: ${JSON.stringify(result.opfsAfter)}`);
console.log("--- console (last 45) ---");
for (const m of result.console.slice(-45)) {
	console.log(`[${m.t}ms][${m.type}] ${m.text}`);
}
