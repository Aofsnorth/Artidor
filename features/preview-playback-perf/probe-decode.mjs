/**
 * Video decode pipeline probe.
 *
 * Samples the video-cache sink state at high frequency during playback and
 * records the sequence of frames actually presented on the preview canvas, so
 * the decode cadence can be explained instead of guessed:
 *
 *   - sink series: currentFrameTs / buffer occupancy / lag / background fetch
 *   - presented series: the frame timestamp visible on the canvas each rAF
 *
 * A 60 fps source in a 60 fps project should present ~60 distinct frames per
 * second. Anything less is the lag the user feels.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3005";
const VIDEO =
	process.env.PROBE_VIDEO ??
	join(tmpdir(), "artidor-qa", "sample-1080p60.mp4").replaceAll("\\", "/");
const LABEL = process.env.PROBE_LABEL ?? "decode";
const SECONDS = Number(process.env.PROBE_SECONDS ?? 5);

const result = { label: LABEL, video: VIDEO, series: null, presented: null, console: [] };

function installInstrumentation() {
	const w = window;
	const probe = { recording: false, sinkSamples: [], presentedSamples: [], lastTs: null };
	w.__probe = probe;

	const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
	CanvasRenderingContext2D.prototype.drawImage = function (...args) {
		if (probe.recording && this.canvas === probe.previewCanvas) {
			const stats = w.__ARTIDOR_DEBUG__?.videoCacheStats?.();
			const ts = stats?.sinks?.[0]?.currentFrameTs ?? null;
			const t = Math.round(performance.now() - probe.t0);
			if (ts !== probe.lastTs) {
				probe.presentedSamples.push({ t, ts, changed: true });
				probe.lastTs = ts;
			} else {
				probe.presentedSamples.push({ t, ts, changed: false });
			}
		}
		return originalDrawImage.apply(this, args);
	};

	const sinkTick = () => {
		if (probe.recording) {
			const stats = w.__ARTIDOR_DEBUG__?.videoCacheStats?.();
			const s = stats?.sinks?.[0];
			if (s) {
				probe.sinkSamples.push({
					t: Math.round(performance.now() - probe.t0),
					cur: s.currentFrameTs,
					buf: s.bufferLength,
					bufFirst: s.bufferFirstTs,
					bufLast: s.bufferLastTs,
					req: s.lastRequestedTime,
					last: s.lastTime,
					bg: s.backgroundActive,
					gen: s.seekGeneration,
					iter: s.hasIterator,
				});
			}
		}
		setTimeout(sinkTick, 50);
	};
	setTimeout(sinkTick, 50);
}

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
	await context.addInitScript(installInstrumentation);
	const page = await context.newPage();
	page.on("console", (msg) => {
		if (msg.type() === "error") result.console.push(msg.text().slice(0, 200));
	});
	page.on("pageerror", (err) => result.console.push(String(err).slice(0, 250)));

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
	await page.evaluate(() => window.__ARTIDOR_API__?.run("clear_selection"));

	await page.evaluate(() => {
		const all = [...document.querySelectorAll("canvas")];
		const area = (c) => {
			const r = c.getBoundingClientRect();
			return r.width * r.height;
		};
		window.__probe.previewCanvas = all.sort((a, b) => area(b) - area(a))[0] ?? null;
	});

	await page.evaluate(() => window.__ARTIDOR_API__?.run("seek", { time: 0 }));
	await page.waitForTimeout(300);
	const playButton = page.locator('button[aria-label="Play"]').first();
	if (await playButton.count()) await playButton.click();
	else await page.keyboard.press("Space");
	await page.waitForTimeout(1500);

	const raw = await page.evaluate(async (seconds) => {
		const p = window.__probe;
		p.sinkSamples = [];
		p.presentedSamples = [];
		p.lastTs = null;
		p.t0 = performance.now();
		p.recording = true;
		await new Promise((r) => setTimeout(r, seconds * 1000));
		p.recording = false;
		return { sinkSamples: p.sinkSamples, presentedSamples: p.presentedSamples };
	}, SECONDS);

	const pause = page.locator('button[aria-label="Pause"]').first();
	if (await pause.count()) await pause.click();

	result.series = raw.sinkSamples;
	result.presented = raw.presentedSamples;

	// Derived summary.
	const presented = raw.presentedSamples;
	const distinct = presented.filter((s) => s.changed).length;
	const seconds = SECONDS;
	const bufferEmpty = raw.sinkSamples.filter((s) => s.buf === 0).length;
	const bgActive = raw.sinkSamples.filter((s) => s.bg).length;
	const lags = raw.sinkSamples
		.filter((s) => s.req !== null && s.cur !== null)
		.map((s) => s.req - s.cur);
	result.summary = {
		distinctPresented: distinct,
		distinctPerSec: +(distinct / seconds).toFixed(1),
		presentSamples: presented.length,
		presentRate: +(presented.length / seconds).toFixed(1),
		holdRatio: +(1 - distinct / Math.max(1, presented.length)).toFixed(3),
		sinkSamples: raw.sinkSamples.length,
		bufferEmptyRatio: +(bufferEmpty / Math.max(1, raw.sinkSamples.length)).toFixed(3),
		backgroundActiveRatio: +(bgActive / Math.max(1, raw.sinkSamples.length)).toFixed(3),
		lagMs: {
			min: lags.length ? +(Math.min(...lags) * 1000).toFixed(0) : null,
			max: lags.length ? +(Math.max(...lags) * 1000).toFixed(0) : null,
			avg: lags.length ? +((lags.reduce((a, b) => a + b, 0) / lags.length) * 1000).toFixed(0) : null,
		},
		seekGenerationStart: raw.sinkSamples[0]?.gen ?? null,
		seekGenerationEnd: raw.sinkSamples.at(-1)?.gen ?? null,
	};
} catch (error) {
	result.error = String(error?.stack ?? error).slice(0, 1200);
} finally {
	writeFileSync(new URL(`./result-${LABEL}.json`, import.meta.url), JSON.stringify(result, null, 2));
	await browser.close();
}

console.log("summary:", JSON.stringify(result.summary, null, 2));
if (result.presented) {
	const compact = result.presented
		.filter((s) => s.changed)
		.slice(0, 40)
		.map((s) => `${s.t}ms:${(s.ts ?? 0).toFixed(3)}`);
	console.log("first distinct presents:", compact.join(" "));
}
if (result.series) {
	console.log(
		"sink series (first 30):",
		result.series
			.slice(0, 30)
			.map((s) => `${s.t}:buf${s.buf}/lag${s.req && s.cur ? Math.round((s.req - s.cur) * 1000) : "?"}${s.bg ? "/bg" : ""}`)
			.join(" "),
	);
}
