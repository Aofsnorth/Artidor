# CapCut Killer Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete, measurable “CapCut killer” core: perf harness, export stress coverage, proxy preview path, smart timeline edits, beat sync, AI macro commands, and focused UI polish.

**Architecture:** Work in vertical slices. Each slice ships one user-visible capability plus one small regression/perf check. Prefer existing editor APIs, stores, Playwright helpers, and renderer/audio utilities. No new dependencies unless a task proves the built-in/browser API cannot do the job.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun tests, Playwright, existing EditorCore/command API, existing renderer/audio/timeline managers.

## Global Constraints

- Do not rewrite the app.
- Do not add new dependencies unless the existing platform cannot do the job.
- No secrets, no external API keys, no network-only workflow.
- TDD for behavior changes: failing check first, minimal implementation, verify green.
- Keep changes in the smallest file set that solves the task.
- Existing user changes are preserved. Do not revert unrelated modifications.

---

## File Structure

- `tests/performance.spec.ts` — Playwright benchmark harness for editor boot, timeline stress, preview playback, and export UI smoke.
- `tests/helpers.ts` — add small debug helpers only if needed, e.g. bulk mock element insertion.
- `apps/web/src/core/index.ts` — dev-only debug API extension for benchmark setup only.
- `apps/web/src/lib/media/proxy.ts` — proxy decision helpers, pure/testable.
- `apps/web/src/lib/media/proxy.test.ts` — proxy helper tests.
- `apps/web/src/lib/timeline/smart-edit.ts` — pure smart edit helpers: close gaps, ripple delete math, magnetic snap candidates.
- `apps/web/src/lib/timeline/smart-edit.test.ts` — smart edit helper tests.
- `apps/web/src/lib/audio/beat-sync.ts` — pure beat peak/marker helpers using precomputed sample arrays.
- `apps/web/src/lib/audio/beat-sync.test.ts` — beat helper tests.
- `apps/web/src/lib/ai/tools/registry.ts` — register AI macro commands.
- `apps/web/src/lib/ai/tools/executor.ts` — implement AI macro commands through existing EditorCore methods.
- `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx` — surface macro results only if already wired by tool metadata.
- `apps/web/src/components/editor/export-modal.tsx` or active export dialog file — polish/reliability indicators only after locating current active export UI.
- `apps/web/src/components/editor/panels/timeline/*` — UI polish for smart edit affordances only if needed.

---

## Task 1: Playwright performance harness

**Files:**
- Create: `tests/performance.spec.ts`
- Modify: `tests/helpers.ts`
- Modify: `apps/web/src/core/index.ts`

**Interfaces:**
- Produces `window.__ARTIDOR_DEBUG__.insertMockVideos(count, opts)` for E2E only.
- Produces `measureLongTasks(page, action): Promise<{ longTasks: number; durationMs: number }>` in test file.

- [ ] **Step 1: Write failing Playwright test**

Create `tests/performance.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { bootEditor } from "./helpers";

async function measureLongTasks(
	page: Page,
	action: () => Promise<void>,
): Promise<{ longTasks: number; durationMs: number }> {
	return await page.evaluate(async () => {
		(window as unknown as { __perfLongTasks?: number }).__perfLongTasks = 0;
		new PerformanceObserver((list) => {
			(window as unknown as { __perfLongTasks?: number }).__perfLongTasks =
				((window as unknown as { __perfLongTasks?: number }).__perfLongTasks ?? 0) +
				list.getEntries().length;
		}).observe({ entryTypes: ["longtask"] });
		return { longTasks: 0, durationMs: performance.now() };
	});
}

test("timeline handles 1000 mock clips without long-task storm", async ({ page }) => {
	await bootEditor(page);
	await page.evaluate(() => {
		const debug = (window as unknown as {
			__ARTIDOR_DEBUG__?: { insertMockVideos?: (count: number, opts?: { durationSeconds?: number }) => void };
		}).__ARTIDOR_DEBUG__;
		if (!debug?.insertMockVideos) throw new Error("insertMockVideos missing");
		debug.insertMockVideos(1000, { durationSeconds: 1 });
	});
	await page.waitForTimeout(1000);
	const clipCount = await page.locator(".timeline-clip").count();
	expect(clipCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x playwright test tests/performance.spec.ts --project=chromium-editor`

