/**
 * Fiber-level probe: walk up the React fiber tree from a rendered clip and
 * dump the actual `scrollWindow` prop that TimelineTrackContent receives,
 * plus the scroll container metrics. This reveals whether the culling
 * window is stale (width 0) and whether it updates after scroll.
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

/** Find the fiber that receives a `scrollWindow` prop near the clips. */
const probeWindow = async (phase) => {
	const data = await page.evaluate(() => {
		const clip = document.querySelector(".timeline-clip");
		if (!clip) return { error: "no clip" };
		const fiberKey = Object.keys(clip).find((k) => k.startsWith("__reactFiber$"));
		if (!fiberKey) return { error: "no fiber key" };
		let fiber = clip[fiberKey];
		let found = null;
		let depth = 0;
		while (fiber && depth < 60) {
			const props = fiber.memoizedProps;
			if (props && typeof props === "object" && "scrollWindow" in props) {
				found = {
					displayName:
						fiber.type?.displayName ??
						fiber.type?.name ??
						(fiber.tag === 6 ? "HostText" : `tag:${fiber.tag}`),
					scrollWindow: props.scrollWindow,
					viewportWidth: props.viewportWidth,
					zoomLevel: props.zoomLevel,
					elementCount: props.track?.elements?.length,
					elementStarts: props.track?.elements?.map((el) => el.startTime),
				};
				break;
			}
			fiber = fiber.return;
			depth += 1;
		}

		// Also grab the scroll container metrics.
		let node = clip.parentElement;
		let scroll = null;
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
		return {
			domClips: document.querySelectorAll(".timeline-clip").length,
			found,
			scroll,
		};
	});
	push({ phase, ...data });
	return data;
};

try {
	await page.goto(`${BASE}/editor/timeline-seek-fiber`, {
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

	await probeWindow("after-insert");

	// The disappearing click.
	await page.mouse.click(600, clip1Rect.y + clip1Rect.height / 2, { delay: 40 });
	await page.waitForTimeout(500);
	await probeWindow("after-click");

	// Scroll and re-probe.
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
	await probeWindow("after-scroll-945");
} catch (error) {
	push({ phase: "fatal", message: error.message });
} finally {
	await browser.close();
}
