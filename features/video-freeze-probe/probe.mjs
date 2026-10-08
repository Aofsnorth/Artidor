/**
 * Video-freeze probe v2: creates a fresh project, uploads a real 1080p60
 * H.264 test clip through the app's own import UI, drops it on the timeline,
 * plays, and samples the preview canvas. Answers with evidence: does the
 * picture advance, does the "Rendering…" overlay flash, do console errors
 * (yield-star/prefetch) still fire — on a 4.2s-GOP long-GOP clip.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3005";
const VIDEO =
	process.env.PROBE_VIDEO ??
	"C:/Users/Axeliory/AppData/Local/Temp/artidor-qa/sample-1080p60.mp4";

const browser = await chromium.launch({ headless: false });
const result = {
	consoleMessages: [],
	canvasInfo: null,
	samples: [],
	summary: null,
};

async function dismissDialogs(page) {
	for (let round = 0; round < 3; round++) {
		const dialog = page.locator('[role="dialog"]');
		if (!(await dialog.count())) return;
		result.consoleMessages.push({
			type: "dialog",
			text: (await dialog.first().innerText()).slice(0, 200),
		});
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

try {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();
	page.on("console", (msg) => {
		result.consoleMessages.push({
			type: msg.type(),
			text: msg.text().slice(0, 300),
		});
	});
	page.on("pageerror", (err) => {
		result.consoleMessages.push({
			type: "pageerror",
			text: String(err).slice(0, 400),
		});
	});

	// 1. Fresh project via the projects page empty state.
	await page.goto(`${BASE}/projects`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForTimeout(2500);
	await dismissDialogs(page);
	await page
		.getByRole("button", { name: /create your first project/i })
		.first()
		.click({ timeout: 20000 });
	await page.waitForSelector(".editing-screen", { timeout: 120000 });
	await page.waitForTimeout(2500);
	await dismissDialogs(page);

	// 2. Upload the test clip through the assets panel's hidden file input.
	// Log every file input + the panel state first, so a wrong pick is
	// visible instead of silent.
	result.inputs = await page.evaluate(() =>
		[...document.querySelectorAll('input[type="file"]')].map((el) => ({
			accept: el.accept,
			multiple: el.multiple,
			panel: el.closest('[data-panel], [class*="panel"]')?.className?.slice(0, 80) ?? null,
		})),
	);
	const fileInput = page.locator('input[type="file"]').first();
	await fileInput.setInputFiles(VIDEO);

	// Wait for the import to finish: the asset card shows the file name.
	const assetName = VIDEO.split("/").pop().replace(/\.mp4$/i, "");
	const assetCard = page.locator("div", { hasText: assetName }).locator(
		"visible=true",
	).last();
	try {
		await page
			.getByText(assetName, { exact: false })
			.first()
			.waitFor({ timeout: 120000 });
	} catch {
		result.consoleMessages.push({
			type: "probe",
			text: `asset card never appeared for ${assetName}`,
		});
	}
	await page.waitForTimeout(3000); // thumbnail + waveform settle
	result.afterUpload = await page.evaluate(() => ({
		debug: window.__ARTIDOR_DEBUG__?.getState?.() ?? null,
	}));
	await page.screenshot({
		path: fileURLToPath(new URL("./shot-after-upload.png", import.meta.url)),
	});

	// 3. Add the asset to the timeline: hover the card to reveal the plus
	// button, then click the card's LAST button (the plus has no label).
	const card = page.locator("div.group", { hasText: assetName }).last();
	try {
		await card.hover({ timeout: 15000 });
		const plus = card.locator("button").last();
		await plus.click({ timeout: 10000 });
	} catch (error) {
		result.consoleMessages.push({
			type: "probe",
			text: `add-to-timeline failed: ${String(error).slice(0, 160)}`,
		});
	}
	// Wait until the timeline actually has the element.
	for (let i = 0; i < 20; i++) {
		const state = await page.evaluate(
			() => window.__ARTIDOR_DEBUG__?.getState?.() ?? null,
		);
		const count = state?.tracks?.main?.elementCount ?? 0;
		if (count > 0) break;
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(2000);
	await page.screenshot({
		path: fileURLToPath(new URL("./shot-after-add.png", import.meta.url)),
	});
	result.timeline = await page.evaluate(
		() => window.__ARTIDOR_DEBUG__?.getState?.() ?? null,
	);

	result.canvasInfo = await page.evaluate(() =>
		[...document.querySelectorAll("canvas")].map((c) => ({
			w: c.width,
			h: c.height,
		})),
	);

	// 4. Play + sample.
	const playButton = page.locator('button[aria-label="Play"]').first();
	if (await playButton.count()) {
		await playButton.click();
	} else {
		await page.keyboard.press("Space");
	}
	await page.waitForTimeout(500);

	for (let i = 0; i < 16; i++) {
		const sample = await page.evaluate(() => {
			const all = [...document.querySelectorAll("canvas")];
			const canvas = all.sort(
				(a, b) => b.width * b.height - a.width * a.height,
			)[0];
			let hash = null;
			if (canvas) {
				try {
					const off = document.createElement("canvas");
					off.width = 32;
					off.height = 18;
					const ctx = off.getContext("2d");
					ctx.drawImage(canvas, 0, 0, 32, 18);
					const data = ctx.getImageData(0, 0, 32, 18).data;
					let h = 0;
					for (let j = 0; j < data.length; j += 4) {
						h = (h * 31 + data[j] + data[j + 1] * 3 + data[j + 2] * 7) | 0;
					}
					hash = h;
				} catch (error) {
					hash = `tainted:${String(error?.message ?? error).slice(0, 60)}`;
				}
			}
			const overlayVisible = [...document.querySelectorAll("div")].some(
				(d) =>
					d.style.opacity === "1" &&
					d.textContent?.includes("Rendering"),
			);
			const pauseVisible = Boolean(
				document.querySelector('button[aria-label="Pause"]'),
			);
			const timeText = [...document.querySelectorAll("span,div")]
				.map((e) => e.textContent)
				.find((t) => /^\d{2}:\d{2}[:,.]\d{2}/.test(t ?? ""));
			const renderCount = performance
				.getEntriesByName("artidor.preview.render").length;
			const cacheStats =
				window.__ARTIDOR_DEBUG__?.videoCacheStats?.() ?? null;
			return {
				hash,
				overlayVisible,
				pauseVisible,
				timeText: timeText ? String(timeText).slice(0, 14) : null,
				renderCount,
				lastRenderMs: performance
					.getEntriesByName("artidor.preview.render")
					.at(-1)?.duration ?? null,
				cacheStats,
			};
		});
		result.samples.push({ i, ...sample });
		await page.waitForTimeout(500);
	}

	const pauseButton = page.locator('button[aria-label="Pause"]').first();
	if (await pauseButton.count()) await pauseButton.click();
	await page.waitForTimeout(1000);

	// SEEK TEST: jump the playhead 0 → 4 min WHILE PLAYING (the user's exact
	// repro), then sample rapidly: does the picture land on the target
	// immediately, lag, or briefly show EARLIER content ("keputer ulang")?
	result.seekTest = [];
	const preSeekHashes = result.samples.map((s) => String(s.hash));
	const seekResult = await page.evaluate(() =>
		window.__ARTIDOR_API__?.run("seek", { time: 240 * 120000 }),
	);
	result.consoleMessages.push({
		type: "probe",
		text: `seek command: ${JSON.stringify(seekResult).slice(0, 120)}`,
	});
	for (let i = 0; i < 24; i++) {
		for (let i = 0; i < 24; i++) {
			const s = await page.evaluate(() => {
				const all = [...document.querySelectorAll("canvas")];
				const canvas = all.sort(
					(a, b) => b.width * b.height - a.width * a.height,
				)[0];
				let hash = null;
				if (canvas) {
					try {
						const off = document.createElement("canvas");
						off.width = 32;
						off.height = 18;
						const ctx = off.getContext("2d");
						ctx.drawImage(canvas, 0, 0, 32, 18);
						const data = ctx.getImageData(0, 0, 32, 18).data;
						let h = 0;
						for (let j = 0; j < data.length; j += 4) {
							h = (h * 31 + data[j] + data[j + 1] * 3 + data[j + 2] * 7) | 0;
						}
						hash = h;
					} catch {
						hash = "tainted";
					}
				}
				const timeText = [...document.querySelectorAll("span,div")]
					.map((e) => e.textContent)
					.find((t) => /^\d{2}:\d{2}[:,.]\d{2}/.test(t ?? ""));
				return {
					hash,
					timeText: timeText ? String(timeText).slice(0, 14) : null,
					cacheStats:
						window.__ARTIDOR_DEBUG__?.videoCacheStats?.() ?? null,
				};
			});
			result.seekTest.push({ i, ...s });
			await page.waitForTimeout(120);
		}
		const postSeek = result.seekTest.map((s) => String(s.hash));
		// "Rewind" heuristic: a post-seek frame identical to one of the first
		// second of pre-seek playback (the clip-start region).
		const startHashes = new Set(preSeekHashes.slice(0, 4));
		result.seekSummary = {
			timecodes: result.seekTest.map((s) => s.timeText),
			currentFrameTs: result.seekTest.map(
				(s) => s.cacheStats?.sinks?.[0]?.currentFrameTs ?? null,
			),
			startContentFramesAfterSeek: postSeek.filter((h) =>
				startHashes.has(h),
			).length,
			distinctAfterSeek: new Set(postSeek).size,
		};
	}

	const playbackSamples = result.samples.slice(4);
	const hashes = playbackSamples.map((s) => String(s.hash));
	result.summary = {
		distinctFrames: new Set(hashes).size,
		samplesCounted: hashes.length,
		overlayVisibleCount: playbackSamples.filter((s) => s.overlayVisible).length,
		lastRenderMs: result.samples.at(-1)?.lastRenderMs ?? null,
		hashes: hashes,
	};

	writeFileSync(
		new URL("./probe-result.json", import.meta.url),
		JSON.stringify(result, null, 2),
	);
	console.log(JSON.stringify(result.summary, null, 2));
	console.log("--- console (first 10) ---");
	for (const m of result.consoleMessages.slice(0, 10)) {
		console.log(`[${m.type}] ${m.text.slice(0, 160)}`);
	}
} finally {
	await browser.close();
}