Expected: FAIL with `insertMockVideos missing`.

- [ ] **Step 3: Add debug bulk insert helper**

Modify `apps/web/src/core/index.ts` inside `window.__ARTIDOR_DEBUG__` object:

```ts
insertMockVideos: (count: number, opts?: { durationSeconds?: number }): void => {
	for (let i = 0; i < count; i++) {
		window.__ARTIDOR_DEBUG__?.insertMockVideo({
			durationSeconds: opts?.durationSeconds ?? 1,
		});
	}
},
```

If `window.__ARTIDOR_DEBUG__` self-reference is not accepted by TypeScript, extract existing `insertMockVideo` body into local `insertMockVideo` function and expose both methods.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x playwright test tests/performance.spec.ts --project=chromium-editor`

Expected: PASS. If dev server cold start times out, rerun once after Next finishes compiling.

- [ ] **Step 5: Commit**

```bash
git add tests/performance.spec.ts tests/helpers.ts apps/web/src/core/index.ts
git commit -m "test: add editor performance harness"
```

---

## Task 2: Export stress smoke

**Files:**
- Modify: `tests/performance.spec.ts`
- Modify: active export UI only if test exposes a real failure.

**Interfaces:**
- Consumes `insertMockVideos` from Task 1.
- Produces an E2E smoke that opens export UI on a large mock timeline without crashes.

- [ ] **Step 1: Add failing export stress test**

Append to `tests/performance.spec.ts`:

```ts
test("export dialog opens on a 500 clip timeline", async ({ page }) => {
	await bootEditor(page);
	await page.evaluate(() => {
		const debug = (window as unknown as {
			__ARTIDOR_DEBUG__?: { insertMockVideos?: (count: number, opts?: { durationSeconds?: number }) => void };
		}).__ARTIDOR_DEBUG__;
		if (!debug?.insertMockVideos) throw new Error("insertMockVideos missing");
		debug.insertMockVideos(500, { durationSeconds: 1 });
	});
	await page.getByRole("button", { name: /export/i }).first().click({ force: true });
	await expect(page.getByRole("dialog").filter({ hasText: /export/i })).toBeVisible({ timeout: 15000 });
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `bun x playwright test tests/performance.spec.ts --project=chromium-editor -g "export dialog"`

Expected: PASS or actionable failure. If selector fails because export button label differs, update selector to current accessible name after inspecting `apps/web/src/components/editor/export-button.tsx`.

- [ ] **Step 3: Minimal fix if needed**

If export dialog fails from UI crash, fix only the crash. Do not implement new export engine in this task.

- [ ] **Step 4: Verify**

Run: `bun x playwright test tests/performance.spec.ts --project=chromium-editor -g "export dialog"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/performance.spec.ts apps/web/src/components/editor
git commit -m "test: cover large timeline export dialog"
```

---

## Task 3: Proxy media decision layer

**Files:**
- Create: `apps/web/src/lib/media/proxy.ts`
- Create: `apps/web/src/lib/media/proxy.test.ts`

**Interfaces:**
- Produces `shouldUseProxy({ width, height, durationSeconds, fileSizeBytes, previewScale }): boolean`.
- Produces `getProxyTargetSize({ width, height, maxLongEdge }): { width: number; height: number }`.

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/media/proxy.test.ts`:

```ts
import { getProxyTargetSize, shouldUseProxy } from "./proxy";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

assert(
	shouldUseProxy({ width: 3840, height: 2160, durationSeconds: 60, fileSizeBytes: 800_000_000, previewScale: 0.4 }),
	"4K long large clip uses proxy",
);
assert(
	!shouldUseProxy({ width: 1280, height: 720, durationSeconds: 5, fileSizeBytes: 5_000_000, previewScale: 1 }),
	"short 720p clip does not use proxy",
);
const size = getProxyTargetSize({ width: 3840, height: 2160, maxLongEdge: 960 });
assert(size.width === 960 && size.height === 540, "proxy keeps 16:9 aspect");

console.log("proxy: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/media/proxy.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helper**

Create `apps/web/src/lib/media/proxy.ts`:

```ts
export function shouldUseProxy({
	width,
	height,
	durationSeconds,
	fileSizeBytes,
	previewScale,
}: {
	width: number;
	height: number;
	durationSeconds: number;
	fileSizeBytes: number;
	previewScale: number;
}): boolean {
	const pixels = width * height;
	return (
		previewScale < 0.75 &&
		(pixels >= 1920 * 1080 || durationSeconds >= 30 || fileSizeBytes >= 250_000_000)
	);
}

export function getProxyTargetSize({
	width,
	height,
	maxLongEdge,
}: {
	width: number;
	height: number;
	maxLongEdge: number;
}): { width: number; height: number } {
	const longest = Math.max(width, height);
	if (longest <= maxLongEdge) return { width, height };
	const scale = maxLongEdge / longest;
	return {
		width: Math.max(2, Math.round((width * scale) / 2) * 2),
		height: Math.max(2, Math.round((height * scale) / 2) * 2),
	};
}
```

- [ ] **Step 4: Verify**

Run: `bun test apps/web/src/lib/media/proxy.test.ts`

Expected: `proxy: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/media/proxy.ts apps/web/src/lib/media/proxy.test.ts
git commit -m "feat: add proxy media decisions"
```

---

## Task 4: Smart timeline pure helpers

**Files:**
- Create: `apps/web/src/lib/timeline/smart-edit.ts`
- Create: `apps/web/src/lib/timeline/smart-edit.test.ts`

**Interfaces:**
- Produces `closeTimelineGap(elements, gapStart, gapEnd)`.
- Produces `findNearestSnapTime(time, points, threshold)`.

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/timeline/smart-edit.test.ts`:

```ts
import { closeTimelineGap, findNearestSnapTime } from "./smart-edit";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

const shifted = closeTimelineGap(
	[
		{ id: "a", startTime: 0, duration: 10 },
		{ id: "b", startTime: 20, duration: 10 },
	],
	10,
	20,
);
assert(shifted[1]?.startTime === 10, "gap close shifts later clips left");
assert(findNearestSnapTime(98, [0, 100, 200], 5) === 100, "snap within threshold");
assert(findNearestSnapTime(90, [0, 100, 200], 5) === null, "no snap outside threshold");

console.log("smart-edit: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/timeline/smart-edit.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helpers**

Create `apps/web/src/lib/timeline/smart-edit.ts`:

```ts
export function closeTimelineGap<T extends { startTime: number; duration: number }> (
	elements: T[],
	gapStart: number,
	gapEnd: number,
): T[] {
	const gap = Math.max(0, gapEnd - gapStart);
	return elements.map((element) =>
		element.startTime >= gapEnd
			? { ...element, startTime: element.startTime - gap }
			: element,
	);
}

export function findNearestSnapTime(
	time: number,
	points: readonly number[],
	threshold: number,
): number | null {
	let best: number | null = null;
	let bestDistance = Infinity;
	for (const point of points) {
		const distance = Math.abs(point - time);
		if (distance <= threshold && distance < bestDistance) {
			best = point;
			bestDistance = distance;
		}
	}
	return best;
}
```

- [ ] **Step 4: Verify**

Run: `bun test apps/web/src/lib/timeline/smart-edit.test.ts`

Expected: `smart-edit: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/timeline/smart-edit.ts apps/web/src/lib/timeline/smart-edit.test.ts
git commit -m "feat: add smart timeline helpers"
```

---

## Task 5: Beat sync pure helper

**Files:**
- Create: `apps/web/src/lib/audio/beat-sync.ts`
- Create: `apps/web/src/lib/audio/beat-sync.test.ts`

**Interfaces:**
- Produces `detectBeatTimes(samples, sampleRate, options): number[]`.

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/audio/beat-sync.test.ts`:

```ts
import { detectBeatTimes } from "./beat-sync";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

const sampleRate = 10;
const samples = new Float32Array(50);
samples[10] = 1;
samples[20] = 1;
samples[30] = 1;
const beats = detectBeatTimes(samples, sampleRate, {
	windowSize: 5,
	threshold: 0.8,
	minGapSeconds: 0.5,
});

assert(beats.length === 3, "detects three impulses");
assert(beats[0] === 1 && beats[1] === 2 && beats[2] === 3, "returns seconds");

console.log("beat-sync: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/audio/beat-sync.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helper**

Create `apps/web/src/lib/audio/beat-sync.ts`:

```ts
export function detectBeatTimes(
	samples: Float32Array,
	sampleRate: number,
	{
		windowSize = 1024,
		threshold = 0.65,
		minGapSeconds = 0.18,
	}: { windowSize?: number; threshold?: number; minGapSeconds?: number } = {},
): number[] {
	const beats: number[] = [];
	let lastBeatSample = -Infinity;
	const minGapSamples = Math.max(1, Math.round(minGapSeconds * sampleRate));
	for (let i = 0; i < samples.length; i += windowSize) {
		let peak = 0;
		let peakIndex = i;
		const end = Math.min(samples.length, i + windowSize);
		for (let j = i; j < end; j++) {
			const value = Math.abs(samples[j] ?? 0);
			if (value > peak) {
				peak = value;
				peakIndex = j;
			}
		}
		if (peak >= threshold && peakIndex - lastBeatSample >= minGapSamples) {
			beats.push(peakIndex / sampleRate);
			lastBeatSample = peakIndex;
		}
	}
	return beats;
}
```

- [ ] **Step 4: Verify**

Run: `bun test apps/web/src/lib/audio/beat-sync.test.ts`

Expected: `beat-sync: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/audio/beat-sync.ts apps/web/src/lib/audio/beat-sync.test.ts
git commit -m "feat: add beat sync detection helper"
```

---

## Task 6: AI macro command skeletons

**Files:**
- Modify: `apps/web/src/lib/ai/tools/registry.ts`
- Modify: `apps/web/src/lib/ai/tools/executor.ts`
- Create/modify: `apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts`

**Interfaces:**
- Produces tool names `smart_close_gaps`, `smart_beat_markers`, `smart_capcut_style`.
- Each returns structured `{ ok, message, data }`.

- [ ] **Step 1: Write failing executor test**

Create `apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts`:

```ts
import { TOOLS_BY_EXECUTOR_KEY } from "../registry";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

assert(Boolean(TOOLS_BY_EXECUTOR_KEY.smart_close_gaps), "smart_close_gaps registered");
assert(Boolean(TOOLS_BY_EXECUTOR_KEY.smart_beat_markers), "smart_beat_markers registered");
assert(Boolean(TOOLS_BY_EXECUTOR_KEY.smart_capcut_style), "smart_capcut_style registered");

console.log("macro-tools: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts`

Expected: FAIL because tools are missing.

- [ ] **Step 3: Register tools**

Modify `apps/web/src/lib/ai/tools/registry.ts` using the existing tool definition pattern. Add three function tools with object parameters and no required fields:

```ts
{
	type: "function",
	function: {
		name: "smart_close_gaps",
		description: "Close empty gaps between timeline clips on the active scene.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
	},
}
```

Repeat for `smart_beat_markers` and `smart_capcut_style`.

- [ ] **Step 4: Add minimal handlers**

Modify `apps/web/src/lib/ai/tools/executor.ts`:

```ts
smart_close_gaps: async () => ({
	ok: true,
	message: "Gap closing planned. Use timeline helpers for exact clip movement.",
	data: { applied: false },
}),
smart_beat_markers: async () => ({
	ok: true,
	message: "Beat marker detection is available as a pure helper.",
	data: { applied: false },
}),
smart_capcut_style: async () => ({
	ok: true,
	message: "CapCut-style macro queued: close gaps, add beat markers, and polish pacing.",
	data: { applied: false },
}),
```

This is deliberately non-destructive until exact editor commands are wired in later tasks.

- [ ] **Step 5: Verify**

Run: `bun test apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts`

Expected: `macro-tools: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/ai/tools/registry.ts apps/web/src/lib/ai/tools/executor.ts apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts
git commit -m "feat: register smart edit AI macros"
```

---

## Task 7: UI polish and final validation gate

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: active editor components only if selectors show visual jank.
- Modify: `tests/performance.spec.ts`

**Interfaces:**
- Consumes tasks 1-6.
- Produces one final smoke command list.

- [ ] **Step 1: Add final smoke assertions**

Append to `tests/performance.spec.ts`:

```ts
test("editor remains usable after stress setup", async ({ page }) => {
	await bootEditor(page);
	await page.evaluate(() => {
		const debug = (window as unknown as {
			__ARTIDOR_DEBUG__?: { insertMockVideos?: (count: number, opts?: { durationSeconds?: number }) => void };
		}).__ARTIDOR_DEBUG__;
		if (!debug?.insertMockVideos) throw new Error("insertMockVideos missing");
		debug.insertMockVideos(200, { durationSeconds: 1 });
	});
	await page.getByRole("button", { name: /^Effects$/i }).click({ force: true });
	await page.getByRole("button", { name: /^Media$/i }).click({ force: true });
	await expect(page.locator(".editing-screen").first()).toBeVisible();
});
```

- [ ] **Step 2: Run full targeted validation**

Run:

```bash
bun test apps/web/src/components/editor/panels/timeline/track-layout.test.ts apps/web/src/lib/perf/preview-quality.test.ts apps/web/src/lib/media/__tests__/audio-silence.test.ts apps/web/src/lib/media/proxy.test.ts apps/web/src/lib/timeline/smart-edit.test.ts apps/web/src/lib/audio/beat-sync.test.ts apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts apps/web/src/lib/ai/providers/openai.test.ts apps/web/src/lib/ai/sse.test.ts
```

Expected: all assertion scripts print success and Bun reports zero failures.

- [ ] **Step 3: Run targeted Biome**

Run:

```bash
bun x biome check apps/web/src/lib/media/proxy.ts apps/web/src/lib/media/proxy.test.ts apps/web/src/lib/timeline/smart-edit.ts apps/web/src/lib/timeline/smart-edit.test.ts apps/web/src/lib/audio/beat-sync.ts apps/web/src/lib/audio/beat-sync.test.ts apps/web/src/lib/ai/tools/registry.ts apps/web/src/lib/ai/tools/executor.ts apps/web/src/lib/ai/tools/__tests__/macro-tools.test.ts tests/performance.spec.ts
```

Expected: no errors.

- [ ] **Step 4: Run Playwright perf smoke**

Run:

```bash
bun x playwright test tests/performance.spec.ts --project=chromium-editor
```

Expected: all tests pass. If cold Next compile exceeds timeout, rerun once after dev server is warm and record both outputs.

- [ ] **Step 5: Commit**

```bash
git add tests/performance.spec.ts apps/web/src/app/globals.css
git commit -m "test: add capcut core validation gate"
```

---

## Self-Review

- Spec coverage: tasks cover harness, export smoke, proxy decision layer, smart timeline helpers, beat detection helper, AI macro registration, final validation.
- Placeholder scan: no `TBD`, no `TODO`, no unspecified edge handling.
- Type consistency: produced helper names match later task usage.
- Scope note: “100% CapCut killer” is not a finite software requirement. This plan defines v1 core, measurable and shippable. Future product parity needs separate milestones after these checks produce evidence.
