/**
 * Preview playback / scrub performance probe.
 *
 * Creates a fresh project in the running dev server, imports a real video
 * through the app's own import UI, drops it on the timeline, then measures
 * what the user actually feels while it plays:
 *
 *   - rAF cadence (main-thread frame intervals → jank / dropped frames)
 *   - preview presents per second (2D blits onto the visible preview canvas)
 *   - distinct decoded source frames shown per second (video-cache stats)
 *   - Long Animation Frames with script attribution
 *   - a sampled CPU profile (self time per function and per bundle)
 *   - the dev-mode render phase averages (resolve/descriptor/composite/blit)
 *
 * Usage (dev server must already listen on PROBE_BASE):
 *   node features/preview-playback-perf/probe.mjs
 * Env:
 *   PROBE_BASE     default http://localhost:3005
 *   PROBE_VIDEO    default %TEMP%/artidor-qa/sample-1080p60.mp4
 *   PROBE_LABEL    output file suffix (default "run")
 *   PROBE_SECONDS  measured playback window (default 6)
 *   PROBE_CHANNEL  playwright browser channel (default "chrome")
 *   PROBE_QUALITY  optional preview quality to force (auto|high|medium|low|ultra)
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
const LABEL = process.env.PROBE_LABEL ?? "run";
const SECONDS = Number(process.env.PROBE_SECONDS ?? 6);
const CHANNEL = process.env.PROBE_CHANNEL ?? "chrome";
const QUALITY = process.env.PROBE_QUALITY ?? null;

const result = {
	label: LABEL,
	video: VIDEO,
	channel: CHANNEL,
	quality: QUALITY,
	console: [],
	setup: {},
	playback: null,
	scrub: null,
};

function log(...args) {
	console.log("[probe:%s]", LABEL, ...args);
}

/** Runs in the page before any app script. */
function installInstrumentation() {
	const w = window;
	const perf = {
		recording: false,
		rafIntervals: [],
		loafs: [],
		previewCanvas: null,
		previewDraws: 0,
		presentedDistinct: 0,
		lastPresentedTs: null,
		frameTsChanges: 0,
		lastFrameTs: null,
		frameTsSamples: 0,
		renderCounts: new Map(),
		commits: 0,
	};
	w.__probe = perf;

	// React commit observer. A minimal devtools hook: React DOM injects into
	// it at module init and reports every commit. For each commit, count the
	// composite components that actually executed their render function
	// (PerformedWork flag), skipping subtrees React bailed out of entirely.
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
				// A malformed fiber must never break the app under test.
			}
		},
		onCommitFiberUnmount() {},
		onPostCommitFiberRoot() {},
		onScheduleFiberRoot() {},
		setStrictMode() {},
		checkDCE() {},
	};

	try {
		new PerformanceObserver((list) => {
			if (!perf.recording) return;
			for (const e of list.getEntries()) {
				const end = e.startTime + e.duration;
				perf.loafs.push({
					start: e.startTime,
					dur: e.duration,
					block: e.blockingDuration,
					renderMs: e.renderStart ? end - e.renderStart : 0,
					styleLayoutMs: e.styleAndLayoutStart ? end - e.styleAndLayoutStart : 0,
					scripts: (e.scripts ?? []).map((s) => ({
						dur: s.duration,
						invoker: String(s.invoker ?? "").slice(0, 80),
						type: s.invokerType,
						src: String(s.sourceURL ?? "").split("/").pop()?.slice(0, 80),
						fn: s.sourceFunctionName,
						forcedLayout: s.forcedStyleAndLayoutDuration,
					})),
				});
			}
		}).observe({ type: "long-animation-frame", buffered: false });
	} catch {
		// LoAF unsupported — the rAF cadence still tells the story.
	}

	const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
	CanvasRenderingContext2D.prototype.drawImage = function (...args) {
		if (perf.recording && this.canvas === perf.previewCanvas) {
			perf.previewDraws++;
			// Distinct decoded frames actually presented: the video-cache's
			// current frame at blit time, counted when it changes.
			const ts = w.__ARTIDOR_DEBUG__?.videoCacheStats?.()?.sinks?.[0]?.currentFrameTs ?? null;
			if (ts !== null && ts !== perf.lastPresentedTs) {
				perf.presentedDistinct++;
				perf.lastPresentedTs = ts;
			}
		}
		return originalDrawImage.apply(this, args);
	};

	let last = 0;
	const tick = (now) => {
		if (perf.recording) {
			if (last) perf.rafIntervals.push(now - last);
			last = now;
			const stats = w.__ARTIDOR_DEBUG__?.videoCacheStats?.();
			const ts = stats?.sinks?.[0]?.currentFrameTs ?? null;
			perf.frameTsSamples++;
			if (ts !== null && ts !== perf.lastFrameTs) {
				perf.frameTsChanges++;
				perf.lastFrameTs = ts;
			}
		} else {
			last = 0;
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

function summarizeIntervals(intervals) {
	if (intervals.length === 0) return null;
	const sorted = [...intervals].sort((a, b) => a - b);
	const sum = intervals.reduce((a, b) => a + b, 0);
	const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
	return {
		frames: intervals.length,
		meanMs: +(sum / intervals.length).toFixed(2),
		fps: +((1000 * intervals.length) / sum).toFixed(1),
		p50: +pct(0.5).toFixed(2),
		p95: +pct(0.95).toFixed(2),
		p99: +pct(0.99).toFixed(2),
		max: +sorted.at(-1).toFixed(2),
		over20ms: intervals.filter((v) => v > 20).length,
		over33ms: intervals.filter((v) => v > 33.4).length,
		over50ms: intervals.filter((v) => v > 50).length,
	};
}

function summarizeLoafs(loafs, windowMs) {
	const scripts = new Map();
	let total = 0;
	let blocking = 0;
	let render = 0;
	let styleLayout = 0;
	for (const loaf of loafs) {
		total += loaf.dur;
		blocking += loaf.block;
		render += loaf.renderMs;
		styleLayout += loaf.styleLayoutMs;
		for (const s of loaf.scripts) {
			const key = `${s.fn || "(anon)"} @ ${s.src || "?"} [${s.type}:${s.invoker}]`;
			const entry = scripts.get(key) ?? { key, dur: 0, count: 0, forcedLayout: 0 };
			entry.dur += s.dur;
			entry.count += 1;
			entry.forcedLayout += s.forcedLayout ?? 0;
			scripts.set(key, entry);
		}
	}
	return {
		count: loafs.length,
		perSecond: +((loafs.length * 1000) / windowMs).toFixed(2),
		totalMs: Math.round(total),
		blockingMs: Math.round(blocking),
		renderMs: Math.round(render),
		styleLayoutMs: Math.round(styleLayout),
		topScripts: [...scripts.values()]
			.sort((a, b) => b.dur - a.dur)
			.slice(0, 15)
			.map((s) => ({ ...s, dur: Math.round(s.dur), forcedLayout: Math.round(s.forcedLayout) })),
	};
}

function summarizeProfile(profile) {
	const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
	const self = new Map();
	const bundles = new Map();
	const deltas = profile.timeDeltas ?? [];
	let totalUs = 0;
	for (let i = 0; i < profile.samples.length; i++) {
		const node = nodes.get(profile.samples[i]);
		const dt = deltas[i] ?? 0;
		totalUs += dt;
		if (!node) continue;
		const cf = node.callFrame;
		const file = (cf.url || "").split("/").pop() || "";
		const key = `${cf.functionName || "(anon)"} @ ${file}:${cf.lineNumber + 1}`;
		self.set(key, (self.get(key) ?? 0) + dt);
		let bundle = "other";
		if (!cf.url) bundle = cf.functionName || "(native)";
		else if (/react-dom|react_dom|scheduler/i.test(cf.url)) bundle = "react-dom";
		else if (/mediabunny/i.test(cf.url)) bundle = "mediabunny";
		else if (/artidor_wasm|wasm/i.test(cf.url)) bundle = "artidor-wasm";
		else if (/node_modules/i.test(cf.url)) bundle = "node_modules(other)";
		else if (/apps_web_src|src_/i.test(cf.url)) bundle = "app";
		bundles.set(bundle, (bundles.get(bundle) ?? 0) + dt);
	}
	const toMs = (us) => +(us / 1000).toFixed(1);
	return {
		totalMs: toMs(totalUs),
		byBundle: [...bundles.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([bundle, us]) => ({ bundle, ms: toMs(us) })),
		topSelf: [...self.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 40)
			.map(([fn, us]) => ({ fn, ms: toMs(us) })),
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

async function measurePlayback(page, cdp) {
	await page.evaluate(() => {
		const all = [...document.querySelectorAll("canvas")];
		const area = (c) => {
			const r = c.getBoundingClientRect();
			return r.width * r.height;
		};
		window.__probe.previewCanvas = all.sort((a, b) => area(b) - area(a))[0] ?? null;
	});

	// Seek to 0 and start playback.
	await page.evaluate(() => window.__ARTIDOR_API__?.run("seek", { time: 0 }));
	await page.waitForTimeout(300);
	const playButton = page.locator('button[aria-label="Play"]').first();
	if (await playButton.count()) await playButton.click();
	else await page.keyboard.press("Space");
	// Warm-up: the first second covers sink init + first decode.
	await page.waitForTimeout(1200);

	await cdp.send("Profiler.enable");
	await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
	await cdp.send("Profiler.start");
	const start = await page.evaluate(() => {
		const p = window.__probe;
		p.rafIntervals = [];
		p.loafs = [];
		p.previewDraws = 0;
		p.presentedDistinct = 0;
		p.lastPresentedTs = null;
		p.frameTsChanges = 0;
		p.frameTsSamples = 0;
		p.lastFrameTs = null;
		p.renderCounts = new Map();
		p.commits = 0;
		p.recording = true;
		return performance.now();
	});
	await page.waitForTimeout(SECONDS * 1000);
	const raw = await page.evaluate((startedAt) => {
		const p = window.__probe;
		p.recording = false;
		const elapsed = performance.now() - startedAt;
		const measure = performance.getEntriesByName("artidor.preview.render").at(-1);
		const preview = p.previewCanvas;
		return {
			elapsed,
			rafIntervals: p.rafIntervals,
			loafs: p.loafs,
			previewDraws: p.previewDraws,
			presentedDistinct: p.presentedDistinct,
			commits: p.commits,
			renderCounts: [...p.renderCounts.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 45),
			frameTsChanges: p.frameTsChanges,
			frameTsSamples: p.frameTsSamples,
			renderPhases: measure?.detail ?? null,
			previewBackingStore: preview ? { w: preview.width, h: preview.height } : null,
			cacheStats: window.__ARTIDOR_DEBUG__?.videoCacheStats?.() ?? null,
			heapMb: performance.memory
				? Math.round(performance.memory.usedJSHeapSize / 1048576)
				: null,
		};
	}, start);
	const { profile } = await cdp.send("Profiler.stop");

	const pause = page.locator('button[aria-label="Pause"]').first();
	if (await pause.count()) await pause.click();

	const seconds = raw.elapsed / 1000;
	return {
		windowMs: Math.round(raw.elapsed),
		raf: summarizeIntervals(raw.rafIntervals),
		previewPresentsPerSec: +(raw.previewDraws / seconds).toFixed(1),
		presentedDistinctPerSec: +(raw.presentedDistinct / seconds).toFixed(1),
		sourceFramesPerSec: +(raw.frameTsChanges / seconds).toFixed(1),
		reactCommitsPerSec: +(raw.commits / seconds).toFixed(1),
		reactRendersPerSec: raw.renderCounts.map(([name, count]) => ({
			name,
			perSec: +(count / seconds).toFixed(1),
		})),
		renderPhases: raw.renderPhases,
		previewBackingStore: raw.previewBackingStore,
		heapMb: raw.heapMb,
		cacheStats: raw.cacheStats
			? {
					totalSinks: raw.cacheStats.totalSinks,
					prefetchBuffered: raw.cacheStats.prefetchBuffered,
					sinks: raw.cacheStats.sinks,
				}
			: null,
		loaf: summarizeLoafs(raw.loafs, raw.elapsed),
		cpu: summarizeProfile(profile),
	};
}

async function measureScrub(page, cdp) {
	// Synthetic scrub: 120 seeks over ~2 s, alternating direction like a drag.
	await cdp.send("Profiler.start");
	const raw = await page.evaluate(async () => {
		const p = window.__probe;
		p.rafIntervals = [];
		p.loafs = [];
		p.previewDraws = 0;
		p.recording = true;
		const started = performance.now();
		const api = window.__ARTIDOR_API__;
		const TICKS = 120000;
		for (let i = 0; i < 120; i++) {
			const sec = 2 + Math.abs(Math.sin(i / 15)) * 20;
			await api?.run("seek", { time: Math.round(sec * TICKS) });
			await new Promise((r) => setTimeout(r, 16));
		}
		await new Promise((r) => setTimeout(r, 600));
		p.recording = false;
		return {
			elapsed: performance.now() - started,
			rafIntervals: p.rafIntervals,
			loafs: p.loafs,
			previewDraws: p.previewDraws,
		};
	});
	const { profile } = await cdp.send("Profiler.stop");
	return {
		windowMs: Math.round(raw.elapsed),
		raf: summarizeIntervals(raw.rafIntervals),
		previewPresents: raw.previewDraws,
		loaf: summarizeLoafs(raw.loafs, raw.elapsed),
		cpu: summarizeProfile(profile),
	};
}

/**
 * Main-thread breakdown from a Chrome trace: busy time and self time per trace
 * event name on the page's renderer main thread, plus busy time of the GPU
 * process main thread and the viz compositor thread.
 */
function summarizeTrace(buffer, windowMs) {
	const parsed = JSON.parse(buffer.toString("utf8"));
	const events = Array.isArray(parsed) ? parsed : parsed.traceEvents;
	const threadNames = new Map();
	for (const e of events) {
		if (e.ph === "M" && e.name === "thread_name") {
			threadNames.set(`${e.pid}:${e.tid}`, e.args?.name ?? "");
		}
	}
	const byThread = new Map();
	for (const e of events) {
		if (e.ph !== "X" || typeof e.dur !== "number") continue;
		const key = `${e.pid}:${e.tid}`;
		let list = byThread.get(key);
		if (!list) {
			list = [];
			byThread.set(key, list);
		}
		list.push(e);
	}
	const topLevelBusy = (list) => {
		const sorted = [...list].sort((a, b) => a.ts - b.ts || b.dur - a.dur);
		let busy = 0;
		let coveredUntil = -Infinity;
		for (const e of sorted) {
			const end = e.ts + e.dur;
			if (e.ts >= coveredUntil) {
				busy += e.dur;
				coveredUntil = end;
			} else if (end > coveredUntil) {
				busy += end - coveredUntil;
				coveredUntil = end;
			}
		}
		return busy / 1000;
	};
	const pickThread = (name) => {
		let best = null;
		for (const [key, list] of byThread) {
			if (threadNames.get(key) !== name) continue;
			const busy = topLevelBusy(list);
			if (!best || busy > best.busy) best = { key, list, busy };
		}
		return best;
	};
	const main = pickThread("CrRendererMain");
	const selfByName = new Map();
	if (main) {
		const sorted = [...main.list].sort((a, b) => a.ts - b.ts || b.dur - a.dur);
		const stack = [];
		const nodes = sorted.map((e) => ({ e, child: 0 }));
		for (const node of nodes) {
			while (stack.length > 0 && stack.at(-1).e.ts + stack.at(-1).e.dur <= node.e.ts) {
				stack.pop();
			}
			if (stack.length > 0) stack.at(-1).child += node.e.dur;
			stack.push(node);
		}
		for (const node of nodes) {
			const self = Math.max(0, node.e.dur - node.child) / 1000;
			selfByName.set(node.e.name, (selfByName.get(node.e.name) ?? 0) + self);
		}
	}
	const gpu = pickThread("CrGpuMain");
	const viz = pickThread("VizCompositorThread");
	const compositor = pickThread("Compositor");
	const pct = (ms) => +((ms / windowMs) * 100).toFixed(1);
	return {
		windowMs,
		rendererMainBusyMs: main ? Math.round(main.busy) : null,
		rendererMainBusyPct: main ? pct(main.busy) : null,
		gpuMainBusyPct: gpu ? pct(gpu.busy) : null,
		vizCompositorBusyPct: viz ? pct(viz.busy) : null,
		rendererCompositorBusyPct: compositor ? pct(compositor.busy) : null,
		mainSelfByEvent: [...selfByName.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 28)
			.map(([name, ms]) => ({ name, ms: Math.round(ms), pct: pct(ms) })),
	};
}

async function measureTrace(page, browser) {
	await page.evaluate(() => window.__ARTIDOR_API__?.run("seek", { time: 0 }));
	await page.waitForTimeout(300);
	const playButton = page.locator('button[aria-label="Play"]').first();
	if (await playButton.count()) await playButton.click();
	else await page.keyboard.press("Space");
	await page.waitForTimeout(1000);
	await browser.startTracing(page, {
		categories: [
			"toplevel",
			"devtools.timeline",
			"disabled-by-default-devtools.timeline",
			"v8.execute",
			"blink.user_timing",
		],
	});
	const started = Date.now();
	await page.waitForTimeout(4000);
	const buffer = await browser.stopTracing();
	const windowMs = Date.now() - started;
	const pause = page.locator('button[aria-label="Pause"]').first();
	if (await pause.count()) await pause.click();
	return summarizeTrace(buffer, windowMs);
}

async function measureExport(page) {
	const lines = [];
	const onConsole = (msg) => {
		const text = msg.text();
		if (/^\[export/.test(text)) lines.push(text.slice(0, 300));
	};
	page.on("console", onConsole);
	const started = Date.now();
	const response = await page.evaluate(async () => {
		const result = await window.__ARTIDOR_API__?.run("export_project", {
			format: "mp4",
			quality: "high",
			includeAudio: true,
		});
		return {
			ok: result?.ok ?? false,
			message: result?.message ?? null,
			byteLength:
				result?.data?.streamed?.byteLength ?? result?.data?.buffer?.byteLength ?? null,
		};
	});
	const wallMs = Date.now() - started;
	page.off("console", onConsole);
	await page.keyboard.press("Escape").catch(() => {});
	return { wallMs, ...response, lines };
}

const browser = await chromium.launch({
	headless: false,
	channel: CHANNEL === "chromium" ? undefined : CHANNEL,
	args: ["--window-size=1460,980", "--disable-renderer-backgrounding"],
});

try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(installInstrumentation);
	if (QUALITY) {
		// Seed the persisted zustand settings store ("app-settings") before the
		// app hydrates, so the preview starts on the requested quality tier.
		await context.addInitScript((quality) => {
			try {
				const raw = localStorage.getItem("app-settings");
				const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
				parsed.state = { ...(parsed.state ?? {}), previewQuality: quality };
				localStorage.setItem("app-settings", JSON.stringify(parsed));
			} catch {
				// Storage unavailable — the run reports quality "auto".
			}
		}, QUALITY);
	}
	const page = await context.newPage();
	page.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			result.console.push({ type: msg.type(), text: msg.text().slice(0, 240) });
		}
	});
	page.on("pageerror", (err) => {
		result.console.push({ type: "pageerror", text: String(err).slice(0, 300) });
	});
	const cdp = await context.newCDPSession(page);

	log("opening projects page");
	await page.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded", timeout: 120000 });
	await page.waitForTimeout(2500);
	await dismissDialogs(page);
	await page
		.getByRole("button", { name: /create your first project/i })
		.first()
		.click({ timeout: 30000 });
	await page.waitForSelector(".editing-screen", { timeout: 180000 });
	await page.waitForTimeout(2500);
	await dismissDialogs(page);

	log("uploading", VIDEO);
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
	await page.waitForTimeout(2500);
	result.setup.timeline = await page.evaluate(() => window.__ARTIDOR_DEBUG__?.getState?.()?.tracks ?? null);
	result.setup.canvases = await page.evaluate(() =>
		[...document.querySelectorAll("canvas")]
			.map((c) => {
				const r = c.getBoundingClientRect();
				return { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height) };
			})
			.sort((a, b) => b.cssW * b.cssH - a.cssW * a.cssH)
			.slice(0, 4),
	);

	result.setup.project = await page.evaluate(async () => {
		const info = await window.__ARTIDOR_API__?.run("get_project_info");
		return info?.data ?? info?.message ?? null;
	});

	log("measuring playback");
	result.playback = await measurePlayback(page, cdp);
	await page.waitForTimeout(800);
	if (process.env.PROBE_SKIP_TRACE !== "1") {
		log("tracing playback");
		result.trace = await measureTrace(page, browser);
		await page.waitForTimeout(800);
	}
	log("measuring scrub");
	result.scrub = await measureScrub(page, cdp);
	await page.screenshot({
		path: fileURLToPath(new URL(`./shot-${LABEL}.png`, import.meta.url)),
	});
	if (process.env.PROBE_SKIP_EXPORT !== "1") {
		log("measuring export");
		result.export = await measureExport(page);
	}
} catch (error) {
	result.error = String(error?.stack ?? error).slice(0, 1200);
	log("FAILED", result.error);
} finally {
	writeFileSync(
		new URL(`./result-${LABEL}.json`, import.meta.url),
		JSON.stringify(result, null, 2),
	);
	await browser.close();
}

