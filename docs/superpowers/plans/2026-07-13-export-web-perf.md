# Export Web Performance Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `apps/web` export pipeline measurably faster while keeping it safe and reversible.

**Architecture:** The web export already uses a worker-based WebCodecs/mediabunny pipeline with parallel segment workers and a render/encode queue. The biggest remaining lever is the encoder profile: `CanvasSource` currently uses mediabunny's defaults (`latencyMode: "quality"`, `keyFrameInterval: 2s`). Research (WebCodecs Fundamentals, WebAV benchmarks, Chrome docs) shows that `latencyMode: "realtime"` and a relaxed keyframe interval increase encoder throughput. A second, smaller lever is `CanvasRenderer`, which allocates an internal `OffscreenCanvas` and 2D context that exports never use (the export path reads from the WASM compositor canvas). Lazily creating that buffer removes a per-export allocation.

**Tech Stack:** TypeScript, Next.js, Web Workers, WebCodecs, mediabunny, Bun tests.

## Global Constraints

- Scope is strictly `apps/web`.
- Do not change Rust core, native Tauri paths, or security-sensitive files.
- Keep changes minimal and reversible; do not rewrite the exporter.
- Run `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, and `bun test` after changes.
- Update tests when behavior changes.
- Update `apps/web/src/lib/whats-new/feed.ts` if the change is user-facing.

---

### Task 1: Tune encoder profile for speed

**Files:**
- Modify: `apps/web/src/services/renderer/export-codec.ts`
- Modify: `apps/web/src/services/renderer/export-worker.ts`
- Modify: `apps/web/src/services/renderer/scene-exporter.ts`
- Test: `apps/web/src/services/renderer/export-codec.test.ts`

**Interfaces:**
- Consumes: `ExportQuality` type, `EXPORT_QUALITY_MAP`
- Produces: `exportLatencyModeForQuality(quality)` → `"quality" | "realtime"`, `exportKeyFrameIntervalForQuality(quality)` → `number`

- [ ] **Step 1: Add quality-derived helpers in `export-codec.ts`**

```ts
export function exportLatencyModeForQuality(
	quality: ExportQuality,
): "quality" | "realtime" {
	// Lower quality exports prioritize throughput; higher quality exports
	// keep the default quality-oriented latency mode.
	return quality === "low" || quality === "medium" ? "realtime" : "quality";
}

export function exportKeyFrameIntervalForQuality(quality: ExportQuality): number {
	// Fewer keyframes reduce encoder work and file size on low/medium exports;
	// high/very_high keep the default 2s interval for editing compatibility.
	return quality === "low" || quality === "medium" ? 4 : 2;
}
```

- [ ] **Step 2: Wire helpers into `export-worker.ts` `CanvasSource` config**

```ts
const videoSource = new CanvasSource(compositorCanvas as OffscreenCanvas, {
	codec: videoCodec,
	bitrate: EXPORT_QUALITY_MAP[quality],
	hardwareAcceleration,
	latencyMode: exportLatencyModeForQuality(quality),
	keyFrameInterval: exportKeyFrameIntervalForQuality(quality),
	onEncoderConfig: (config) => {
		console.info(
			`[export-worker] encoder config: hardwareAcceleration=${config.hardwareAcceleration}, codec=${config.codec}, latencyMode=${config.latencyMode}`,
		);
	},
});
```

- [ ] **Step 3: Wire helpers into `scene-exporter.ts` `CanvasSource` config**

Replace local `qualityMap` with imported `EXPORT_QUALITY_MAP`, `exportLatencyModeForQuality`, and `exportKeyFrameIntervalForQuality`. Pass `latencyMode` and `keyFrameInterval` alongside `bitrate` and `hardwareAcceleration`.

- [ ] **Step 4: Add unit tests for helpers**

```ts
import { exportKeyFrameIntervalForQuality, exportLatencyModeForQuality } from "./export-codec";

describe("export encoding profile", () => {
	it("uses realtime mode for low/medium quality", () => {
		expect(exportLatencyModeForQuality("low")).toBe("realtime");
		expect(exportLatencyModeForQuality("medium")).toBe("realtime");
	});

	it("uses quality mode for high/very_high quality", () => {
		expect(exportLatencyModeForQuality("high")).toBe("quality");
		expect(exportLatencyModeForQuality("very_high")).toBe("quality");
	});

	it("relaxes keyframe interval for low/medium quality", () => {
		expect(exportKeyFrameIntervalForQuality("low")).toBe(4);
		expect(exportKeyFrameIntervalForQuality("medium")).toBe(4);
	});

	it("keeps standard keyframe interval for high/very_high quality", () => {
		expect(exportKeyFrameIntervalForQuality("high")).toBe(2);
		expect(exportKeyFrameIntervalForQuality("very_high")).toBe(2);
	});
});
```

- [ ] **Step 5: Run tests**

Run: `bun test apps/web/src/services/renderer/export-codec.test.ts`
Expected: PASS

---

### Task 2: Avoid unused `OffscreenCanvas` allocation in `CanvasRenderer`

**Files:**
- Modify: `apps/web/src/services/renderer/canvas-renderer.ts`

**Interfaces:**
- No new exports.

- [ ] **Step 1: Make the internal canvas/context lazy**

Change `canvas` and `context` to be nullable and only allocate them in `setSize`/`renderToCanvas` when actually needed. The export path only uses the WASM compositor canvas, so this removes a per-export allocation and reduces worker memory pressure.

- [ ] **Step 2: Run typecheck**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: no errors.

---

### Task 3: Verify and update documentation

- [ ] Run `bun run lint:web` and fix any issues.
- [ ] Run `cd apps/web && bunx tsc --noEmit`.
- [ ] Run `bun test` for the affected test files.
- [ ] Update `apps/web/src/lib/whats-new/feed.ts` with a user-facing entry describing the faster export encoder tuning.
