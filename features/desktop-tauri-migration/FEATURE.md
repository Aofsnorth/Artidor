# Feature: Desktop Tauri Migration

## Goal

Replace the GPUI desktop app with a Tauri 2.0 shell that reuses the
existing Next.js web frontend for UI and the existing Rust crates
(`compositor`, `gpu`, `effects`, `masks`) for native rendering and
export. This gives us:

- **UI parity for free** — same React components, no rewrite
- **Top 1 rendering** — native WGPU instead of WASM OffscreenCanvas
- **Top 1 export** — native FFmpeg pipeline instead of browser MediaRecorder
- **Small binary** — Tauri uses system WebView, no Chromium bundle

## Why

The GPUI approach required rewriting 100+ web components in Rust/GPUI.
That is weeks of work just for parity, with no rendering or export
advantage. Tauri gives us the same UI for free and a better backend.

## Architecture

```text
Tauri Window (native)
├── WebView running Next.js (same code as web app)
│   └── Detects Tauri runtime → switches to IPC backend
└── Rust process (native)
    ├── WGPU compositor (existing rust/crates/compositor)
    ├── FFmpeg export (new, native)
    └── File I/O (native, no browser sandbox)
```

## Scope

- **In scope**:
  - `apps/desktop/` — replace GPUI with Tauri
  - `apps/web/src/lib/tauri/` — Tauri IPC bridge (detect + invoke)
  - `Cargo.toml` — add `tauri` workspace member
  - `apps/desktop/src-tauri/` — Tauri commands (Rust)

- **Out of scope** (no changes):
  - `rust/crates/compositor` — used as-is
  - `rust/crates/gpu` — used as-is
  - `rust/crates/effects` — used as-is
  - `rust/crates/masks` — used as-is
  - `apps/web/src/components/` — UI unchanged

## Alignment

- ROADMAP.md: P1 "Performance improvements" + P2 "UI polish"
- User explicitly approved full switch
- No sensitive paths touched (rust/ core logic unchanged)

## User-facing impact

Yes — desktop app gets:

1. Exact web UI (parity)
2. Faster rendering (native WGPU)
3. Faster export (native FFmpeg)
4. Smaller download (no Chromium)