const pb = result.playback;
if (pb) {
	log(
		`playback: raf ${pb.raf?.fps}fps (p95 ${pb.raf?.p95}ms, >33ms x${pb.raf?.over33ms}) | ` +
			`presents ${pb.previewPresentsPerSec}/s | presented distinct ${pb.presentedDistinctPerSec}/s | ` +
			`source frames ${pb.sourceFramesPerSec}/s | LoAF ${pb.loaf.count} (${pb.loaf.blockingMs}ms blocking)`,
	);
	log("render phases", JSON.stringify(pb.renderPhases));
	log("cpu by bundle", JSON.stringify(pb.cpu.byBundle.slice(0, 8)));
	log(
		`react: ${pb.reactCommitsPerSec} commits/s | top renders/s`,
		JSON.stringify(pb.reactRendersPerSec.slice(0, 12)),
	);
}
if (result.trace) {
	log(
		`trace: renderer main busy ${result.trace.rendererMainBusyPct}% | gpu ${result.trace.gpuMainBusyPct}% | viz ${result.trace.vizCompositorBusyPct}%`,
	);
	log("main self by event", JSON.stringify(result.trace.mainSelfByEvent.slice(0, 12)));
}
if (result.export) {
	log(`export: ${result.export.ok ? "ok" : "FAILED"} in ${result.export.wallMs}ms (${result.export.byteLength} bytes)`);
	for (const line of result.export.lines.filter((l) => /DONE|took|pre-flight|segment/i.test(l))) {
		log("  ", line);
	}
}
if (result.scrub) {
	log(
		`scrub: raf ${result.scrub.raf?.fps}fps (p95 ${result.scrub.raf?.p95}ms) | presents ${result.scrub.previewPresents} | LoAF ${result.scrub.loaf.count}`,
	);
}
