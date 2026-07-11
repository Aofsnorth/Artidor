# Transcription Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefer local WebGPU Whisper inference, fall back safely to WASM, and show truthful transcription progress in the Captions panel.

**Architecture:** The worker owns backend attempts and reports the selected backend alongside initialization and inference events. The service translates worker events into UI-safe progress data. The Captions view renders an event-driven processing card with byte-weighted download percentage, indeterminate inference, elapsed time, backend, and cancellation.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@huggingface/transformers`, ONNX Runtime, Bun tests, Biome.

## Global Constraints

- Prefer `device: "webgpu"`; retry exactly once with `device: "wasm"` after a WebGPU initialization or inference failure.
- Keep the selected Whisper model; do not add automatic model selection.
- Retain CSP-safe `useWasmCache = false` and safe WASM fallback settings.
- Do not add dependencies, remote ASR, fabricated transcription percentages, or word timestamps.
- Use existing `Progress`, `Spinner`, and `Button` components.
- Test before implementation; run focused Bun tests, Biome, and `bunx tsc --noEmit -p apps/web/tsconfig.json`.

---

### Task 1: Backend Selection Contract

**Files:**
- Create: `apps/web/src/services/transcription/backend.ts`
- Create: `apps/web/src/services/transcription/backend.test.ts`
- Modify: `apps/web/src/lib/transcription/types.ts`

**Interfaces:**
- Produces `TranscriptionBackend = "webgpu" | "wasm"`.
- Produces `getTranscriptionBackends({ webGpuAvailable }): TranscriptionBackend[]`.
- Extends `TranscriptionProgress` with optional `backend` and `isIndeterminate`.

- [ ] **Step 1: Write failing tests**

```ts
import { expect, test } from "bun:test";
import { getTranscriptionBackends } from "./backend";

test("prefers WebGPU and preserves a WASM fallback", () => {
  expect(getTranscriptionBackends({ webGpuAvailable: true })).toEqual([
    "webgpu",
    "wasm",
  ]);
});

