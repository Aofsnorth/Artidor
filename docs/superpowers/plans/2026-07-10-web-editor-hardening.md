# Web Editor Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the `apps/web` editor with reliability fixes, searchable/localized UI, phase-B effects, and measured whole-app performance/security improvements.

**Architecture:** Keep project/domain mutations in existing editor/core commands and focused helpers. UI additions stay in React components/stores; heavy media work stays in workers or lazy-loaded modules. Performance work is baseline-first: measure, fix concrete bottlenecks, verify budgets.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Bun tests, Biome, existing WASM/renderer/media workers. No new dependency by default.

## Global Constraints

- Scope: `apps/web` only. Do not edit `apps/desktop-native` or old GPUI files.
- Preserve the current dirty worktree; inspect diffs before editing touched files.
- No new dependency unless separately justified and approved.
- Existing project files stay backward compatible.
- User media stays local by default.
- Performance claims must be backed by repeatable measurements, not absolute marketing claims.
- Security/scalability claims must distinguish verified controls from gaps.
- Add or update What's New for user-facing changes.

---

## File Structure Map

### Reliability/UI files

- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` — timeline drag/drop placement; remove image-to-overlay override.
- `apps/web/src/components/editor/panels/timeline/drop-target.ts` — placement helper tests may target this.
- `apps/web/src/components/editor/panels/timeline/index.tsx` — timeline tool mode wiring, cursor class, project details integration area.
- `apps/web/src/components/editor/panels/timeline/timeline-element.tsx` — split-click handling for active split tool.
- `apps/web/src/stores/timeline-store.ts` or new `apps/web/src/stores/timeline-tool-store.ts` — active timeline tool (`select` / `split`).
- `apps/web/src/components/editor/project-details-card.tsx` — new details card beside audio meter if no existing component fits.
- `apps/web/src/components/editor/panels/assets/views/*` — search fields and preview palette updates.
- `apps/web/src/components/editor/panels/assets/views/components/catalog-search.tsx` — reusable search field.

### Media/render/effects files

- `apps/web/src/components/editor/panels/properties/tabs/graphics-style-tab.tsx` — Color & Fill keyframe-ready UI and values.
- `apps/web/src/services/renderer/**` — preview/export rendering, image export fix, fill rendering, export lazy-loading.
- `apps/web/src/lib/effects/**` — phase-B effect definitions and registry metadata.
- `apps/web/src/lib/transitions/**` — transition neutral previews if definitions need palette defaults.
- `apps/web/src/lib/animation/**` — keyframe helpers if Color/Fill/effect params need existing animation paths.

### Audio/transcription/AI performance files

- `apps/web/src/lib/media/beat-analysis-worker.ts` — canonical ticks and worker-safe decode path.
- `apps/web/src/lib/media/beat-detection-worker.ts` — canonical ticks.
- `apps/web/src/lib/media/beat-analysis.ts` — request IDs, single-flight, cancellation/timeout.
- `apps/web/src/services/transcription/service.ts` — single loading card, request IDs, transfer PCM, model single-flight.
- `apps/web/src/services/transcription/worker.ts` — request IDs and cancellation boundaries.
- `apps/web/src/components/editor/panels/assets/views/captions.tsx` — one transcription loading card.
- `apps/web/src/lib/ai/tools/executor.ts` — beat result absolute timeline ticks, tool validation fixes.
- `apps/web/src/lib/ai/tools/registry.ts` — expose read-only beat results if missing.

### Whole-app performance/security files

- `apps/web/src/components/editor/panels/timeline/timeline-track.tsx` — horizontal virtualization and shared edge scroll.
- `apps/web/src/components/editor/panels/timeline/filmstrip-cache.ts` — global LRU cap.
- `apps/web/src/components/providers/editor-provider.tsx` — lazy export/WASM/font init.
- `apps/web/src/core/**` — avoid static heavy export imports.
- `apps/web/src/lib/perf/**` — benchmark helpers/tests.
- `apps/web/src/app/api/**`, `apps/web/src/lib/auth/**`, `apps/web/src/lib/ai/**` — security audit only; sensitive edits require explicit approval if needed.

---

### Task 1: Establish Baseline and Guardrails

**Files:**
- Create: `apps/web/src/lib/perf/editor-performance-budgets.ts`
- Create: `apps/web/src/lib/perf/editor-performance-budgets.test.ts`
- Modify: none initially

**Interfaces:**
- Produces: `EDITOR_PERFORMANCE_BUDGETS`, `assertWithinBudget({ metric, value })` for later tests/benchmarks.

- [ ] **Step 1: Add budget constants test**

Create `apps/web/src/lib/perf/editor-performance-budgets.test.ts`:

```ts
import { expect, test } from "bun:test";
import {
	EDITOR_PERFORMANCE_BUDGETS,
	assertWithinBudget,
} from "./editor-performance-budgets";

test("editor performance budgets stay explicit", () => {
	expect(EDITOR_PERFORMANCE_BUDGETS.timelineCommitMsP95).toBeLessThanOrEqual(8);
	expect(EDITOR_PERFORMANCE_BUDGETS.dragFrameMsP95).toBeLessThanOrEqual(16.7);
	expect(EDITOR_PERFORMANCE_BUDGETS.mainThreadSliceMs).toBeLessThanOrEqual(8);
	expect(EDITOR_PERFORMANCE_BUDGETS.exportInitialBytes).toBe(0);
});

test("assertWithinBudget rejects over-budget values", () => {
	expect(() =>
		assertWithinBudget({ metric: "mainThreadSliceMs", value: 9 }),
	).toThrow("mainThreadSliceMs over budget");
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test apps/web/src/lib/perf/editor-performance-budgets.test.ts`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Add budget helper**

Create `apps/web/src/lib/perf/editor-performance-budgets.ts`:

```ts
export const EDITOR_PERFORMANCE_BUDGETS = {
	timelineCommitMsP95: 8,
	dragFrameMsP95: 16.7,
	mainThreadSliceMs: 8,
	exportInitialBytes: 0,
	beatAnalysisMsMedian: 2_000,
	transcriptionDuplicateLoadingCards: 1,
	imageExportSuccessRate: 1,
	filmstripCacheBytes: 64 * 1024 * 1024,
} as const;

export type EditorPerformanceMetric = keyof typeof EDITOR_PERFORMANCE_BUDGETS;

export function assertWithinBudget({
	metric,
	value,
}: {
	metric: EditorPerformanceMetric;
	value: number;
}) {
	const budget = EDITOR_PERFORMANCE_BUDGETS[metric];
	if (value > budget) {
		throw new Error(`${metric} over budget: ${value} > ${budget}`);
	}
}
```

- [ ] **Step 4: Run test**

Run: `bun test apps/web/src/lib/perf/editor-performance-budgets.test.ts`

Expected: PASS.

---

### Task 2: Fix Diagnostics Blocking Tests

**Files:**
- Inspect/Modify: `apps/web/src/services/transcription/segments.test.ts`
- Inspect/Modify/Create: `apps/web/src/services/transcription/segments.ts`
- Inspect/Modify: `apps/web/src/services/transcription/onnx-runtime.test.ts`
- Inspect/Modify/Create: `apps/web/src/services/transcription/onnx-runtime.ts`

**Interfaces:**
- Produces: compileable transcription tests.

- [ ] **Step 1: Inspect missing modules**

Run: `find apps/web/src/services/transcription -maxdepth 1 -type f -print`

Expected: list existing transcription service files. Do not assume files are missing until verified.

- [ ] **Step 2: Fix only root cause**

If `segments.ts` is missing, create the minimal module expected by the test:

```ts
export const SEGMENT_TIMESTAMP_MODE = true;

export type RawTranscriptionSegment = {
	start?: number;
	end?: number;
	text?: string;
};

export type TranscriptionSegment = {
	start: number;
	end: number;
	text: string;
};

export function toTranscriptionSegments({
	segments,
}: {
	segments: RawTranscriptionSegment[];
}): TranscriptionSegment[] {
	return segments.map((segment) => ({
		start: segment.start ?? 0,
		end: segment.end ?? segment.start ?? 0,
		text: segment.text ?? "",
	}));
}
```

If `onnx-runtime.ts` is missing, create the minimal module expected by the test and existing imports:

```ts
export function configureOnnxRuntime({
	env,
}: {
	env: { wasm?: { wasmPaths?: string; proxy?: boolean; numThreads?: number } };
}) {
	env.wasm = {
		...env.wasm,
		proxy: false,
	};
	if (env.wasm.wasmPaths?.startsWith("blob:")) {
		env.wasm.wasmPaths = undefined;
	}
	return env;
}
```

- [ ] **Step 3: Run focused diagnostics test**

Run: `bun test apps/web/src/services/transcription/segments.test.ts apps/web/src/services/transcription/onnx-runtime.test.ts`

Expected: PASS or only assertion mismatch that reveals exact expected shape. Adjust implementation to the existing test, not vice versa.

- [ ] **Step 4: Run diagnostics**

Run: `bun run lint:web`

Expected: no errors in touched files. Warnings from unrelated dirty files may remain documented.

---

### Task 3: Fix Image Drops onto Main Track

**Files:**
- Modify: `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`
- Test: `apps/web/src/components/editor/panels/timeline/drop-target.test.ts` or existing `track-layout.test.ts` if placement tests already live there.

**Interfaces:**
- Consumes: `computeDropTarget` and `buildElementFromMedia` existing APIs.
- Produces: image drag over main track stays `isNewTrack: false` when placement permits.

- [ ] **Step 1: Add failing placement test**

Add to nearest existing timeline placement test:

```ts
import { expect, test } from "bun:test";
import { computeDropTarget } from "./drop-target";
import { TICKS_PER_SECOND } from "@/lib/wasm";

test("image media can drop onto the main track", () => {
	const target = computeDropTarget({
		elementType: "image",
		mouseX: 120,
		mouseY: 24,
		tracks: {
			overlay: [],
			main: { id: "main", name: "Main", type: "main", elements: [] },
			audio: [],
		},
		playheadTime: 0,
		isExternalDrop: false,
		elementDuration: TICKS_PER_SECOND,
		pixelsPerSecond: 100,
		zoomLevel: 1,
	});

	expect(target.isNewTrack).toBe(false);
	expect(target.trackIndex).toBe(0);
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test apps/web/src/components/editor/panels/timeline/drop-target.test.ts`

Expected: FAIL if current override forces new track. If test passes, add an integration-level test around `useTimelineDragDrop` target mutation or proceed to remove dead override.

- [ ] **Step 3: Remove forced overlay override**

Delete this block from `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`:

```ts
if (
	dragData?.type === "media" &&
	(dragData as MediaDragData).mediaType === "image" &&
	!target.isNewTrack &&
	!target.targetElement
) {
	const orderedTracks = [
		...sceneTracks.overlay,
		sceneTracks.main,
		...sceneTracks.audio,
	];
	const hovered = orderedTracks[target.trackIndex];
	if (hovered && hovered.id === sceneTracks.main.id) {
		target.isNewTrack = true;
		target.trackIndex = sceneTracks.overlay.length;
		target.targetElement = null;
	}
}
```

- [ ] **Step 4: Run focused tests**

Run: `bun test apps/web/src/components/editor/panels/timeline/drop-target.test.ts apps/web/src/components/editor/panels/timeline/track-layout.test.ts`

Expected: PASS.

---

### Task 4: Add Quick Split Tool Bound to B

**Files:**
- Modify or Create: `apps/web/src/stores/timeline-tool-store.ts`
- Modify: `apps/web/src/components/editor/panels/timeline/index.tsx`
- Modify: `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
- Modify: keybinding registry file found by searching `Split` / `keybindings`.
- Test: `apps/web/src/stores/timeline-tool-store.test.ts`

**Interfaces:**
- Produces: `useTimelineToolStore`, `TimelineTool = "select" | "split"`.
- Consumes: existing `editor.timeline.splitElements` command.

- [ ] **Step 1: Add tool store test**

```ts
import { expect, test } from "bun:test";
import { createTimelineToolStore } from "./timeline-tool-store";

test("split tool toggles back to select", () => {
	const store = createTimelineToolStore();
	store.getState().setTool("split");
	expect(store.getState().tool).toBe("split");
	store.getState().toggleSplitTool();
	expect(store.getState().tool).toBe("select");
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test apps/web/src/stores/timeline-tool-store.test.ts`

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement store**

```ts
import { createStore } from "zustand/vanilla";
import { create } from "zustand";

export type TimelineTool = "select" | "split";

type TimelineToolState = {
	tool: TimelineTool;
	setTool: (tool: TimelineTool) => void;
	toggleSplitTool: () => void;
};

export function createTimelineToolStore() {
	return createStore<TimelineToolState>((set, get) => ({
		tool: "select",
		setTool: (tool) => set({ tool }),
		toggleSplitTool: () =>
			set({ tool: get().tool === "split" ? "select" : "split" }),
	}));
}

export const useTimelineToolStore = create<TimelineToolState>((set, get) => ({
	tool: "select",
	setTool: (tool) => set({ tool }),
	toggleSplitTool: () =>
		set({ tool: get().tool === "split" ? "select" : "split" }),
}));
```

- [ ] **Step 4: Wire B/Escape key handling**

In timeline top-level component, add a document keydown effect:

```ts
useEffect(() => {
	const onKeyDown = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null;
		const isTyping = target?.matches("input, textarea, [contenteditable='true']");
		if (isTyping) return;
		if (event.key.toLowerCase() === "b") {
			event.preventDefault();
			useTimelineToolStore.getState().toggleSplitTool();
		}
		if (event.key === "Escape") {
			useTimelineToolStore.getState().setTool("select");
		}
	};
	document.addEventListener("keydown", onKeyDown);
	return () => document.removeEventListener("keydown", onKeyDown);
}, []);
```

- [ ] **Step 5: Split on clip click**

In `timeline-element.tsx`, when active tool is `split`, compute clicked time from pointer x, round to frame, call existing split command, then keep split tool active:

```ts
const tool = useTimelineToolStore((state) => state.tool);

const handleSplitToolPointerDown = (event: React.MouseEvent) => {
	if (tool !== "split") return false;
	event.preventDefault();
	event.stopPropagation();
	const rect = event.currentTarget.getBoundingClientRect();
	const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);
	const time = element.startTime + Math.round(element.duration * ratio);
	if (time <= element.startTime || time >= element.startTime + element.duration) {
		return true;
	}
	editor.timeline.splitElements({
		elements: [{ trackId: track.id, elementId: element.id }],
		time: getSnappedTimeOrRoundToFrame(time),
		retainSide: "both",
	});
	return true;
};
```

Use the project’s existing frame-rounding helper; do not add floating-point math.

- [ ] **Step 6: Add cursor class**

Apply `cursor-crosshair` or existing scissors cursor class only when `tool === "split"`. Keep focus states and accessibility unchanged.

- [ ] **Step 7: Run checks**

Run: `bun test apps/web/src/stores/timeline-tool-store.test.ts`

Expected: PASS.

Run: `bun run lint:web`

Expected: no touched-file lint errors.

---

### Task 5: Populate Project Details Card

**Files:**
- Create: `apps/web/src/components/editor/project-details-card.tsx`
- Modify: parent layout near `audio-meters-card.tsx` usage, found by searching `AudioMetersCard`.
- Test: `apps/web/src/components/editor/project-details-card.test.tsx` if component test setup exists; else pure helper test.

**Interfaces:**
- Produces: `ProjectDetailsCard` and `getProjectDetailsSummary({ project })`.

- [ ] **Step 1: Add pure summary helper test**

```ts
import { expect, test } from "bun:test";
import { getProjectDetailsSummary } from "./project-details-card";

test("project details summary renders empty project values", () => {
	const summary = getProjectDetailsSummary({
		project: {
			name: "Untitled",
			settings: { width: 1920, height: 1080, fps: 30 },
			scenes: [{ tracks: { overlay: [], main: { elements: [] }, audio: [] } }],
		},
	});

	expect(summary.name).toBe("Untitled");
	expect(summary.resolution).toBe("1920×1080");
	expect(summary.fps).toBe("30 fps");
	expect(summary.trackCount).toBe("1 track");
	expect(summary.mediaCount).toBe("0 media");
});
```

- [ ] **Step 2: Implement helper and card**

Implement helper against actual project type after reading `apps/web/src/lib/timeline` and editor project shape. Render name, resolution, fps, duration, tracks, media.

- [ ] **Step 3: Wire into right bar**

Find `AudioMetersCard` usage and replace empty sibling card with `<ProjectDetailsCard />`.

- [ ] **Step 4: Run focused test and lint**

Run: `bun test apps/web/src/components/editor/project-details-card.test.tsx`

Expected: PASS.

---

### Task 6: Transcription Single Loading Card

**Files:**
- Modify: `apps/web/src/services/transcription/service.ts`
- Modify: `apps/web/src/components/editor/panels/assets/views/captions.tsx`
- Test: `apps/web/src/services/transcription/service.test.ts` or existing transcription tests.

**Interfaces:**
- Produces: single-flight model loading state: `loadingModelId`, `status`, `requestId`.

- [ ] **Step 1: Add service single-flight test**

```ts
import { expect, test } from "bun:test";
import { createModelLoadGate } from "./service";

test("model loading gate deduplicates concurrent loads", async () => {
	let calls = 0;
	const gate = createModelLoadGate();
	const load = () => gate.run("tiny", async () => {
		calls += 1;
		return "ready";
	});

	const [a, b] = await Promise.all([load(), load()]);
	expect(a).toBe("ready");
	expect(b).toBe("ready");
	expect(calls).toBe(1);
});
```

- [ ] **Step 2: Implement load gate**

```ts
export function createModelLoadGate() {
	const inflight = new Map<string, Promise<unknown>>();
	return {
		run<T>(key: string, load: () => Promise<T>): Promise<T> {
			const existing = inflight.get(key) as Promise<T> | undefined;
			if (existing) return existing;
			const promise = load().finally(() => inflight.delete(key));
			inflight.set(key, promise);
			return promise;
		},
	};
}
```

- [ ] **Step 3: Replace repeated UI cards**

In `captions.tsx`, derive a single operation state. Render exactly one loading card for clip/full timeline; disable start buttons while model is loading.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/services/transcription/service.test.ts apps/web/src/services/transcription/segments.test.ts apps/web/src/services/transcription/onnx-runtime.test.ts`

Expected: PASS.

---

### Task 7: Search Dense Asset Tabs and Neutral Preview Palette

**Files:**
- Create: `apps/web/src/components/editor/panels/assets/views/components/catalog-search.tsx`
- Modify: `transitions.tsx`, `animations.tsx`, `effects.tsx`, `text.tsx`, and other dense tabs after reading current patterns.
- Modify: `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts`
- Test: `apps/web/src/components/editor/panels/assets/views/components/catalog-search.test.ts`

**Interfaces:**
- Produces: `filterCatalogItems({ items, query, getText })`.

- [ ] **Step 1: Add filter test**

```ts
import { expect, test } from "bun:test";
import { filterCatalogItems } from "./catalog-search";

test("catalog search filters by name category and keywords", () => {
	const items = [
		{ name: "Fade", category: "Transition", keywords: ["soft"] },
		{ name: "Glitch", category: "Effect", keywords: ["rgb"] },
	];
	const result = filterCatalogItems({
		items,
		query: "rgb",
		getText: (item) => [item.name, item.category, ...item.keywords],
	});
	expect(result.map((item) => item.name)).toEqual(["Glitch"]);
});
```

- [ ] **Step 2: Implement search component/helper**

Use existing input/button styling. The helper must trim/lowercase and return original order.

- [ ] **Step 3: Wire transitions/animations/effects/text**

Apply search after category filter or before category filter consistently. Recommended: category first, query second. Empty state: `No results for “query”`.

- [ ] **Step 4: Neutralize transition/motion palette**

In procedural preview helper, add neutral deterministic palettes:

```ts
const NEUTRAL_PREVIEW_PALETTES = [
	{ background: "linear-gradient(135deg,#20232a,#3b3f48)", accent: "#c7ccd8" },
	{ background: "linear-gradient(135deg,#1d2428,#4a514e)", accent: "#d8d1c0" },
	{ background: "linear-gradient(135deg,#242225,#4b4650)", accent: "#cfc7d8" },
] as const;
```

Use it for transition/motion/template cards; keep effects visually informative.

- [ ] **Step 5: Run focused tests and lint**

Run: `bun test apps/web/src/components/editor/panels/assets/views/components/catalog-search.test.ts`

Expected: PASS.

---

### Task 8: Localization Foundation

**Files:**
- Create: `apps/web/src/lib/i18n/dictionaries.ts`
- Create: `apps/web/src/lib/i18n/provider.tsx`
- Create: `apps/web/src/lib/i18n/use-i18n.ts`
- Modify: `apps/web/src/app/layout.tsx` or editor provider composition after reading current providers.
- Modify: settings dialog to add language select.
- Test: `apps/web/src/lib/i18n/dictionaries.test.ts`

**Interfaces:**
- Produces: `Locale = "en" | "id"`, `useI18n().t(key, values?)`, `setLocale(locale)`.

- [ ] **Step 1: Add fallback/interpolation tests**

```ts
import { expect, test } from "bun:test";
import { translate } from "./dictionaries";

test("translate falls back to English", () => {
	expect(translate({ locale: "id", key: "editor.unknown" })).toBe("editor.unknown");
	expect(translate({ locale: "id", key: "editor.projectDetails" })).toBe("Detail proyek");
});

test("translate interpolates values", () => {
	expect(
		translate({ locale: "en", key: "timeline.tracks", values: { count: 2 } }),
	).toBe("2 tracks");
});
```

- [ ] **Step 2: Implement typed dictionary**

Keep keys touched in phases 1-4 only. Persist locale in `localStorage` key `artidor.locale`.

- [ ] **Step 3: Wire provider and settings selector**

Wrap editor app. Add selector with `English` and `Indonesia` labels.

- [ ] **Step 4: Localize touched UI**

Use `t()` in project details, catalog search placeholder/empty states, split tool labels, transcription loading card.

- [ ] **Step 5: Run tests**

Run: `bun test apps/web/src/lib/i18n/dictionaries.test.ts`

Expected: PASS.

---

### Task 9: Color & Fill Preview/Export Correctness

**Files:**
- Modify: `apps/web/src/components/editor/panels/properties/tabs/graphics-style-tab.tsx`
- Modify: `apps/web/src/services/renderer/canvas-renderer.ts`
- Modify: `apps/web/src/services/renderer/gpu-renderer.ts` or compositor nodes after inspecting actual fill application.
- Test: existing renderer tests or create pure style resolver test.

**Interfaces:**
- Produces: shared resolver `resolveGraphicFillStyle(element)` if not present.

- [ ] **Step 1: Add resolver test**

```ts
import { expect, test } from "bun:test";
import { resolveGraphicFillStyle } from "@/services/renderer/graphic-style";

test("white fill at full opacity resolves as active fill", () => {
	const fill = resolveGraphicFillStyle({
		type: "video",
		graphicStyle: { fillColor: "#ffffff", fillOpacity: 1 },
	});
	expect(fill).toEqual({ color: "#ffffff", opacity: 1, enabled: true });
});
```

- [ ] **Step 2: Implement resolver**

Clamp opacity to `[0, 1]`, default disabled for old projects, active when opacity > 0.

- [ ] **Step 3: Apply in preview/export renderer**

After source media draw and before stroke/shadow overlays, apply fill using `source-atop` or equivalent compositor path so full white is visible.

- [ ] **Step 4: Run renderer tests**

Run focused renderer tests available under `apps/web/src/services/renderer`.

Expected: PASS.

---

### Task 10: Phase-B Effects, Border, Keyframes, Blend Modes

**Files:**
- Modify/Create: `apps/web/src/lib/effects/definitions/*.ts`
- Modify: `apps/web/src/lib/effects/categories.ts`
- Modify: `apps/web/src/components/editor/panels/properties/tabs/graphic-tab.tsx`
- Modify: `apps/web/src/components/editor/panels/properties/tabs/effects-tab.tsx`
- Modify: blend-mode definitions in timeline types/defaults/renderer mapping.
- Test: `apps/web/src/lib/effects/registry.test.ts`, blend mode tests.

**Interfaces:**
- Produces: supported priority effect IDs only; catalog marks unsupported names as unavailable only if surfaced.

- [ ] **Step 1: Add effect registry coverage test**

Create a test asserting priority IDs exist and unsupported IDs are not registered as working.

```ts
import { expect, test } from "bun:test";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";

test("phase-B priority effects are registered", () => {
	registerDefaultEffects();
	for (const type of ["chroma-key", "luma-key", "gaussian-blur", "hsl-mixer", "pixelate", "fractal-noise"]) {
		expect(effectsRegistry.has(type)).toBe(true);
	}
});
```

- [ ] **Step 2: Implement cheap effects first**

Use existing shader/pass primitives. Do not add CPU loops. If no shader primitive exists, register a catalog stub only if UI can clearly mark it unsupported; otherwise skip.

- [ ] **Step 3: Add Graphic Border**

Use existing graphic param/keyframe system. Border maps to stroke params where available; avoid duplicate border/stroke state.

- [ ] **Step 4: Keyframe all mutable controls touched**

Use existing `useKeyframedParamProperty` or equivalent for numeric/color effect params, Color & Fill, border, stroke, shadow.

- [ ] **Step 5: Complete verified blend mode set**

Add only renderer-supported modes. Add explicit fallback to normal for unsupported export backends.

- [ ] **Step 6: Run tests**

Run: `bun test apps/web/src/lib/effects apps/web/src/components/editor/panels/properties`

Expected: PASS.

---

### Task 11: Whole-App Performance Pass 1 — Timeline

**Files:**
- Modify: `apps/web/src/components/editor/panels/timeline/timeline-track.tsx`
- Modify: `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
- Modify: `apps/web/src/hooks/timeline/use-edge-auto-scroll.ts`
- Modify: `apps/web/src/components/editor/panels/timeline/filmstrip-cache.ts`
- Test: add focused pure tests for visible-range filtering and LRU.

**Interfaces:**
- Produces: `getVisibleTimelineElements({ elements, viewportStart, viewportEnd, overscan })` and global filmstrip cache budget.

- [ ] **Step 1: Add visible-range test**

```ts
import { expect, test } from "bun:test";
import { getVisibleTimelineElements } from "./timeline-track";

test("visible range keeps selected offscreen clips", () => {
	const elements = [
		{ id: "a", startTime: 0, duration: 100 },
		{ id: "b", startTime: 10_000, duration: 100 },
	];
	const visible = getVisibleTimelineElements({
		elements,
		viewportStart: 500,
		viewportEnd: 1_000,
		overscan: 0,
		pinnedElementIds: new Set(["b"]),
	});
	expect(visible.map((element) => element.id)).toEqual(["b"]);
});
```

- [ ] **Step 2: Implement horizontal clip filtering**

Render only intersecting clips plus pinned selected/dragged clips. Keep keyboard selection working.

- [ ] **Step 3: Keep vertical virtualization during drag**

Remove drag-time `visibleTrackIndices = null`; compute drop target from track spans instead.

- [ ] **Step 4: Move edge auto-scroll to one owner**

Only timeline root owns one RAF loop. Tracks consume shared state.

- [ ] **Step 5: Add filmstrip global LRU**

Cap total raw frame bytes to 64 MiB. Evict least recently used file/frame entries.

- [ ] **Step 6: Run focused tests and manual drag check**

Run: `bun test apps/web/src/components/editor/panels/timeline`

Expected: PASS.

---

### Task 12: Whole-App Performance Pass 2 — Audio, Beat, Transcription, AI

**Files:**
- Modify: `apps/web/src/lib/media/beat-analysis-worker.ts`
- Modify: `apps/web/src/lib/media/beat-detection-worker.ts`
- Modify: `apps/web/src/lib/media/beat-analysis.ts`
- Modify: `apps/web/src/lib/ai/tools/executor.ts`
- Modify: `apps/web/src/services/transcription/service.ts`
- Test: beat tick conversion, request ID, AI absolute beat result.

**Interfaces:**
- Produces: canonical `TICKS_PER_SECOND = 120_000` usage, request IDs, one-job policy, cached beat results.

- [ ] **Step 1: Add canonical ticks test**

```ts
import { expect, test } from "bun:test";
import { secondsToBeatTicks } from "@/lib/media/beat-analysis";

test("beat analysis uses canonical timeline ticks", () => {
	expect(secondsToBeatTicks(1)).toBe(120_000);
});
```

- [ ] **Step 2: Replace `960` tick constants**

Import canonical ticks from `@/lib/wasm` or the canonical tick module. Do not duplicate constants.

- [ ] **Step 3: Fix AI beat offset**

When detecting beats for a clip, add `element.startTime` to clip-relative beat ticks before returning to AI tools.

- [ ] **Step 4: Add request IDs and busy state**

Every worker request carries `requestId`; responses not matching the current request are ignored. Concurrent calls either share cached/inflight result or reject with clear busy error.

- [ ] **Step 5: Fix worker decode path**

Avoid `self.AudioContext` in dedicated worker unless browser supports it. Decode on main with yielding, transfer PCM to worker, or use existing proven path.

- [ ] **Step 6: Run tests**

Run: `bun test apps/web/src/lib/media apps/web/src/lib/ai/tools apps/web/src/services/transcription`

Expected: PASS.

---

### Task 13: Whole-App Performance Pass 3 — Preview, Export, Bundle Loading

**Files:**
- Modify: `apps/web/src/services/renderer/scene-builder.ts`
- Modify: `apps/web/src/services/renderer/scene-serializer.ts`
- Modify: `apps/web/src/services/renderer/nodes/image-node.ts`
- Modify: `apps/web/src/services/renderer/parallel-export.ts`
- Modify: `apps/web/src/services/renderer/export-worker.ts`
- Modify: `apps/web/src/services/renderer/export-worker-bridge.ts`
- Modify: `apps/web/src/components/providers/editor-provider.tsx`
- Modify: `apps/web/src/core/managers/renderer-manager.ts`
- Test: image export serialization round-trip, failed image cache retry.

**Interfaces:**
- Produces: serialized image sources include enough info for worker export; export modules lazy-load.

- [ ] **Step 1: Add image export round-trip test**

```ts
import { expect, test } from "bun:test";
import { serializeSceneTree } from "@/services/renderer/scene-serializer";

test("image nodes keep source information for export workers", () => {
	const serialized = serializeSceneTree({
		type: "image",
		mediaId: "media-1",
		file: { name: "still.png" },
	});
	expect(JSON.stringify(serialized)).toContain("media-1");
});
```

Adapt to actual scene node types after reading files.

- [ ] **Step 2: Fix image source serialization**

Keep `mediaId` and serializable source metadata. Do not serialize live blob URLs without disposer/revoke path.

- [ ] **Step 3: Lazy-load export stack**

Replace static export imports in editor startup path with `await import(...)` inside export methods.

- [ ] **Step 4: Lazy-load WASM owner once**

Ensure only one path fetches/compiles WASM before renderer init. Remove duplicate eager import route.

- [ ] **Step 5: Remove fixed worker stagger**

Launch export workers on readiness handshake, not fixed 500 ms sleeps.

- [ ] **Step 6: Add cleanup finally blocks**

Revoke blob URLs, clear image/video caches, release segment buffers after use.

- [ ] **Step 7: Run focused renderer/export tests**

Run: `bun test apps/web/src/services/renderer apps/web/src/lib/perf`

Expected: PASS.

---

### Task 14: Security and Scalability Audit Remediation

**Files:**
- Read-only first: `apps/web/src/app/api/**`, `apps/web/src/lib/auth/**`, `apps/web/src/lib/ai/**`, `apps/web/next.config.ts`
- Modify only non-sensitive frontend files without separate approval.
- Sensitive edits require explicit user approval before changing.

**Interfaces:**
- Produces: `docs/security/web-editor-audit-2026-07-10.md` with verified controls/gaps/remediation evidence.

- [ ] **Step 1: Run security sensors**

Run:

```bash
bun run lint:web
bun test apps/web/src
bunx tsc --noEmit
semgrep scan
```

Expected: collect failures. Do not suppress findings.

- [ ] **Step 2: Run secret scan if available**

Run: `gitleaks detect --source .`

Expected: no committed secrets. If tool missing, document missing tool.

- [ ] **Step 3: Write audit document**

Create `docs/security/web-editor-audit-2026-07-10.md` with sections:

```md
# Web Editor Security and Scalability Audit

## Verified controls

## Gaps

## Scalability assumptions

## Sensor results

## Remediation order

## Claims not made

Artidor is not claimed to be immune to all hacker attacks or guaranteed safe for 1,000,000 users without production load tests and infrastructure-specific evidence.
```

- [ ] **Step 4: Fix safe frontend-only issues**

Examples: CSP-safe image loading, rejected cache eviction, non-finite input rejection in non-sensitive utility functions.

- [ ] **Step 5: Stop for sensitive approval**

If required fixes touch API/auth/AI sensitive boundaries, present exact files and risks before editing.

---

### Task 15: Validation, What's New, and Final Report

**Files:**
- Modify: `apps/web/src/lib/whats-new/feed.ts`
- Modify: changelog if existing policy requires.
- Read: `docs/product/WHATS_NEW_POLICY.md`

**Interfaces:**
- Produces: user-facing changelog entry and validation report.

- [ ] **Step 1: Add What's New entry**

Add a newest-first entry:

```ts
{
	id: "2026-07-10-web-editor-hardening",
	date: "2026-07-10",
	tag: "improvement",
	title: "Editor reliability and performance hardening",
	items: [
		"Images now stay as image clips when dropped onto the main track, with no audio controls attached.",
		"Dense editor libraries gained search, and transcription/model loading now uses a single clear progress card.",
		"Timeline, media analysis, preview, and export paths were benchmarked and optimized against explicit performance budgets.",
	],
},
```

- [ ] **Step 2: Run full web sensors**

Run:

```bash
bun run lint:web
bun test apps/web/src
bunx tsc --noEmit
bun run build:web
```

Expected: PASS. If failures pre-existed and are unrelated, include exact failures and evidence.

- [ ] **Step 3: Run targeted manual QA**

Manual checklist:

```md
- New project shows Project Details card.
- Drag image to main track: element type image; no Audio tab.
- Press B: cursor changes; click clip splits at clicked frame; Escape returns Select.
- Motion text title stays centered in preview card.
- Transition/motion/template previews are neutral, not rainbow.
- Search works in transition, animation, effects, text tabs.
- Transcribe clip/full timeline shows one loading card.
- White Color & Fill at 100% visibly affects preview/export.
- Beat detection returns timeline-correct ticks; AI can read returned beats.
- Export still completes for video + image + audio fixture.
```

- [ ] **Step 4: Final report**

Report changed files, validation commands, benchmark before/after medians, security audit result, remaining risks, rollback path.

---

## Self-Review

Spec coverage:
- Editor reliability: Tasks 2-6, 9.
- Search/visual consistency: Task 7.
- Localization: Task 8.
- Effects phase B: Task 10.
- Whole-app performance: Tasks 1, 11-13.
- Beat/audio/transcription/AI: Tasks 6, 12.
- Security/scalability: Task 14.
- What's New/validation: Task 15.

Known risk:
- Full phase-B effects may need splitting further after current effect renderer capabilities are inspected.
- Sensitive API/auth/AI security fixes may require separate approval.
- Performance budgets may be adjusted only after baseline proves impossible on current architecture, with evidence.
