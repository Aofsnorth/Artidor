/**
 * Fix verification for the disappearing-clip bug.
 *
 * Fix under test: `use-timeline-playhead` now keeps the playhead inside the
 * viewport on a PAUSED seek (previously the viewport only followed the
 * playhead while playing). A forward seek that left the viewport untouched
 * made clips ahead look like they vanished the moment the seek click
 * cleared their selection (element-level culling unmounted them).
 *
 * Checks:
 *  V1. In-viewport seek click keeps the viewport pixel-stable (no jump).
 *  V2. A seek to a time outside the viewport (keyboard seekForward
 *      equivalent, dispatched as the same `playback-seek` event
 *      PlaybackManager emits) scrolls the viewport to the playhead and
 *      keeps the second clip visible in state + DOM + on screen.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3005";
const DIR = "features/timeline-seek-clip-disappear";
mkdirSync(`${DIR}/screenshots`, { recursive: true });

const PNG_BYTES = [
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
	0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
	0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
	0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
	0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];
const TICKS_PER_SECOND = 120_000;

const report = [];
const push = (entry) => {
	report.push(entry);
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

const run = (name, args = {}) =>
	page.evaluate(async ([n, a]) => {
		const api = window.__ARTIDOR_API__;
		return await api.run(n, a);
	}, [name, args]);

const dropFile = ({ fileName, x, y }) =>
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

const dispatchSeek = (seconds) =>
	page.evaluate((ticks) => {
		window.dispatchEvent(
			new CustomEvent("playback-seek", { detail: { time: ticks } }),
		);
	}, Math.round(seconds * TICKS_PER_SECOND));

const forensic = async (phase) => {
	const data = await page.evaluate(() => {
		const clips = [...document.querySelectorAll(".timeline-clip")];
		let scroll = null;
		const first = clips[0];
		if (first) {
			let node = first.parentElement;
			while (node && node !== document.body) {
				const style = getComputedStyle(node);
				if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
					scroll = {
						scrollLeft: node.scrollLeft,
						clientWidth: node.clientWidth,
						scrollWidth: node.scrollWidth,
					};
					break;
				}
				node = node.parentElement;
			}
		}
		return {
			domClips: clips.length,
			clipRects: clips.map((clip) => {
				const rect = clip.getBoundingClientRect();
				return {
					x: Math.round(rect.x),
					right: Math.round(rect.right),
					width: Math.round(rect.width),
					name: clip.textContent?.slice(0, 24) ?? "",
				};
			}),
			scroll,
		};
	});
	const state = await run("list_elements");
	const stateCount = state?.data?.elements?.length ?? 0;
	push({
		phase,
		...data,
		stateCount,
	});
	return { ...data, stateCount };
};

let failures = 0;
const expect = (condition, label) => {
	push({ check: label, pass: Boolean(condition) });
	if (!condition) failures += 1;
};

try {
	await page.goto(`${BASE}/editor/timeline-seek-verify`, {
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

	const mainTrack = page.locator('button[aria-label^="Select Main"]').first();
	await mainTrack.waitFor({ state: "visible", timeout: 10_000 });
	const mainRect = await mainTrack.boundingBox();

	await dropFile({
		fileName: "Screenshot-135.png",
		x: mainRect.x + 60,
		y: mainRect.y + mainRect.height / 2,
	});
	await page.waitForTimeout(2500);
	const clip1Rect = await page.locator(".timeline-clip").first().boundingBox();
	await dropFile({
		fileName: "Screenshot-136.png",
		x: clip1Rect.x + clip1Rect.width + 12,
		y: clip1Rect.y + clip1Rect.height / 2,
	});
	await page.waitForTimeout(2500);
	const setup = await forensic("setup");
	expect(setup.stateCount === 2, "setup: 2 clips in state");
	expect(setup.domClips === 2, "setup: 2 clips in DOM");

	// ── V1: in-viewport seek click must not move the viewport ──
	const trackY = clip1Rect.y + clip1Rect.height / 2;
	await page.mouse.click(600, trackY, { delay: 40 });
	await page.waitForTimeout(400);
	const v1 = await forensic("V1-in-viewport-click");
	expect(v1.scroll.scrollLeft === 0, "V1: viewport stays pixel-stable");
	expect(v1.domClips === 2, "V1: both clips still mounted");

	// ── V2: seek to a time outside the viewport (keyboard-forward
	//    equivalent). The viewport must follow the playhead and keep the
	//    second clip visible. ──
	await dispatchSeek(5.08);
	await page.waitForTimeout(600);
	const v2 = await forensic("V2-seek-to-5.08s");
	expect(v2.scroll.scrollLeft > 0, "V2: viewport scrolled to the playhead");
	expect(v2.domClips === 2, "V2: both clips mounted");
	const clip2 = v2.clipRects.find((rect) => rect.name.includes("136"));
	expect(
		clip2 && clip2.x < 1440 && clip2.right > 336,
		"V2: second clip visible on screen",
	);
	await page.screenshot({ path: `${DIR}/screenshots/V2-fixed.png` });

	// Playhead visibility: its left position must fall inside the viewport.
	const playheadVisible = await page.evaluate(() => {
		const playhead = document.querySelector(
			'[aria-label="Timeline playhead"]',
		);
		if (!playhead) return null;
		const rect = playhead.getBoundingClientRect();
		return rect.x >= 300 && rect.right <= 1450;
	});
	push({ check: "V2: playhead inside viewport", pass: playheadVisible === true });

	// ── V3: repeated forward seeks (the user's rapid clicking) ──
	for (const seconds of [6.5, 8.2, 3.0, 9.5]) {
		await dispatchSeek(seconds);
		await page.waitForTimeout(250);
	}
	await page.waitForTimeout(400);
	const v3 = await forensic("V3-rapid-seeks");
	expect(v3.stateCount === 2, "V3: state intact after rapid seeks");
	expect(v3.domClips === 2, "V3: both clips mounted after rapid seeks");
	await page.screenshot({ path: `${DIR}/screenshots/V3-fixed.png` });

	// ── V4: real jump-forward via the transport button ──
	// The user's "ke detik depan secara cepat": rapid forward seeks must
	// keep the playhead on screen and both clips mounted.
	const jumpButton = page
		.getByRole("button", { name: "Jump forward (or next bookmark)" })
		.first();
	for (let i = 0; i < 3; i += 1) {
		await jumpButton.click({ timeout: 5000 }).catch(() => undefined);
		await page.waitForTimeout(400);
	}
	await page.waitForTimeout(600);
	const v4 = await forensic("V4-jump-forward-button");
	expect(v4.stateCount === 2, "V4: state intact after jump-forward");
	expect(v4.domClips === 2, "V4: both clips mounted after jump-forward");
	const playheadInViewport = await page.evaluate(() => {
		const playhead = document.querySelector(
			'[aria-label="Timeline playhead"]',
		);
		if (!playhead) return null;
		const rect = playhead.getBoundingClientRect();
		return {
			inViewport: rect.x >= 300 && rect.right <= 1450,
			ariaValueNow: playhead.getAttribute("aria-valuenow"),
		};
	});
	expect(
		playheadInViewport?.inViewport === true,
		"V4: playhead visible inside the timeline viewport",
	);
	expect(
		Number(playheadInViewport?.ariaValueNow) > 0,
		"V4: playhead time actually advanced (real seek, not a no-op)",
	);
	push({ check: "V4: playhead aria-valuenow", value: playheadInViewport?.ariaValueNow });
	await page.screenshot({ path: `${DIR}/screenshots/V4-fixed.png` });

	push({ result: failures === 0 ? "ALL CHECKS PASS" : `${failures} CHECK(S) FAILED` });
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	writeFileSync(
		`${DIR}/verify-fix-report.json`,
		JSON.stringify(report, null, 2),
		"utf8",
	);
	await browser.close();
}
