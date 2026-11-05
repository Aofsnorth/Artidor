/**
 * Re-render attribution probe.
 *
 * The render-count probe answers "what re-renders"; this one answers "which
 * subtree drives it". For every commit it records, per component name, the
 * ancestor path (component names up the fiber tree) of the first instance that
 * rendered, plus how many instances rendered. One stable sample is enough to
 * name the churning subtree and its owner.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3005";
const VIDEO =
	process.env.PROBE_VIDEO ??
	join(tmpdir(), "artidor-qa", "sample-1080p60.mp4").replaceAll("\\", "/");
const LABEL = process.env.PROBE_LABEL ?? "attrib";
const SECONDS = Number(process.env.PROBE_SECONDS ?? 3);
const DESELECT = process.env.PROBE_DESELECT !== "0";

const result = { label: LABEL, deselect: DESELECT, phases: {} };

function installInstrumentation() {
	const w = window;
	const perf = { recording: false, stats: new Map(), commits: 0 };
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
	const pathOf = (fiber) => {
		const parts = [];
		let node = fiber.return;
		let depth = 0;
		while (node && depth < 40) {
			const name = fiberName(node);
			if (name) parts.push(name);
			node = node.return;
			depth++;
		}
		return parts.reverse().join(" > ");
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
					if (name) {
						let entry = perf.stats.get(name);
						if (!entry) {
							entry = { count: 0, path: pathOf(fiber), instances: new Set() };
							perf.stats.set(name, entry);
						}
						entry.count++;
						entry.instances.add(fiber);
					}
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

async function measure(page, phase) {
	const raw = await page.evaluate(async (seconds) => {
		const p = window.__probe;
		p.stats = new Map();
		p.commits = 0;
		p.recording = true;
		const started = performance.now();
		await new Promise((r) => setTimeout(r, seconds * 1000));
		p.recording = false;
		const elapsed = (performance.now() - started) / 1000;
		return {
			elapsed,
			commits: p.commits,
			stats: [...p.stats.entries()]
				.sort((a, b) => b[1].count - a[1].count)
				.slice(0, 22)
				.map(([name, s]) => ({
					name,
					count: s.count,
					perSec: +(s.count / elapsed).toFixed(1),
					instances: s.instances.size,
					path: s.path,
				})),
		};
	}, SECONDS);
	return { phase, commitsPerSec: +(raw.commits / raw.elapsed).toFixed(1), stats: raw.stats };
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

	// Paused baseline (selection as-is).
	result.phases.pausedSelected = await measure(page, "pausedSelected");

	if (DESELECT) {
		await page.evaluate(() => window.__ARTIDOR_API__?.run("clear_selection"));
		await page.waitForTimeout(600);
	}

	// Playback window.
	await page.evaluate(() => window.__ARTIDOR_API__?.run("seek", { time: 0 }));
	await page.waitForTimeout(300);
	const playButton = page.locator('button[aria-label="Play"]').first();
	if (await playButton.count()) await playButton.click();
	else await page.keyboard.press("Space");
	await page.waitForTimeout(1200);
	result.phases.playing = await measure(page, "playing");
	const pause = page.locator('button[aria-label="Pause"]').first();
	if (await pause.count()) await pause.click();
} catch (error) {
	result.error = String(error?.stack ?? error).slice(0, 1200);
} finally {
	writeFileSync(new URL(`./result-${LABEL}.json`, import.meta.url), JSON.stringify(result, null, 2));
	await browser.close();
}

for (const [phase, data] of Object.entries(result.phases)) {
	console.log(`\n=== ${phase} — ${data.commitsPerSec} commits/s ===`);
	for (const s of data.stats) {
		console.log(`  ${s.perSec}/s x${s.instances}  ${s.name}`);
		console.log(`      ${s.path}`);
	}
}
