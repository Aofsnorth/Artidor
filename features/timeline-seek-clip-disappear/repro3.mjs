/**
 * Forensic confirmation of the disappearing-clip chain:
 *
 *  H1: After insert, clip 2 is SELECTED -> culling bypass keeps it mounted
 *      even when it sits outside the scroll window.
 *  H2: A single in-viewport click-to-seek on empty track clears the
 *      selection -> clip 2 (outside window) unmounts -> "disappears".
 *  H3: The viewport never auto-scrolls on a paused seek, so the user sees
 *      clip 1 intact + clip 2 gone with zero scroll context.
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

const forensic = async (phase) => {
	const data = await page.evaluate(() => {
		const clips = [...document.querySelectorAll(".timeline-clip")];
		const selected = clips.filter((clip) =>
			clip.className.includes("border-primary"),
		);
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
		// Playhead element position.
		const playhead = document.querySelector(
			'section[aria-label="Timeline"] [style*="left"]',
		);
		return {
			domClips: clips.length,
			selectedClips: selected.length,
			clipRects: clips.map((clip) => {
				const rect = clip.getBoundingClientRect();
				return {
					x: Math.round(rect.x),
					width: Math.round(rect.width),
					name: clip.textContent?.slice(0, 30) ?? "",
				};
			}),
			scroll,
			playheadLeft: playhead ? playhead.style.left : null,
		};
	});
	const state = await run("list_elements");
	push({
		phase,
		...data,
		stateCount: state?.data?.elements?.length ?? 0,
	});
	return data;
};

try {
	await page.goto(`${BASE}/editor/timeline-seek-repro-f`, {
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

	// H1: right after the second drop (before any click).
	await forensic("H1:after-insert");

	// Zoom in so clip 2 falls outside the pixel scroll window.
	for (let i = 0; i < 4; i += 1) {
		await page
			.getByRole("button", { name: /zoom in/i })
			.first()
			.click({ timeout: 5000 })
			.catch(() => undefined);
		await page.waitForTimeout(300);
	}
	await page.waitForTimeout(600);
	const zoomed = await forensic("H2:after-zoom");

	// H2/H3: ONE in-viewport click on the empty image-track row, left of
	// clip 2, inside the browser window (x=600).
	const trackY = clip1Rect.y + clip1Rect.height / 2;
	await page.mouse.click(600, trackY, { delay: 40 });
	await page.waitForTimeout(400);
	await forensic("H3:after-single-seek-click");
	await page.screenshot({
		path: `${DIR}/screenshots/F-forensic.png`,
	});

	// Control: scrolling right manually should bring clip 2 back.
	await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		let node = clip?.parentElement;
		while (node && node !== document.body) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
				node.scrollLeft = 3000;
				return;
			}
			node = node.parentElement;
		}
	});
	await page.waitForTimeout(500);
	await forensic("control:after-manual-scroll");
	await page.screenshot({
		path: `${DIR}/screenshots/F-forensic-scrolled.png`,
	});
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	writeFileSync(
		`${DIR}/repro3-report.json`,
		JSON.stringify(report, null, 2),
		"utf8",
	);
	await browser.close();
}
