# Feature: Desktop Native (Win32 API)

## Goal

Build a **100% native Win32 API** desktop shell for Artidor in a new
`apps/desktop-native/` crate, with **1:1 UI parity** to the existing
Next.js web app (`apps/web`). The web app is **kept and still shipped**
— this is a parallel native path, not a replacement.

Win32 API is accessed from Rust via the official Microsoft `windows`
crate (windows-rs), which provides direct Rust bindings to the Win32
API. This keeps the same toolchain as the rest of the repo
(`rust/crates`, `apps/desktop-web/src-tauri`) and lets the native shell
reuse the existing Rust core crates (`compositor`, `gpu`, `effects`,
`masks`, `time`) via path dependencies later.

## Why

The owner explicitly requested a full native Win32 rewrite with 1:1
design, as a separate workspace that does not delete the web app.

This conflicts with `ROADMAP.md`, which lists **Tauri 2.0** as the
official desktop shell (and Tauri already reuses the web app 1:1 via a
WebView). The owner has explicitly overridden the roadmap for this work
(see "Roadmap alignment" below and the approval note added to
`ROADMAP.md`). The Tauri migration (`feat/desktop-tauri-migration`,
Phases 4–7 pending) continues independently; both native paths coexist.

## Architecture (target)

```
Win32 native window (Rust + windows-rs)
├── Win32 windowing + message loop (CreateWindowExW, WndProc)
├── Rendering surface
│   ├── Direct2D/Direct3D (WGPU via existing rust/crates/gpu)
│   └── composites frames from rust/crates/compositor
├── Native UI panels (1:1 with apps/web/src/components/editor)
│   ├── header, viewport, timeline, assets, inspector, footer
│   └── AI copilot panel, collab, dialogs, teleprompter
├── Native file I/O + media (reuse rust/crates, native FFmpeg)
└── State (mirrors the 30+ Zustand stores in apps/web/src/stores)
```

## Scope

- **In scope**:
  - `apps/desktop-native/` — new standalone Rust crate (Win32 shell)
  - `features/desktop-native-win32/` — this feature folder (harness)
  - `ROADMAP.md` — record owner approval for the Win32 path

- **Out of scope** (no changes):
  - `apps/web/**` — web app untouched and still shipped
  - `apps/desktop-web/**` — Tauri path untouched and still active
  - `rust/crates/**` — core logic reused as-is later (read-only for now)
  - Root `Cargo.toml` — NOT edited (sensitive path); crate is standalone
  - CI / `.github/**` — not touched

## Roadmap alignment (OVERRIDE — owner approved)

- `ROADMAP.md` "Not Allowed Without Approval": "Large rewrite (Tauri
  migration is the current approved exception)."
- This Win32 rewrite is a **new large rewrite**, NOT the approved
  exception.
- **Owner decision (2026-06-27)**: override the roadmap and approve the
  Win32 native path as a parallel desktop shell. Recorded in
  `ROADMAP.md` under a new "Approved overrides" note.
- The Prime Directive ("smallest safe change") is honored by building
  **incrementally from the smallest working unit** (a single native
  window) and growing toward 1:1 parity over multiple increments.

## Realism note

The web app is ~176k lines of TypeScript across 1,051 files, 225
components, 121 services, and 30+ stores. A literal 1:1 native rewrite
is a multi-increment effort (weeks to months), not a single session.
Per the owner's direction ("start from the smallest"), each increment
is the smallest unit that compiles, runs, and is independently
verifiable. See `PLAN.md` for the phased breakdown.

## User-facing impact

Not yet. Increment 0 is a blank native window (internal scaffold). The
What's New feed will be updated when a user-visible native surface
exists (planned around Increment 3–4). Reason documented per
`RULES.md` "What's New Rules".