test("uses WASM when WebGPU is unavailable", () => {
  expect(getTranscriptionBackends({ webGpuAvailable: false })).toEqual(["wasm"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```sh
bun test apps/web/src/services/transcription/backend.test.ts
```

Expected: FAIL because `./backend` does not exist.

- [ ] **Step 3: Write minimal backend selection code**

```ts
export type TranscriptionBackend = "webgpu" | "wasm";

export function getTranscriptionBackends({
  webGpuAvailable,
}: {
  webGpuAvailable: boolean;
}): TranscriptionBackend[] {
  return webGpuAvailable ? ["webgpu", "wasm"] : ["wasm"];
}
```

Extend the existing progress type:

```ts
import type { TranscriptionBackend } from "@/services/transcription/backend";

export interface TranscriptionProgress {
  status: TranscriptionStatus;
  progress: number;
  message?: string;
  backend?: TranscriptionBackend;
  isIndeterminate?: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```sh
bun test apps/web/src/services/transcription/backend.test.ts
```

Expected: 2 pass, 0 fail.

- [ ] **Step 5: Commit**

```sh
git add apps/web/src/services/transcription/backend.ts apps/web/src/services/transcription/backend.test.ts apps/web/src/lib/transcription/types.ts
git commit -m "Prefer WebGPU transcription backend"
```

### Task 2: WebGPU Attempt and WASM Retry

**Files:**
- Modify: `apps/web/src/services/transcription/worker.ts`
- Modify: `apps/web/src/services/transcription/service.ts`
- Modify: `apps/web/src/services/transcription/onnx-runtime.ts`
- Modify: `apps/web/src/services/transcription/onnx-runtime.test.ts`

**Interfaces:**
- Consumes `getTranscriptionBackends()` from Task 1.
- Worker `init-progress` and `transcribe-progress` responses include `backend`.
- Service supplies `backend` and `isIndeterminate` to `onProgress`.

- [ ] **Step 1: Write failing runtime configuration test**

```ts
test("only applies WASM restrictions to the WASM fallback", () => {
  const runtime = {
    useWasmCache: true,
    backends: { onnx: { wasm: { numThreads: 4, proxy: true } } },
  };

  configureOnnxRuntime({ runtime, backend: "webgpu" });

  expect(runtime.useWasmCache).toBeFalse();
  expect(runtime.backends.onnx.wasm.numThreads).toBe(4);
  expect(runtime.backends.onnx.wasm.proxy).toBeTrue();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```sh
bun test apps/web/src/services/transcription/onnx-runtime.test.ts
```

Expected: FAIL because `configureOnnxRuntime` does not accept a backend option.

- [ ] **Step 3: Configure the actual backend**

Change `configureOnnxRuntime` to receive `{ runtime, backend }`. Always set `useWasmCache = false`. Apply `numThreads = 1` and `proxy = false` only for `backend === "wasm"`. Keep WebGPU settings untouched.

- [ ] **Step 4: Attempt WebGPU then WASM in the worker**

Create an internal worker loader with this behavior:

```ts
for (const backend of getTranscriptionBackends({
  webGpuAvailable: typeof navigator !== "undefined" && Boolean(navigator.gpu),
})) {
  try {
    configureOnnxRuntime({ runtime: env, backend });
    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      dtype: "fp32",
      device: backend,
      progress_callback,
    });
    self.postMessage({ type: "backend-selected", backend });
    return;
  } catch (error) {
    lastError = error;
    transcriber = null;
  }
}
throw lastError ?? new Error("No transcription backend is available");
```

Add `backend-selected` to `WorkerResponse`. Preserve exactly one fallback: the worker should never re-attempt WebGPU after a WASM error.

For an inference failure on WebGPU, terminate the pipeline instance, emit a fallback message, initialize the selected model once on WASM, and retry the same audio once. Do not retry inference errors from WASM.

- [ ] **Step 5: Map backend and inference state in the service**

On `backend-selected`, store the active backend for the request. For model download events, forward `{ status: "loading-model", progress, backend, isIndeterminate: false }`. For inference events, forward `{ status: "transcribing", progress: 0, backend, isIndeterminate: true }`.

- [ ] **Step 6: Run focused tests**

Run:

```sh
bun test apps/web/src/services/transcription/backend.test.ts apps/web/src/services/transcription/onnx-runtime.test.ts apps/web/src/services/transcription/segments.test.ts
```

Expected: all pass.

- [ ] **Step 7: Commit**

```sh
git add apps/web/src/services/transcription/worker.ts apps/web/src/services/transcription/service.ts apps/web/src/services/transcription/onnx-runtime.ts apps/web/src/services/transcription/onnx-runtime.test.ts
git commit -m "Add WebGPU transcription fallback"
```

### Task 3: Processing State and Loading Card

**Files:**
- Create: `apps/web/src/lib/transcription/processing-state.ts`
- Create: `apps/web/src/lib/transcription/processing-state.test.ts`
- Modify: `apps/web/src/components/editor/panels/assets/views/captions.tsx`

**Interfaces:**
- Consumes `TranscriptionProgress` from Task 1.
- Produces a UI state with `step`, `progress: number | null`, `backend`, and `startedAt`.
- The Captions view imports existing `Progress` from `@/components/ui/progress`.

- [ ] **Step 1: Write failing progress conversion tests**

```ts
import { expect, test } from "bun:test";
import { getProcessingUpdate } from "./processing-state";

test("keeps model download percentage", () => {
  expect(getProcessingUpdate({
    status: "loading-model",
    progress: 42,
    backend: "webgpu",
  })).toEqual({
    step: "Loading model",
    progress: 42,
    backend: "webgpu",
  });
});

test("keeps inference progress indeterminate", () => {
  expect(getProcessingUpdate({
    status: "transcribing",
    progress: 0,
    backend: "wasm",
    isIndeterminate: true,
  })).toEqual({
    step: "Transcribing audio",
    progress: null,
    backend: "wasm",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```sh
bun test apps/web/src/lib/transcription/processing-state.test.ts
```

Expected: FAIL because `./processing-state` does not exist.

- [ ] **Step 3: Write minimal progress conversion code**

```ts
export function getProcessingUpdate({
  status,
  progress,
  backend,
  isIndeterminate,
}: TranscriptionProgress): {
  step: string;
  progress: number | null;
  backend?: TranscriptionBackend;
} {
  if (status === "loading-model") {
    return { step: "Loading model", progress, backend };
  }
  return {
    step: "Transcribing audio",
    progress: isIndeterminate ? null : progress,
    backend,
  };
}
```

- [ ] **Step 4: Render the loading card**

Extend `ProcessingState` with `progress: number | null`, `backend?: TranscriptionBackend`, and `startedAt: number`. Update `handleProgress` through `getProcessingUpdate`.

Render this only while `isProcessing`:

```tsx
<div className="border-border/70 bg-muted/35 flex flex-col gap-2 border p-3" aria-live="polite">
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="flex min-w-0 items-center gap-2">
      <Spinner className="shrink-0" />
      <span className="truncate">{processing.step}</span>
    </span>
    {processing.backend && <span className="text-muted-foreground text-xs uppercase">{processing.backend}</span>}
  </div>
  {processing.progress === null ? (
    <p className="text-muted-foreground text-xs">Running inference · {elapsedLabel}</p>
  ) : (
    <>
      <Progress value={processing.progress} />
      <p className="text-muted-foreground text-xs">{Math.round(processing.progress)}% downloaded · {elapsedLabel}</p>
    </>
  )}
</div>
```

Use `useEffect` to update elapsed seconds only while `isProcessing`; clean up the interval. Keep button spinner as an affordance, preserve button disable rules, and retain the existing explicit Cancel button.

- [ ] **Step 5: Run focused tests**

Run:

```sh
bun test apps/web/src/lib/transcription/processing-state.test.ts apps/web/src/lib/subtitles/caption-cues.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```sh
git add apps/web/src/lib/transcription/processing-state.ts apps/web/src/lib/transcription/processing-state.test.ts apps/web/src/components/editor/panels/assets/views/captions.tsx
git commit -m "Show transcription progress details"
```

### Task 4: Full Verification

**Files:**
- Modify only when verification exposes a defect in Task 1-3.

**Interfaces:**
- No new interfaces.

- [ ] **Step 1: Format touched files**

Run:

```sh
bunx biome format apps/web/src/services/transcription/backend.ts apps/web/src/services/transcription/backend.test.ts apps/web/src/services/transcription/worker.ts apps/web/src/services/transcription/service.ts apps/web/src/services/transcription/onnx-runtime.ts apps/web/src/services/transcription/onnx-runtime.test.ts apps/web/src/lib/transcription/types.ts apps/web/src/lib/transcription/processing-state.ts apps/web/src/lib/transcription/processing-state.test.ts apps/web/src/components/editor/panels/assets/views/captions.tsx --write
```

Expected: format succeeds.

- [ ] **Step 2: Run static checks**

Run:

```sh
bunx biome check apps/web/src/services/transcription/backend.ts apps/web/src/services/transcription/backend.test.ts apps/web/src/services/transcription/worker.ts apps/web/src/services/transcription/service.ts apps/web/src/services/transcription/onnx-runtime.ts apps/web/src/services/transcription/onnx-runtime.test.ts apps/web/src/lib/transcription/types.ts apps/web/src/lib/transcription/processing-state.ts apps/web/src/lib/transcription/processing-state.test.ts apps/web/src/components/editor/panels/assets/views/captions.tsx
bunx tsc --noEmit -p apps/web/tsconfig.json
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the regression suite**

Run:

```sh
bun test apps/web/src/services/transcription/backend.test.ts apps/web/src/services/transcription/onnx-runtime.test.ts apps/web/src/services/transcription/segments.test.ts apps/web/src/lib/transcription/processing-state.test.ts apps/web/src/lib/subtitles/caption-cues.test.ts
```

Expected: all pass.

- [ ] **Step 4: Manual browser verification**

1. Start `bun --cwd apps/web dev`.
2. In a browser with WebGPU, open an editor project and Captions; begin transcription; verify the card shows `webgpu`, model-download percentage, then indeterminate inference with elapsed time; confirm Cancel ends the request.
3. Disable WebGPU or use a browser without it; repeat; verify the card shows `wasm`, captions generate, and no ONNX `blob:` error or cross-attention timestamp error appears.
4. Record benchmark rows for the same 60-second audio: browser, backend, model, warm/cold, model download seconds, inference seconds, real-time factor. Do not claim a global performance ranking until this data exists.

- [ ] **Step 5: Commit verification fixes only when needed**

```sh
git add apps/web/src/services/transcription apps/web/src/lib/transcription apps/web/src/components/editor/panels/assets/views/captions.tsx
git commit -m "Verify transcription acceleration"
```
