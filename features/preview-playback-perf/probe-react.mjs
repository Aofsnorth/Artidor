/**
 * React re-render storm probe.
 *
 * Answers: what re-renders 60x/second while the timeline plays, and does it
 * stop when nothing is selected?
 *
 * Measures the same window twice — with the clip selected (properties panel
 * live) and after `clear_selection` — and reports per-component render counts
 * plus the DOM state (open popovers, option counts) for each window.
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
const LABEL = process.env.PROBE_LABEL ?? "react";
const SECONDS = Number(process.env.PROBE_SECONDS ?? 4);

const result = { label: LABEL, phases: {}, console: [] };

function installInstrumentation() {
	const w = window;
	const perf = { recording: false, renderCounts: new Map(), commits: 0 };
	w.__probe = perf;

	const COMPOSITE_TAGS = new Set([0, 1, 11, 14, 15]);
	const fiberName = (fiber) => {
		const type = fiber.type;
		if (!type) return null;
		if (typeof type === "function") return type.displayName || type.name || "(anon)";
		if (typeof type === "object") {
			if (type.displayName) return type.displayName;
			const inner = type.type || type.render;
			if (inner) return inner.displayName || inner.name || "(anon)";
		}
		return null;
	};
	const walkCommit = (rootFiber) => {
		const stack = [rootFiber];
		while (stack.length > 0) {
			const fiber = stack.pop();
			const previous = fiber.alternate;
			if (COMPOSITE_TAGS.has(fiber.tag)) {
				const rendered = previous === null || (fiber.flags & 1) === 1;
				if (rendered) {
					const name = fiberName(fiber);
					if (name) perf.renderCounts.set(name, (perf.renderCounts.get(name) ?? 0) + 1);
				}
			}
			if (previous !== null && fiber.child === previous.child) continue;
			let child = fiber.child;
			while (child) {
				stack.push(child);
				child = child.sibling;
			}
		}
	};
	w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
		renderers: new Map(),
		supportsFiber: true,
		isDisabled: false,
		inject(renderer) {
			const id = this.renderers.size + 1;
			this.renderers.set(id, renderer);
			return id;
		},
		onCommitFiberRoot(_id, root) {
			if (!perf.recording) return;
			perf.commits++;
			try {
				walkCommit(root.current);
			} catch {
				// never break the app under test
			}
		},
		onCommitFiberUnmount() {},
		onPostCommitFiberRoot() {},
		onScheduleFiberRoot() {},
		setStrictMode() {},
		checkDCE() {},
	};
}

function dumpDom() {
	const q = (sel) => document.querySelectorAll(sel).length;
	const openStates = [
		...document.querySelectorAll('[data-state="open"]'),
	]
		.map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute("role") ?? el.className.toString().split(" ")[0]}]`)
		.slice(0, 25);
	return {
		totalElements: q("*"),
		roleOption: q('[role="option"]'),
		roleListbox: q('[role="listbox"]'),
		popperWrapper: q('[data-radix-popper-content-wrapper]'),
		openStateCount: openStates.length,
		openStates,
		canvasCount: q("canvas"),
	};
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

async function measure(page, { play }) {
	if (play) {
		const playButton = page.locator('button[aria-label="Play"]').first();
		if (await playButton.count()) await playButton.click();
		else await page.keyboard.press("Space");
		await page.waitForTimeout(700);
	}
	const raw = await page.evaluate(async (seconds) => {
		const p = window.__probe;
		p.renderCounts = new Map();
		p.commits = 0;
		p.recording = true;
		const started = performance.now();
		await new Promise((r) => setTimeout(r, seconds * 1000));
		p.recording = false;
		const elapsed = (performance.now() - started) / 1000;
		const q = (sel) => document.querySelectorAll(sel).length;
		return {
			elapsed,
			commits: p.commits,
			renderCounts: [...p.renderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
			dom: {
				totalElements: q("*"),
				roleOption: q('[role="option"]'),
				roleListbox: q('[role="listbox"]'),
				popperWrapper: q('[data-radix-popper-content-wrapper]'),
				openStateCount: q('[data-state="open"]'),
				canvasCount: q("canvas"),
			},
		};
	}, SECONDS);
	if (play) {
		const pause = page.locator('button[aria-label="Pause"]').first();
		if (await pause.count()) await pause.click();
		await page.waitForTimeout(400);
	}
	return {
		windowSeconds: +raw.elapsed.toFixed(2),
		commitsPerSec: +(raw.commits / raw.elapsed).toFixed(1),
		rendersPerSec: raw.renderCounts.map(([name, count]) => ({
			name,
			perSec: +(count / raw.elapsed).toFixed(1),
		})),
		dom: raw.dom,
	};
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
		if (msg.type() === "error") result.console.push({ type: "error", text: msg.text().slice(0, 240) });
	});
	page.on("pageerror", (err) => result.console.push({ type: "pageerror", text: String(err).slice(0, 300) }));

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

	result.phases.idleSelected = await measure(page, { play: false });
	result.phases.playingSelected = await measure(page, { play: true });

	await page.evaluate(() => window.__ARTIDOR_API__?.run("clear_selection"));
	await page.waitForTimeout(600);
	result.phases.idleDeselected = await measure(page, { play: false });
	result.phases.playingDeselected = await measure(page, { play: true });

	await page.screenshot({ path: fileURLToPath(new URL(`./shot-${LABEL}.png`, import.meta.url)) });
} catch (error) {
	result.error = String(error?.stack ?? error).slice(0, 1200);
} finally {
	writeFileSync(new URL(`./result-${LABEL}.json`, import.meta.url), JSON.stringify(result, null, 2));
	await browser.close();
}

for (const [phase, data] of Object.entries(result.phases)) {
	console.log(
		`[${phase}] commits ${data.commitsPerSec}/s | options ${data.dom.roleOption} | popper ${data.dom.popperWrapper} | open ${data.dom.openStateCount} | elements ${data.dom.totalElements}`,
	);
	console.log(`   top: ${data.rendersPerSec.slice(0, 10).map((r) => `${r.name} ${r.perSec}/s`).join(", ")}`);
}
