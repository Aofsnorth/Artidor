/**
 * Debug round: after the in-viewport click makes clip 2 disappear (deselect
 * + borderline cull), does ANY viewport activity (scroll, forced scroll
 * event, resize) bring it back? This isolates whether the culling window
 * updates at all after the initial render.
 */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3005";
const PNG_BYTES = [
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
	0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
	0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
	0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
	0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

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
page.on("pageerror", (e) => push({ pageError: e.message }));
page.on("console", (m) => {
	if (m.type() === "error") push({ consoleError: m.text().slice(0, 200) });
});

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

const probe = async (phase) => {
	const data = await page.evaluate(() => {
		const clips = [...document.querySelectorAll(".timeline-clip")];
		const trackButtons = [...document.querySelectorAll('button[aria-label^="Select"]')].map(
			(b) => b.getAttribute("aria-label"),
		);
		let scroll = null;
		const first = clips[0];
		if (first) {
			let node = first.parentElement;
			while (node && node !== document.body) {
				const style = getComputedStyle(node);
				if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
					scroll = {
						tag: node.className.slice(0, 40),
						scrollLeft: node.scrollLeft,
						clientWidth: node.clientWidth,
						clientHeight: node.clientHeight,
						scrollWidth: node.scrollWidth,
					};
					break;
				}
				node = node.parentElement;
			}
		}
		return { domClips: clips.length, trackButtons, scroll };
	});
	const state = await run("list_elements");
	push({ phase, ...data, stateCount: state?.data?.elements?.length ?? 0 });
};

try {
	await page.goto(`${BASE}/editor/timeline-seek-debug`, {
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
	await probe("setup");

	// Step 1: the disappearing click (in-viewport, empty track area).
	await page.mouse.click(600, clip1Rect.y + clip1Rect.height / 2, { delay: 40 });
	await page.waitForTimeout(500);
	await probe("after-click");

	// Step 2: manual scroll (JS assignment) — does culling re-evaluate?
	await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		let node = clip?.parentElement;
		while (node && node !== document.body) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
				node.scrollLeft = 945;
				return;
			}
			node = node.parentElement;
		}
	});
	await page.waitForTimeout(800);
	await probe("after-manual-scroll-945");

	// Step 3: force-dispatch a scroll event on that node.
	await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		let node = clip?.parentElement;
		while (node && node !== document.body) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
				node.dispatchEvent(new Event("scroll"));
				return;
			}
			node = node.parentElement;
		}
	});
	await page.waitForTimeout(800);
	await probe("after-forced-scroll-event");

	// Step 4: scroll back to 0 and forth again (real user behavior).
	await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		let node = clip?.parentElement;
		while (node && node !== document.body) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
				node.scrollLeft = 0;
				return;
			}
			node = node.parentElement;
		}
	});
	await page.waitForTimeout(800);
	await probe("after-scroll-back-0");

	await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		let node = clip?.parentElement;
		while (node && node !== document.body) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)) {
				node.scrollLeft = 1400;
				return;
			}
			node = node.parentElement;
		}
	});
	await page.waitForTimeout(800);
	await probe("after-scroll-1400");
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	await browser.close();
}
