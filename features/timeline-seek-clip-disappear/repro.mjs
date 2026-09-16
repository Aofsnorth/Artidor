/**
 * Reproduction: "add a second clip, click below the timeline to seek forward
 * quickly, and the second clip disappears".
 *
 * Flow (mirrors the user's report):
 *  1. Drop Screenshot-135.png onto the timeline -> clip 1 (image, 0-5s).
 *  2. Drop Screenshot-136.png next to it -> clip 2 (image, 5-10s, snapped).
 *  3. Rapidly click the empty track row BELOW the clips to seek forward.
 *  4. After every click, compare:
 *       - editor state (`list_elements` via __ARTIDOR_API__)
 *       - DOM clip count (`.timeline-clip`)
 *     A state bug removes the element from tracks; a render bug keeps the
 *     element in state but drops it from the DOM.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3005";
const DIR = "features/timeline-seek-clip-disappear";
const SHOTS = `${DIR}/screenshots`;
mkdirSync(SHOTS, { recursive: true });

// Minimal valid 1x1 RGBA PNG.
const PNG_BYTES = [
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
	0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
	0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
	0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
	0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

const log = [];
const push = (entry) => {
	log.push(entry);
	console.log(JSON.stringify(entry));
};

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
page.on("pageerror", (error) => push({ pageError: error.message }));
page.on("console", (message) => {
	if (message.type() === "error") push({ consoleError: message.text().slice(0, 300) });
});

const run = (name, args = {}) =>
	page.evaluate(async ([n, a]) => {
		const api = window.__ARTIDOR_API__;
		return await api.run(n, a);
	}, [name, args]);

const listElements = async () => {
	const result = await run("list_elements");
	return result?.data?.elements ?? [];
};

const snapshot = async (phase) => {
	const elements = await listElements();
	const domClips = await page.locator(".timeline-clip").count();
	push({ phase, stateElements: elements, domClips });
	return { stateElements: elements, domClips };
};

/** Dispatch a synthetic OS-file drop on the timeline section. */
const dropFile = async ({ fileName, x, y }) =>
	page.evaluate(
		({ fileName, x, y, png }) => {
			const file = new File([Uint8Array.from(png)], fileName, {
				type: "image/png",
			});
			const dt = new DataTransfer();
			dt.items.add(file);
			const section = document.querySelector('section[aria-label="Timeline"]');
			const opts = {
				bubbles: true,
				cancelable: true,
				dataTransfer: dt,
				clientX: x,
				clientY: y,
			};
			section.dispatchEvent(new DragEvent("dragenter", opts));
			for (let i = 0; i < 3; i += 1) {
				section.dispatchEvent(new DragEvent("dragover", opts));
			}
			section.dispatchEvent(new DragEvent("drop", opts));
		},
		{ fileName, x, y, png: PNG_BYTES },
	);

const shot = (name) =>
	page.screenshot({ path: `${SHOTS}/${name}.png` }).catch(() => undefined);

try {
	await page.goto(`${BASE}/editor/timeline-seek-repro`, {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	await page.waitForSelector(".editing-screen", { timeout: 30_000 });
	await page.waitForFunction(
		() =>
			Boolean(
				window.__ARTIDOR_API__ && window.__ARTIDOR_DEBUG__?.getState().tracks,
			),
		null,
		{ timeout: 30_000 },
	);
	await page.waitForTimeout(2000);

	// Dismiss onboarding dialog if it appears anyway.
	for (let attempt = 0; attempt < 6; attempt += 1) {
		const close = page.getByRole("button", { name: /^Close$/i }).first();
		if (await close.isVisible({ timeout: 200 }).catch(() => false)) {
			await close.click().catch(() => undefined);
			await page.waitForTimeout(200);
			continue;
		}
		const next = page.getByRole("button", { name: /^Next$/i }).first();
		if (await next.isVisible({ timeout: 200 }).catch(() => false)) {
			await next.click().catch(() => undefined);
			await page.waitForTimeout(200);
			continue;
		}
		break;
	}

	// Locate the main track row (the empty row below where images land).
	const mainTrack = page
		.locator('button[aria-label^="Select Main"]')
		.first();
	await mainTrack.waitFor({ state: "visible", timeout: 10_000 });
	const mainRect = await mainTrack.boundingBox();
	push({ phase: "boot", mainTrackRect: mainRect });

	// ── Phase 1: drop the first screenshot onto the timeline ──
	await dropFile({
		fileName: "Screenshot-135.png",
		x: mainRect.x + 60,
		y: mainRect.y + mainRect.height / 2,
	});
	await page.waitForTimeout(2500);
	await snapshot("after-drop-1");
	await shot("01-clip-1");

	// ── Phase 2: drop the second screenshot adjacent to clip 1 ──
	const clip1 = page.locator(".timeline-clip").first();
	await clip1.waitFor({ state: "visible", timeout: 10_000 });
	const clip1Rect = await clip1.boundingBox();
	await dropFile({
		fileName: "Screenshot-136.png",
		x: clip1Rect.x + clip1Rect.width + 12,
		y: clip1Rect.y + clip1Rect.height / 2,
	});
	await page.waitForTimeout(2500);
	const after2 = await snapshot("after-drop-2");
	await shot("02-clip-2");

	if (after2.stateElements.length !== 2) {
		push({
			phase: "abort",
			reason: `expected 2 elements after second drop, got ${after2.stateElements.length}`,
		});
	} else {
		// px per second measured from the DOM (clip 1 is exactly 5s wide).
		const pps = clip1Rect.width / 5;
		const contentLeft = clip1Rect.x; // t=0 for a clip at startTime 0

		// ── Phase 3: the user action — click BELOW the clips to seek ──
		// The empty main track row sits below the image track. Click it at
		// ~5.1s, then rapid-fire more clicks moving forward.
		const seekPoints = [5.1, 5.4, 5.8, 6.2, 6.6, 7.0];
		let clickIndex = 0;
		for (const seconds of seekPoints) {
			const x = contentLeft + seconds * pps;
			const y = mainRect.y + mainRect.height / 2;
			await page.mouse.click(x, y, { delay: 40 });
			clickIndex += 1;
			await page.waitForTimeout(120);
			const snap = await snapshot(`click-${clickIndex}-at-${seconds}s`);
			if (snap.stateElements.length !== 2 || snap.domClips !== 2) {
				await shot(`03-anomaly-click-${clickIndex}`);
				push({
					phase: "ANOMALY",
					atClick: clickIndex,
					seconds,
					stateCount: snap.stateElements.length,
					domCount: snap.domClips,
				});
				break;
			}
		}

		// Also try rapid clicks directly on the ruler.
		const ruler = page.locator('section[aria-label="Timeline"] div').first();
		await shot("04-final");

		const final = await snapshot("final");
		push({
			phase: "result",
			verdict:
				final.stateElements.length === 2 && final.domClips === 2
					? "NOT REPRODUCED (both clips intact in state and DOM)"
					: "REPRODUCED — clip loss detected",
		});
	}
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	writeFileSync(
		`${DIR}/repro-report.json`,
		JSON.stringify(log, null, 2),
		"utf8",
	);
	await browser.close();
}
