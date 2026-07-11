# Transcription Performance Design

**Goal:** Minimize local Whisper transcription latency while preserving a reliable browser fallback and exposing real-time progress.

## Scope

- Prefer ONNX WebGPU when `navigator.gpu` is available.
- Fall back to single-threaded ONNX WASM when WebGPU initialization or inference fails.
- Keep the user-selected Whisper model: Tiny optimizes latency, Small balances latency and accuracy, Large v3 Turbo optimizes accuracy on GPU-capable devices.
- Show a persistent processing card while transcription runs: current stage, model, active backend, model-download percentage, elapsed time, indeterminate inference state, and Cancel.
- Do not add dependencies or change CSP.

## Architecture

`worker.ts` owns backend selection and emits structured progress updates. It tries WebGPU first, then reinitializes the same model with safe WASM settings on failure. `service.ts` maps worker events to `TranscriptionProgress`; `captions.tsx` renders those values without polling.

Worker progress includes backend and phase. Download progress remains a byte-weighted percentage. Inference is indeterminate because the current Transformers.js pipeline does not provide reliable per-chunk progress; the UI shows elapsed time rather than inventing a percentage.

## Error Handling

- WebGPU attempt failure falls back once to WASM.
- WASM failure surfaces the original actionable error.
- Cancel terminates the active request and clears the processing card.
- Existing CSP-safe WASM configuration remains unchanged.

## Testing

- Unit-test backend choice: GPU available selects WebGPU; unavailable selects WASM; GPU initialization failure retries on WASM exactly once.
- Unit-test progress mapping: backend, download percent, and indeterminate transcribing stage survive service mapping.
- Component-level test: processing state renders backend, percent for downloads, elapsed state for inference, and Cancel.
- Run focused Bun tests, Biome, TypeScript check; manually test WebGPU and WASM browsers.

## Non-goals

- No universal “top 1” claim without hardware and audio benchmark data.
- No remote ASR API, streaming transcription, word timestamps, or new model download manager.
- No automatic model switching that overrides the user selection.
