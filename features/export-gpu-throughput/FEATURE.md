# Feature: Export GPU throughput

## Problem

Parallel browser export starts workers primarily from CPU/RAM counts. Each worker creates a WebGPU compositor and decoder, so high worker counts can contend for one GPU, exhaust VRAM, and lower export throughput. Brave GPU utilization alone does not identify whether rendering, encoding, decoding, or audio is limiting the export.

## Goal

Choose a conservative GPU-aware parallel worker limit and emit enough export diagnostics to identify the active bottleneck without blocking export.

## Non-Goals

- No claim that a browser can or should hold GPU utilization at 100%.
- No native FFmpeg/Tauri pipeline rewrite in this feature.
- No output format or quality change.

## Roadmap Alignment

- [ ] P0 Critical
- [x] P1 Important
- [ ] P2 Nice to Have
- [ ] Not on roadmap, approval required

## What's New

- [x] Yes
- [ ] No

Reason: exports on GPU-heavy projects use safer concurrency and expose more reliable diagnostics.

## Acceptance Criteria

- [ ] Worker count considers frame pixel count and GPU availability.
- [ ] High-resolution exports avoid unsafe WebGPU worker fan-out.
- [ ] Unit tests cover scheduler boundaries.
- [ ] Export diagnostics identify codec, chosen worker count, and GPU-aware cap.

## Affected Areas

- [x] `apps/web`
- [ ] `rust`
- [ ] `packages/mcp-server`
- [x] `docs`
- [x] tests
