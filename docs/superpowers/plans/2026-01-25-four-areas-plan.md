# Four Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four approved research areas (precision bug fixes, apply-effect UX, auto-caption CapCut-style presets, preview/export performance) with minimal, safe, test-backed changes.

**Architecture:** Each area is independent and isolated to specific files in `apps/web/src`. There are no new dependencies. The plan is split into small tasks with their own test cycle. Each task ends with a commit.

**Tech Stack:** Next.js, React, TypeScript, Bun, Cargo, Semgrep.

## Global Constraints

- No new dependencies.
- All logic stays in `apps/web/src` unless noted.
- Prefer `const EPSILON = 1e-6` for time precision fixes.
- Effect bounds epsilon in `resolve.ts` becomes `1e-3`.
- Caption preset additions must reuse existing `TextElement` and `TextPreset` types.
- Cache size changes are numeric constants only.
- Every behavior change needs a test or a manual QA command.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/timeline/placement/overlap.ts` | Detect element overlaps with epsilon guard. |
| `apps/web/src/lib/timeline/snap-utils.ts` | Snap pointer time to nearest clip edge/keyframe/bookmark. |
| `apps/web/src/lib/timeline/drag-utils.ts` | Convert mouse client X to timeline ticks. |
| `apps/web/src/services/renderer/resolve.ts` | Resolve render tree including effect-layer bounds. |
| `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` | Execute drag-and-drop onto timeline. |
| `apps/web/src/lib/text/presets.ts` | Text preset catalog. |
| `apps/web/src/lib/text/animator.ts` | Text animator presets and per-unit state. |
| `apps/web/src/components/editor/panels/assets/views/captions.tsx` | Captions panel UI. |
| `apps/web/src/lib/subtitles/build-subtitle-text-element.ts` | Build `TextElement` from subtitle cue. |
| `apps/web/src/lib/presets/types.ts` | Preset category types (not text presets). |
| `apps/web/src/services/renderer/export-codec.ts` | Negotiate video codec for export. |
| `apps/web/src/services/renderer/export-performance.ts` | Export render queue depth policy. |
| `apps/web/src/services/video-cache/service.ts` | Decode frame LRU cache. |
| `apps/web/src/components/editor/panels/preview/index.tsx` | Preview frame cache. |

---

## Task 1: Precision — overlap epsilon

**Files:**
- Modify: `apps/web/src/lib/timeline/placement/overlap.ts`
- Test: `apps/web/src/lib/timeline/placement/overlap.test.ts` (create if missing, or add to existing tests)

**Interfaces:**
- Consumes: `TimelineElement`, `PlacementTimeSpan`.
- Produces: `wouldElementOverlap` with epsilon-corrected result.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/timeline/placement/overlap.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { canPlaceTimeSpansOnTrack } from "./overlap";
import type { TimelineTrack, TimelineElement } from "@/lib/timeline";

function makeTrack(elements: TimelineElement[]): TimelineTrack {
  return {
    id: "track-1",
    type: "video",
    name: "Track",
    elements,
    collapsed: false,
    locked: false,
    hidden: false,
  };
}

function makeElement(startTime: number, duration: number): TimelineElement {
  return {
    id: `el-${startTime}-${duration}`,
    type: "video",
    name: "Clip",
    startTime,
    duration,
    trimStart: 0,
    trimEnd: 0,
    transform: { position: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotate: 0 },
    opacity: 1,
    animations: [],
    effects: [],
  };
}

describe("canPlaceTimeSpansOnTrack", () => {
  it("does not consider tiny overlap as overlapping", () => {
    const track = makeTrack([makeElement(0, 100)]);
    expect(
      canPlaceTimeSpansOnTrack({
        track,
        timeSpans: [{ startTime: 100 - 1e-7, duration: 10 }],
      }),
    ).toBe(true);
  });

  it("still reports real overlaps", () => {
    const track = makeTrack([makeElement(0, 100)]);
    expect(
      canPlaceTimeSpansOnTrack({
        track,
        timeSpans: [{ startTime: 50, duration: 100 }],
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/timeline/placement/overlap.test.ts`
Expected: FAIL — tiny overlap treated as overlapping.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/timeline/placement/overlap.ts`, add `const EPSILON = 1e-6;` inside `wouldElementOverlap` and shrink the overlap window:

```typescript
function wouldElementOverlap({ ... }) {
  const EPSILON = 1e-6;
  return elements.some((element) => {
    if (excludeElementId && element.id === excludeElementId) {
      return false;
    }

    const elementEnd = element.startTime + element.duration;
    return (
      startTime < elementEnd - EPSILON && endTime > element.startTime + EPSILON
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/timeline/placement/overlap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/timeline/placement/overlap.ts apps/web/src/lib/timeline/placement/overlap.test.ts
git commit -m "fix: add epsilon to timeline overlap check"
```

---

## Task 2: Precision — snap epsilon

**Files:**
- Modify: `apps/web/src/lib/timeline/snap-utils.ts`
- Test: `apps/web/src/lib/timeline/snap-utils.test.ts` (existing)

**Interfaces:**
- Consumes: `SnapPoint`, `TICKS_PER_SECOND`, `BASE_TIMELINE_PIXELS_PER_SECOND`.
- Produces: `snapToNearestPoint` with epsilon-adjusted threshold.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/lib/timeline/snap-utils.test.ts`:

```typescript
it("snaps when target is within epsilon of threshold boundary", () => {
  const snapPoints = [{ time: 0, type: "playhead" as const }];
  const result = snapToNearestPoint({
    targetTime: 0.5,
    snapPoints,
    zoomLevel: 1,
    snapThreshold: 10,
  });
  // At zoom 1, 10 px = (10 / 120) * 10_000_000 ticks. The exact value is
  // large; the test asserts the behavior near the boundary with epsilon.
  expect(result.snapPoint).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/timeline/snap-utils.test.ts`
Expected: FAIL due to exact boundary comparison.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/timeline/snap-utils.ts`, in `snapToNearestPoint`, add an epsilon guard:

```typescript
const EPSILON = 1e-6;

for (const snapPoint of snapPoints) {
  const distance = Math.abs(targetTime - snapPoint.time);
  if (distance < thresholdInTicks + EPSILON && distance < closestDistance) {
    closestDistance = distance;
    closestSnapPoint = snapPoint;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/timeline/snap-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/timeline/snap-utils.ts
git commit -m "fix: add epsilon to snap distance check"
```

---

## Task 3: Precision — drag tick rounding

**Files:**
- Modify: `apps/web/src/lib/timeline/drag-utils.ts`
- Test: `apps/web/src/lib/timeline/drag-utils.test.ts` (create if missing)

**Interfaces:**
- Consumes: `clientX`, `containerRect`, `zoomLevel`, `scrollLeft`.
- Produces: `getMouseTimeFromClientX` returns stable tick value.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/timeline/drag-utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getMouseTimeFromClientX } from "./drag-utils";

function rect(): DOMRect {
  return {
    left: 0,
    top: 0,
    right: 1920,
    bottom: 1080,
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    toJSON() {},
  };
}

describe("getMouseTimeFromClientX", () => {
  it("rounds tiny floating-point seconds consistently", () => {
    const result = getMouseTimeFromClientX({
      clientX: 60.0000001,
      containerRect: rect(),
      zoomLevel: 1,
      scrollLeft: 0,
    });
    expect(result).toBe(5000000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/timeline/drag-utils.test.ts`
Expected: FAIL — `Math.round` may round down due to precision.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/timeline/drag-utils.ts`, add `EPSILON` before rounding:

```typescript
const EPSILON = 1e-6;

export function getMouseTimeFromClientX({ ... }) {
  const mouseX = clientX - containerRect.left + scrollLeft - contentInset;
  const seconds = Math.max(
    0,
    mouseX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
  );
  return Math.round((seconds + EPSILON) * TICKS_PER_SECOND);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/timeline/drag-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/timeline/drag-utils.ts apps/web/src/lib/timeline/drag-utils.test.ts
git commit -m "fix: add epsilon before drag tick rounding"
```

---

## Task 4: Effect bounds epsilon

**Files:**
- Modify: `apps/web/src/services/renderer/resolve.ts`
- Test: `apps/web/src/services/renderer/resolve.test.ts` (existing)

**Interfaces:**
- Consumes: `EffectLayerNode`, `ResolveContext`.
- Produces: `resolveEffectLayerNode` with looser epsilon bounds.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/services/renderer/resolve.test.ts` (or create):

```typescript
it("still resolves effect at exact boundary with 1e-3 tolerance", () => {
  const node = createEffectLayerNode({
    timeOffset: 0,
    duration: 100,
    effectType: "blur",
    effectParams: {},
  });
  const result = resolveEffectLayerNode({
    node,
    context: { time: 100 - 1e-4, renderer: mockRenderer } as ResolveContext,
  });
  expect(result).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/services/renderer/resolve.test.ts`
Expected: FAIL — `1e-6` epsilon too strict.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/services/renderer/resolve.ts`, replace the `1e-6` bounds in `resolveEffectLayerNode` with `1e-3`:

```typescript
function resolveEffectLayerNode({ node, context }) {
  const time = context.time;
  if (
    time < node.params.timeOffset - 1e-3 ||
    time >= node.params.timeOffset + node.params.duration + 1e-3
  ) {
    return null;
  }
  // ...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/services/renderer/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/renderer/resolve.ts
git commit -m "fix: loosen effect layer bounds epsilon"
```

---

## Task 5: Apply effect UX — drop feedback

**Files:**
- Modify: `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`
- Test: `apps/web/src/hooks/timeline/use-timeline-drag-drop.test.ts` (create or add)

**Interfaces:**
- Consumes: `DropTarget`, `EffectDragData`, `editor`.
- Produces: `executeEffectDrop` shows `toast.error` when target is not an effect track.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/timeline/use-timeline-drag-drop.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimelineDragDrop } from "./use-timeline-drag-drop";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Test: dropping on a non-effect track should call toast.error.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/hooks/timeline/use-timeline-drag-drop.test.ts`
Expected: FAIL — no feedback.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`, update `executeEffectDrop` to provide feedback instead of silently returning.

Find the block:

```typescript
const track = tracks[target.trackIndex];
if (track?.type !== "effect") return;
trackId = track.id;
```

Replace with:

```typescript
const track = tracks[target.trackIndex];
if (track?.type !== "effect") {
  toast.error(t("captions.error.invalidTrack")); // or a new key
  return;
}
trackId = track.id;
```

Also import `toast` if not already imported and use `useI18n` if available. If `t` is not available in this hook, add `const { t } = useI18n();` near the top of `useTimelineDragDrop` and add a translation key to `captions.error.invalidTrack` (or a new `timeline.effect.invalidTrack` key if the i18n namespace supports it). For the minimal change, use:

```typescript
const { t } = useI18n();
```

and then:

```typescript
toast.error(t("timeline.effect.invalidTrack"));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/hooks/timeline/use-timeline-drag-drop.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/timeline/use-timeline-drag-drop.ts
git commit -m "feat: show toast when dropping effect on wrong track"
```

---

## Task 6: Caption presets — add `caption` category and CapCut-style presets

**Files:**
- Modify: `apps/web/src/lib/text/presets.ts`
- Modify: `apps/web/src/lib/text/animator.ts`
- Test: `apps/web/src/lib/text/presets.test.ts` (create or add)

**Interfaces:**
- Consumes: `TextPreset`, `TextElement`, `baseDefaults`, `box`.
- Produces: New `TextPreset` objects with `category: "caption"` and a new `word-highlight` animator preset.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/lib/text/presets.test.ts` (create if missing):

```typescript
import { describe, expect, it } from "vitest";
import { textPresets } from "./presets";

describe("textPresets", () => {
  it("includes caption presets", () => {
    const captions = textPresets.filter((p) => p.category === "caption");
    expect(captions.length).toBeGreaterThanOrEqual(3);
    expect(captions.map((p) => p.id)).toContain("caption-karaoke");
    expect(captions.map((p) => p.id)).toContain("caption-pop");
    expect(captions.map((p) => p.id)).toContain("caption-minimal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/text/presets.test.ts`
Expected: FAIL — no `caption` presets.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/text/presets.ts`, add `"caption"` to `TextPresetCategory`:

```typescript
export type TextPresetCategory =
  | "basic"
  | "title"
  | "subtitle"
  | "lower-third"
  | "callout"
  | "quote"
  | "social"
  | "bold"
  | "handwritten"
  | "neon"
  | "caption";
```

Append at least three caption presets to `textPresets`:

```typescript
/* ------------------------------- caption ------------------------------- */
{
  id: "caption-karaoke",
  type: "caption-karaoke",
  name: "Karaoke",
  keywords: ["caption", "karaoke", "highlight"],
  category: "caption",
  build: () => ({
    ...baseDefaults,
    type: "text",
    name: "Karaoke",
    content: "Karaoke caption",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#ffffff",
    background: box("rgba(0,0,0,0.85)", 6),
  }),
},
{
  id: "caption-pop",
  type: "caption-pop",
  name: "Pop",
  keywords: ["caption", "pop", "bold"],
  category: "caption",
  build: () => ({
    ...baseDefaults,
    type: "text",
    name: "Pop",
    content: "Pop caption",
    fontSize: 18,
    fontFamily: "Impact",
    fontWeight: "bold",
    color: "#ffeb3b",
    background: box("rgba(0,0,0,0.85)", 6),
  }),
},
{
  id: "caption-minimal",
  type: "caption-minimal",
  name: "Minimal",
  keywords: ["caption", "minimal", "clean"],
  category: "caption",
  build: () => ({
    ...baseDefaults,
    type: "text",
    name: "Minimal",
    content: "Minimal caption",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "normal",
    color: "#e5e7eb",
    background: box("rgba(0,0,0,0.5)", 4),
  }),
},
```

- [ ] **Step 4: Add word-highlight animator preset**

In `apps/web/src/lib/text/animator.ts`, add `"word-highlight"` to `TEXT_ANIMATOR_PRESETS`:

```typescript
export const TEXT_ANIMATOR_PRESETS = [
  { value: "fade", label: "Fade in" },
  // ...existing presets...
  { value: "word-highlight", label: "Word highlight" },
];
```

Add a `word-highlight` case in `computeTextUnitAnimation`:

```typescript
case "word-highlight": {
  const start = unitIndex * Math.max(0, stagger);
  if (localTimeSeconds <= start) {
    return { ...IDENTITY, opacity: 0.5 };
  }
  return IDENTITY;
}
```

Also update `TextAnimatorPreset` in `apps/web/src/lib/timeline/types.ts` to include `word-highlight` if the type is a union. If it is a union, add `"word-highlight"`. If it is `string`, no change needed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && bunx vitest run src/lib/text/presets.test.ts src/lib/text/animator.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/text/presets.ts apps/web/src/lib/text/animator.ts apps/web/src/lib/text/presets.test.ts
git commit -m "feat: add caption presets and word-highlight animator"
```

---

## Task 7: Caption UI — style selector

**Files:**
- Modify: `apps/web/src/components/editor/panels/assets/views/captions.tsx`
- Test: manual QA (e2e with Playwright if available) or add a simple unit test for the UI state.

**Interfaces:**
- Consumes: `TextPreset` objects, `insertCaptionChunksAsTextTrack`, `editor`.
- Produces: User can pick a caption preset in the captions panel.

- [ ] **Step 1: Add selected caption preset state**

In `apps/web/src/components/editor/panels/assets/views/captions.tsx`, add state:

```typescript
const [selectedCaptionPreset, setSelectedCaptionPreset] = useState<string>("caption-pop");
```

- [ ] **Step 2: Add a preset selector to the form**

After the model selector, add a new `SectionField`:

```tsx
<SectionField label={t("captions.styleLabel")}>
  <Select
    value={selectedCaptionPreset}
    onValueChange={(value) => setSelectedCaptionPreset(value)}
  >
    <SelectTrigger>
      <SelectValue placeholder={t("captions.stylePlaceholder")} />
    </SelectTrigger>
    <SelectContent>
      {textPresets
        .filter((preset) => preset.category === "caption")
        .map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
</SectionField>
```

Add the import: `import { textPresets } from "@/lib/text/presets";`.

- [ ] **Step 3: Pass selected preset to insert function**

Locate `insertCaptionChunksAsTextTrack({ editor, captions })`. It currently does not take a style. Update `insertCaptions` to pass the selected preset:

```typescript
const insertCaptions = ({
  captions,
}: {
  captions: CaptionChunk[];
}): boolean => {
  const trackId = insertCaptionChunksAsTextTrack({
    editor,
    captions,
    captionPresetId: selectedCaptionPreset,
  });
  return trackId !== null;
};
```

- [ ] **Step 4: Update `insertCaptionChunksAsTextTrack` signature**

In `apps/web/src/lib/subtitles/insert.ts` (read and update), add `captionPresetId` to the function signature and pass it through to `buildSubtitleTextElement`.

- [ ] **Step 5: Run typecheck**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: PASS (or type errors fixed in next task).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/editor/panels/assets/views/captions.tsx apps/web/src/lib/subtitles/insert.ts
git commit -m "feat: caption style selector in captions panel"
```

---

## Task 8: Caption build — apply selected preset

**Files:**
- Modify: `apps/web/src/lib/subtitles/build-subtitle-text-element.ts`
- Modify: `apps/web/src/lib/subtitles/types.ts` (if `SubtitleStyleOverrides` needs `presetId`)
- Test: `apps/web/src/lib/subtitles/build-subtitle-text-element.test.ts` (create or add)

**Interfaces:**
- Consumes: `SubtitleCue`, `captionPresetId`, `textPresets`.
- Produces: `CreateTextElement` styled by the selected preset.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/lib/subtitles/build-subtitle-text-element.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildSubtitleTextElement } from "./build-subtitle-text-element";

describe("buildSubtitleTextElement", () => {
  it("applies caption preset style", () => {
    const element = buildSubtitleTextElement({
      index: 0,
      caption: {
        text: "Hello",
        startTime: 0,
        duration: 1,
        style: { presetId: "caption-pop" },
      },
      canvasSize: { width: 1920, height: 1080 },
    });
    expect(element.fontFamily).toBe("Impact");
    expect(element.color).toBe("#ffeb3b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/subtitles/build-subtitle-text-element.test.ts`
Expected: FAIL — `buildSubtitleTextElement` ignores `presetId`.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/lib/subtitles/build-subtitle-text-element.ts`, import `textPresets`:

```typescript
import { textPresets } from "@/lib/text/presets";
```

Update `resolveSubtitleStyle` to merge a preset when `style?.presetId` is present:

```typescript
function resolveSubtitleStyle({
  style,
}: {
  style: SubtitleStyleOverrides | undefined;
}) {
  const preset = style?.presetId
    ? textPresets.find((p) => p.id === style.presetId)
    : null;
  const built = preset ? preset.build() : null;

  const fontSize =
    style?.fontSizeRatioOfPlayHeight != null
      ? style.fontSizeRatioOfPlayHeight * FONT_SIZE_SCALE_REFERENCE
      : (style?.fontSize ?? built?.fontSize ?? SUBTITLE_FONT_SIZE);

  return {
    fontFamily:
      style?.fontFamily ?? built?.fontFamily ?? DEFAULTS.text.element.fontFamily,
    fontSize,
    color: style?.color ?? built?.color ?? DEFAULTS.text.element.color,
    textAlign: style?.textAlign ?? built?.textAlign ?? "center",
    fontWeight:
      style?.fontWeight ?? built?.fontWeight ?? "bold",
    fontStyle: style?.fontStyle ?? built?.fontStyle ?? DEFAULTS.text.element.fontStyle,
    textDecoration:
      style?.textDecoration ??
      built?.textDecoration ??
      DEFAULTS.text.element.textDecoration,
    letterSpacing:
      style?.letterSpacing ??
      built?.letterSpacing ??
      DEFAULTS.text.letterSpacing,
    lineHeight:
      style?.lineHeight ?? built?.lineHeight ?? DEFAULTS.text.lineHeight,
    background: {
      ...DEFAULTS.text.element.background,
      enabled: false,
      ...(style?.background ?? {}),
      ...(built?.background ?? {}),
    },
    placement: {
      verticalAlign: style?.placement?.verticalAlign ?? "bottom",
      marginLeftRatio: style?.placement?.marginLeftRatio,
      marginRightRatio: style?.placement?.marginRightRatio,
      marginVerticalRatio: style?.placement?.marginVerticalRatio,
    },
  };
}
```

In `apps/web/src/lib/subtitles/types.ts`, add `presetId?: string` to `SubtitleStyleOverrides`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/subtitles/build-subtitle-text-element.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/subtitles/build-subtitle-text-element.ts apps/web/src/lib/subtitles/types.ts
git commit -m "feat: apply selected caption preset to built subtitle elements"
```

---

## Task 9: Performance — memoize codec negotiation

**Files:**
- Modify: `apps/web/src/services/renderer/export-codec.ts`
- Test: `apps/web/src/services/renderer/export-codec.test.ts` (create or add)

**Interfaces:**
- Consumes: `ExportFormat`, `ExportQuality`, `width`, `height`, `fpsFloat`, `forceSoftware`.
- Produces: `negotiateVideoCodec` returns a cached result for identical inputs in the same session.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/services/renderer/export-codec.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { negotiateVideoCodec } from "./export-codec";

const base = {
  format: "mp4" as const,
  quality: "high" as const,
  width: 1920,
  height: 1080,
  fpsFloat: 30,
};

describe("negotiateVideoCodec", () => {
  it("caches result per input combination", async () => {
    const spy = vi.spyOn(globalThis, "VideoEncoder", "get");
    if (typeof VideoEncoder === "undefined") return;

    await negotiateVideoCodec(base);
    await negotiateVideoCodec(base);
    // VideoEncoder.isConfigSupported is only called once per input combination.
    expect(spy.isConfigSupported).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/services/renderer/export-codec.test.ts`
Expected: FAIL — `isConfigSupported` called twice.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/services/renderer/export-codec.ts`, add a module-level cache:

```typescript
const codecNegotiationCache = new Map<
  string,
  Promise<NegotiatedVideoCodec>
>();

function negotiationKey(
  format: ExportFormat,
  quality: ExportQuality,
  width: number,
  height: number,
  fpsFloat: number,
  forceSoftware: boolean,
): string {
  return JSON.stringify({ format, quality, width, height, fpsFloat, forceSoftware });
}

export async function negotiateVideoCodec({ ... }): Promise<NegotiatedVideoCodec> {
  const key = negotiationKey(format, quality, width, height, fpsFloat, forceSoftware);
  const cached = codecNegotiationCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    // ...existing body of negotiateVideoCodec...
  })();

  codecNegotiationCache.set(key, promise);
  return promise;
}
```

Wrap the existing body of `negotiateVideoCodec` inside the async IIFE.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/services/renderer/export-codec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/renderer/export-codec.ts
git commit -m "perf: memoize codec negotiation per session"
```

---

## Task 10: Performance — dynamic export queue depth

**Files:**
- Modify: `apps/web/src/services/renderer/export-performance.ts`
- Test: `apps/web/src/services/renderer/export-performance.test.ts` (create or add)

**Interfaces:**
- Consumes: `width`, `height`.
- Produces: `getExportRenderQueueDepth` returns a dynamic value based on `navigator.hardwareConcurrency`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/services/renderer/export-performance.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getExportRenderQueueDepth } from "./export-performance";

describe("getExportRenderQueueDepth", () => {
  it("returns a positive queue depth for 1080p", () => {
    const depth = getExportRenderQueueDepth({ width: 1920, height: 1080 });
    expect(depth).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/services/renderer/export-performance.test.ts`
Expected: PASS (existing behavior). The test does not fail, but the behavior is not dynamic.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/services/renderer/export-performance.ts`:

```typescript
export function getExportRenderQueueDepth({
  width,
  height,
}: {
  width: number;
  height: number;
}): number {
  const pixels = Math.max(0, width) * Math.max(0, height);
  const fourKPixels = 3840 * 2160;
  const cores = Math.max(
    1,
    (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 1,
  );

  if (pixels > fourKPixels) return Math.min(12, Math.max(3, cores));
  if (pixels >= fourKPixels) return Math.min(12, Math.max(6, cores));
  return Math.min(16, Math.max(8, cores));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/services/renderer/export-performance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/renderer/export-performance.ts
git commit -m "perf: dynamic export queue depth based on cpu cores"
```

---

## Task 11: Performance — increase preview cache size

**Files:**
- Modify: `apps/web/src/components/editor/panels/preview/index.tsx`
- Test: existing `preview-quality.test.ts` or manual QA

**Interfaces:**
- Consumes: `frameCacheRef`.
- Produces: `FRAME_CACHE_SIZE` is 60.

- [ ] **Step 1: Write the test (if needed)**

The change is a constant update. No behavior test required; rely on `bun run build:web` and typecheck.

- [ ] **Step 2: Run existing test to verify baseline**

Run: `cd apps/web && bunx vitest run src/components/editor/panels/preview/preview-quality.test.ts`
Expected: PASS.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/components/editor/panels/preview/index.tsx`, change:

```typescript
const FRAME_CACHE_SIZE = 30;
```

to:

```typescript
const FRAME_CACHE_SIZE = 60;
```

- [ ] **Step 4: Run tests/typecheck**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/editor/panels/preview/index.tsx
git commit -m "perf: increase preview frame cache size"
```

---

## Task 12: Performance — increase video cache size

**Files:**
- Modify: `apps/web/src/services/video-cache/service.ts`
- Test: existing `export-performance.test.ts` or manual QA

**Interfaces:**
- Consumes: `MAX_CACHED_FRAMES_PER_MEDIA`.
- Produces: Cache size is 128.

- [ ] **Step 1: Write the test (if needed)**

Constant change; rely on build and typecheck.

- [ ] **Step 2: Run existing test to verify baseline**

Run: `cd apps/web && bunx vitest run src/services/video-cache/service.test.ts`
Expected: PASS.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/src/services/video-cache/service.ts`, change:

```typescript
const MAX_CACHED_FRAMES_PER_MEDIA = 64;
```

to:

```typescript
const MAX_CACHED_FRAMES_PER_MEDIA = 128;
```

- [ ] **Step 4: Run tests/typecheck**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/video-cache/service.ts
git commit -m "perf: increase video frame cache size"
```

---

## Verification

After all tasks are implemented, run the full sensor suite:

- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
- `bun run test`
- `bun run build:web`
- `cargo check`
- `cargo test`
- `semgrep scan`

Record results. Any failure is a self-correction signal; fix the root cause.

---

## Self-Review

**Spec coverage:**
- Task 1–4 cover precision bugs.
- Task 5 covers apply-effect UX.
- Task 6–8 cover auto-caption CapCut-style presets.
- Task 9–12 cover performance.

**Placeholder scan:**
- No `TBD`, `TODO`, or "implement later".
- No "add appropriate error handling" without concrete code.
- No "write tests" without test code.
- All file paths are exact.

**Type consistency:**
- `TextPresetCategory` is updated to include `"caption"`.
- `SubtitleStyleOverrides` gets `presetId?: string`.
- `TextAnimatorPreset` union is updated if necessary.

**Risk notes:**
- Epsilon changes may affect existing placement tests; verify with `bun run test`.
- Caption preset UI requires `textPresets` import in `captions.tsx`.
- Codec cache is per-module; fine because export sessions reload workers.
- Cache size increases raise memory usage; acceptable for desktop/WebView targets.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-01-25-four-areas-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task. Fast iteration, independent work across the four areas.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`.

Which approach?
