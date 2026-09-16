/**
 * Reproduction round 2 — broader variation coverage for "second clip
 * disappears after quickly clicking to seek forward".
 *
 * Each variation boots a FRESH throwaway project and drops two adjacent
 * image clips (0-5s, 5-10s), then performs the variation's interaction and
 * reports editor state vs DOM clip count after every step.
 *
 *  A. Zoomed-in seek clicks past the right edge (playhead auto-scroll fires).
 *  B. Rapid ruler clicks.
 *  C. Rapid clicks ON the second clip itself.
 *  D. Playhead scrub-drag quickly forward.
 *  E. Rapid sloppy clicks ON the second clip with small drag jitter
 *     (crosses the drag threshold -> real move commits).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3005";
const DIR = "features/timeline-seek-clip-disappear";
const SHOTS = `${DIR}/screenshots`;
mkdirSync(SHOTS, { recursive: true });

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

/** Shared helpers bound to a page. */
const makeKit = (page) => ({
	run: (name, args = {}) =>
		page.evaluate(async ([n, a]) => {
			const api = window.__ARTIDOR_API__;
			return await api.run(n, a);
		}, [name, args]),

	listElements: async (kit) => {
		const result = await kit.run("list_elements");
		return result?.data?.elements ?? [];
	},

	snapshot: async (kit, phase) => {
		const elements = await kit.listElements(kit);
		const domClips = await page.locator(".timeline-clip").count();
		const scroll = await page
			.evaluate(() => {
				const clip = document.querySelector(".timeline-clip");
				if (!clip) return null;
				let node = clip.parentElement;
				while (node && node !== document.body) {
					const style = getComputedStyle(node);
					if (
						/(auto|scroll)/.test(`${style.overflowX}${style.overflowY}`)
					) {
						return {
							scrollLeft: node.scrollLeft,
							clientWidth: node.clientWidth,
							scrollWidth: node.scrollWidth,
						};
					}
					node = node.parentElement;
				}
				return null;
			})
			.catch(() => null);
		const entry = { phase, stateCount: elements.length, domClips, scroll };
		if (elements.length !== 2 || domClips !== 2) {
			entry.elements = elements;
		}
		push(entry);
		return { elements, domClips };
	},

	dropFile: ({ fileName, x, y }) =>
		page.evaluate(
			({ fileName, x, y, png }) => {
				const file = new File([Uint8Array.from(png)], fileName, {
					type: "image/png",
				});
				const dt = new DataTransfer();
				dt.items.add(file);
				const section = document.querySelector(
					'section[aria-label="Timeline"]',
				);
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
		),
});

/** Boot a fresh project, drop two adjacent image clips, return geometry. */
const setupProject = async (context, projectId) => {
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error" && !message.text().includes("not found")) {
			errors.push(message.text().slice(0, 300));
		}
	});
	const kit = makeKit(page);

	await page.goto(`${BASE}/editor/${projectId}`, {
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

	// Drop clip 1 onto the main track row.
	const mainTrack = page.locator('button[aria-label^="Select Main"]').first();
	await mainTrack.waitFor({ state: "visible", timeout: 10_000 });
	const mainRect = await mainTrack.boundingBox();
	await kit.dropFile({
		fileName: "Screenshot-135.png",
		x: mainRect.x + 60,
		y: mainRect.y + mainRect.height / 2,
	});
	await page.waitForTimeout(2500);

	// Drop clip 2 adjacent to clip 1.
	const clip1 = page.locator(".timeline-clip").first();
	await clip1.waitFor({ state: "visible", timeout: 10_000 });
	const clip1Rect = await clip1.boundingBox();
	await kit.dropFile({
		fileName: "Screenshot-136.png",
		x: clip1Rect.x + clip1Rect.width + 12,
		y: clip1Rect.y + clip1Rect.height / 2,
	});
	await page.waitForTimeout(2500);

	const check = await kit.snapshot(kit, `${projectId}:setup`);
	const clip2 = page.locator(".timeline-clip").nth(1);
	const clip2Rect = (await clip2.count()) === 2 ? await clip2.boundingBox() : null;

	return {
		page,
		kit,
		errors,
		mainRect,
		clip1Rect,
		clip2Rect,
		pps: clip1Rect.width / 5,
		contentLeft: clip1Rect.x,
		ok: check.elements.length === 2 && check.domClips === 2,
	};
};

const shot = (page, name) =>
	page.screenshot({ path: `${SHOTS}/${name}.png` }).catch(() => undefined);

try {
	// ────────────────────────────────────────────────────────────────
	// Variation A: zoomed in + seek clicks past the right edge
	// ────────────────────────────────────────────────────────────────
	{
		const v = await setupProject(
			browser.newContext === browser.newContext
				? await browser.newContext({
						viewport: { width: 1440, height: 960 },
						reducedMotion: "reduce",
					})
				: null,
			"timeline-seek-repro-a",
		);
		if (!v.ok) {
			push({ variation: "A", phase: "setup-failed" });
		} else {
			const { page, kit } = v;
			// Zoom in ~4 times via the toolbar button.
			for (let i = 0; i < 4; i += 1) {
				await page
					.getByRole("button", { name: /zoom in/i })
					.first()
					.click({ timeout: 5000 })
					.catch(() => undefined);
				await page.waitForTimeout(300);
			}
			await page.waitForTimeout(500);
			// Re-measure geometry after zoom.
			const clip1Rect = await page.locator(".timeline-clip").first().boundingBox();
			const pps = clip1Rect.width / 5;
			const times = [2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.4, 5.8, 6.4, 7.0, 7.6, 8.2];
			let anomaly = null;
			for (const [index, seconds] of times.entries()) {
				await page.mouse.click(v.contentLeft + seconds * pps, v.clip1Rect.y + v.clip1Rect.height / 2, {
					delay: 30,
				});
				await page.waitForTimeout(100);
				const snap = await kit.snapshot(kit, `A:click-${index + 1}@${seconds}s`);
				if (snap.elements.length !== 2 || snap.domClips !== 2) {
					anomaly = { click: index + 1, seconds };
					await shot(page, "A-anomaly");
					break;
				}
			}
			push({ variation: "A", result: anomaly ? `ANOMALY at ${JSON.stringify(anomaly)}` : "intact" });
			await shot(page, "A-final");
			await v.page.close();
		}
	}

	// ────────────────────────────────────────────────────────────────
	// Variation B: rapid ruler clicks
	// ────────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 960 },
			reducedMotion: "reduce",
		});
		await context.addInitScript(() => {
			if (location.origin === "http://127.0.0.1:3005") {
				localStorage.setItem("hasSeenOnboarding", "true");
			}
		});
		const v = await setupProject(context, "timeline-seek-repro-b");
		if (!v.ok) {
			push({ variation: "B", phase: "setup-failed" });
		} else {
			const { page, kit } = v;
			// Ruler is the strip above the track rows.
			const ruler = page.locator("section[aria-label='Timeline'] [class*='cursor-']").first();
			const rulerBox = await page.evaluate(() => {
				const section = document.querySelector('section[aria-label="Timeline"]');
				const scroller = section?.querySelector(".scrollbar-thin");
				return scroller ? scroller.getBoundingClientRect().top : null;
			});
			const rulerY = (rulerBox ?? v.clip1Rect.y) - 12;
			let anomaly = null;
			for (const [index, seconds] of [5.1, 5.5, 5.9, 6.3, 6.7, 7.1].entries()) {
				await page.mouse.click(v.contentLeft + seconds * v.pps, Math.max(rulerY, 10), {
					delay: 30,
				});
				await page.waitForTimeout(100);
				const snap = await kit.snapshot(kit, `B:click-${index + 1}@${seconds}s`);
				if (snap.elements.length !== 2 || snap.domClips !== 2) {
					anomaly = { click: index + 1, seconds };
					await shot(page, "B-anomaly");
					break;
				}
			}
			push({ variation: "B", result: anomaly ? `ANOMALY at ${JSON.stringify(anomaly)}` : "intact" });
			await v.page.close();
			await context.close();
		}
	}

	// ────────────────────────────────────────────────────────────────
	// Variation C: rapid clicks ON the second clip
	// ────────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 960 },
			reducedMotion: "reduce",
		});
		await context.addInitScript(() => {
			if (location.origin === "http://127.0.0.1:3005") {
				localStorage.setItem("hasSeenOnboarding", "true");
			}
		});
		const v = await setupProject(context, "timeline-seek-repro-c");
		if (!v.ok) {
			push({ variation: "C", phase: "setup-failed" });
		} else {
			const { page, kit } = v;
			const cx = v.clip2Rect.x + v.clip2Rect.width / 2;
			const cy = v.clip2Rect.y + v.clip2Rect.height / 2;
			let anomaly = null;
			for (let i = 0; i < 6; i += 1) {
				await page.mouse.click(cx, cy, { delay: 25 });
				await page.waitForTimeout(90);
				const snap = await kit.snapshot(kit, `C:click-${i + 1}`);
				if (snap.elements.length !== 2 || snap.domClips !== 2) {
					anomaly = { click: i + 1 };
					await shot(page, "C-anomaly");
					break;
				}
			}
			push({ variation: "C", result: anomaly ? `ANOMALY at ${JSON.stringify(anomaly)}` : "intact" });
			await v.page.close();
			await context.close();
		}
	}

	// ────────────────────────────────────────────────────────────────
	// Variation D: playhead scrub-drag quickly forward
	// ────────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 960 },
			reducedMotion: "reduce",
		});
		await context.addInitScript(() => {
			if (location.origin === "http://127.0.0.1:3005") {
				localStorage.setItem("hasSeenOnboarding", "true");
			}
		});
		const v = await setupProject(context, "timeline-seek-repro-d");
		if (!v.ok) {
			push({ variation: "D", phase: "setup-failed" });
		} else {
			const { page, kit } = v;
			// Drag across the ruler from 0s to ~7.5s quickly.
			const rulerY = v.clip1Rect.y - 24;
			await page.mouse.move(v.contentLeft, rulerY);
			await page.mouse.down();
			for (const seconds of [1, 2, 3, 4, 5, 6, 7, 7.5]) {
				await page.mouse.move(v.contentLeft + seconds * v.pps, rulerY, {
					steps: 2,
				});
				await page.waitForTimeout(40);
			}
			await page.mouse.up();
			await page.waitForTimeout(400);
			const snap = await kit.snapshot(kit, "D:after-scrub");
			push({
				variation: "D",
				result: snap.elements.length === 2 && snap.domClips === 2 ? "intact" : "ANOMALY",
			});
			await shot(page, "D-final");
			await v.page.close();
			await context.close();
		}
	}

	// ────────────────────────────────────────────────────────────────
	// Variation E: sloppy rapid clicks on clip 2 with drag jitter
	// ────────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 960 },
			reducedMotion: "reduce",
		});
		await context.addInitScript(() => {
			if (location.origin === "http://127.0.0.1:3005") {
				localStorage.setItem("hasSeenOnboarding", "true");
			}
		});
		const v = await setupProject(context, "timeline-seek-repro-e");
		if (!v.ok) {
			push({ variation: "E", phase: "setup-failed" });
		} else {
			const { page, kit } = v;
			const cx = v.clip2Rect.x + v.clip2Rect.width * 0.25;
			const cy = v.clip2Rect.y + v.clip2Rect.height / 2;
			let anomaly = null;
			for (let i = 0; i < 5; i += 1) {
				// mousedown on the clip, jitter 8px right then 8px down, release.
				await page.mouse.move(cx, cy);
				await page.mouse.down();
				await page.mouse.move(cx + 8, cy + 8, { steps: 3 });
				await page.mouse.up();
				await page.waitForTimeout(250);
				const snap = await kit.snapshot(kit, `E:jitter-${i + 1}`);
				if (snap.elements.length !== 2 || snap.domClips !== 2) {
					anomaly = { round: i + 1 };
					await shot(page, "E-anomaly");
					break;
				}
			}
			push({ variation: "E", result: anomaly ? `ANOMALY at ${JSON.stringify(anomaly)}` : "intact" });
			await shot(page, "E-final");
			await v.page.close();
			await context.close();
		}
	}
} finally {
	writeFileSync(`${DIR}/repro2-report.json`, JSON.stringify(report, null, 2), "utf8");
	await browser.close();
}
