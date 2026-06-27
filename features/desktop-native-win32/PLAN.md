# Plan: Desktop Native (Win32 API)

Approach: **smallest safe increment first**, each one compiles, runs,
and is independently verifiable. No big-bang rewrite. This honors the
Prime Directive and the owner's "start from the smallest" direction.

## Increment 0 — Native window scaffold (THIS session)

- [x] Create `features/desktop-native-win32/` harness (FEATURE/PLAN/RISKS)
- [x] Create `apps/desktop-native/` standalone Rust crate
  - `Cargo.toml`: own `[workspace]` (decoupled from root workspace so the
    sensitive root `Cargo.toml` is NOT edited)
  - `src/main.rs`: minimal Win32 window (register class, CreateWindowExW,
    message loop, WndProc handling WM_PAINT/WM_DESTROY)
  - `README.md`: build/run + status
- [x] Add `windows` crate dependency (`cargo add`) with minimal features
- [x] `cargo build` passes (and `cargo run` launches the window)
- [x] Record owner override in `ROADMAP.md`

**Done when**: `cargo build` succeeds inside `apps/desktop-native/` and
the binary launches a native Win32 window titled "Artidor — Native".
**STATUS: DONE (2026-06-27)** — see STATE.md.

## Increment 1 — Top-1 preview foundation: native WGPU/D3D12 surface

- [x] Add path-deps `compositor` + `gpu` (repo's own crates, same pattern
  as `apps/desktop-web/src-tauri`) and `pollster` (minimal executor)
- [x] `Renderer`: `block_on(GpuContext::new())` + `Compositor::new`, then
  create a `wgpu::Surface<'static>` from the HWND via
  `Instance::create_surface_unsafe(SurfaceTargetUnsafe::RawHandle{...})`
  with `wgpu::rwh::Win32WindowHandle` (D3D12 on Windows = top-1 path,
  zero CPU readback, GPU -> swap chain -> screen)
- [x] Render `FrameDescriptor` minimal (clear `#111114`) directly to the
  surface via `compositor.render_frame(context, RenderFrameOptions{...})`
- [x] Wire to `WM_PAINT`/`WM_SIZE`; suppress `WM_ERASEBKGND` once the
  compositor owns the client area (no white flash); drop renderer in
  `WM_DESTROY` while the HWND is still valid (surface safety contract)
- [x] Graceful init-failure path: `MessageBox` (no silent failure), app
  keeps running with white GDI fallback
- [x] `cargo build` clean (zero warnings), `cargo fmt`, launch stays alive

**Done when**: `cargo run` shows white GDI fallback for one frame, then
flips to dark `#111114` rendered by the native D3D12 compositor.
**STATUS: DONE (2026-06-27)** — see STATE.md. Visual proof is a manual
QA step (`cargo run`); process-liveness + clean build verified here.

## Increment 1 — App shell layout (1:1 frame)

- Reproduce the web app's top-level frame 1:1:
  - native title bar / header (logo, project name, window controls)
  - main region split (viewport + right panel)
  - footer / status bar
- Hard-coded layout, no real data yet.
- Use Direct2D (or GDI for the simplest fills) to draw the chrome.
- Verify visually against `apps/web` editor layout proportions.

## Increment 2 — UI chrome 1:1 (header + split + footer)

- [x] Reproduce the web app's top-level frame 1:1 around the DX12 viewport:
  - header bar h-48, `#111114` + top hairline + "Artidor"
  - TabBar rail w-72 (`#08080a` + border)
  - top row: tools | preview | properties (28% / 47% / 25%, 8px gaps)
  - timeline below the top row (mainContent 64% / timeline 36%)
  - footer h-36 (`#111114`→`#08080a` + "1080p • 30 fps • 16:9 • Stereo")
- [x] Child-window architecture: D3D12 surface on a `WS_CHILD` HWND at
  the preview rect (DXGI presents over the child only; GDI draws chrome
  on the parent — no DXGI/GDI conflict). Resize repositions the child.
- [x] GDI chrome (no new dep): `fill_rect`, `border_rect` (HOLLOW_BRUSH),
  `draw_text_centered` via `DrawTextW`.
- [x] `WM_DESTROY` destroys the child first (surface dropped while child
  HWND valid = wgpu safety contract).
- [x] `cargo build` clean (zero warnings), `cargo fmt`, launch alive 5s+.

**Done when**: `cargo run` shows the dark editor frame 1:1 with the web
app proportions, D3D12 viewport in the preview panel.
**STATUS: DONE (2026-06-27)** — see STATE.md. Visual proof is manual QA
(`cargo run`); process-liveness + clean build verified here.

## Increment 3 — State + data model bridge

- [x] Reuse `rust/crates/time` via path-dep (`FrameRate`, `MediaTime`) —
  anti-duplication of timeline math.
- [x] `src/state.rs`: minimal typed model (`CanvasSize`, `ProjectMetadata`,
  `ProjectSettings`, `Playhead`, `Project`) mirroring
  `apps/web/src/lib/project/types.ts` (local-first subset — no cloud
  fields, no scene/track data yet).
- [x] Helpers match web semantics: `aspect_label`, `fps_label`, `rename`
  validation, `seek_seconds`/`seek_frame` (NaN/overflow rejection).
- [x] Unit tests: **13 passed, 0 failed** (default canvas/aspect,
  settings, untitled defaults, rename validation, playhead round-trips,
  frame alignment, footer label format).
- [x] `cargo build` clean (dead-code warnings expected — UI wiring is
  Increment 4).

**Done when**: `cargo test` passes and the model compiles.
**STATUS: DONE (2026-06-27)** — see STATE.md.

## Increment 4 — State model wired to UI

- [x] `WindowState` struct: `Project` + child HWND in parent
  `GWLP_USERDATA` (no globals).
- [x] `paint_chrome` takes `&Project`; header = project name, footer =
  settings (height/fps/aspect from `ProjectSettings`), timeline =
  playhead seconds + frame, properties = project id/version/duration.
- [x] `main()` seeds `Project::new_untitled` with a real epoch timestamp.
- [x] `WM_DESTROY` drops `WindowState` + destroys child (surface safety).
- [x] `cargo build` clean, `cargo test` 13 passed, launch alive 5s+.

**Done when**: chrome renders from the live project model (not
hard-coded labels).
**STATUS: DONE (2026-06-27)** — see STATE.md.

## Increment 4b — Interactive timeline panel content

- [x] `state.rs`: `TrackType`, `Track`, `Scene` (minimal subset of web
  `timeline/types.ts`). `Project` holds a `scene` (default: one "Main"
  video track). `add_track`, `toggle_track_mute`, `seek_relative_frame`.
- [x] 6 new unit tests (track/scene defaults, add/toggle, seek-relative
  clamp, track-type labels) — **19 tests total, all passing**.
- [x] `draw_timeline_tracks()`: track list with type-tag colour + name +
  muted/hidden flags + playhead readout strip.
- [x] `WM_KEYDOWN`: arrow-left/right = seek one frame back/forward
  (wires `seek_relative_frame`, resolves its dead-code warning).
- [x] `cargo build` clean, `cargo test` 19 passed, launch alive 4s+.

**Done when**: timeline panel shows tracks and arrow keys move the
playhead.
**STATUS: DONE (2026-06-27)** — see STATE.md.

## Increment 4c — Track selection + keyboard interactions

- [x] `WindowState.selected_track` (UI state, model stays pure).
- [x] `draw_timeline_tracks`: selected row highlight (brighter border +
  name).
- [x] `WM_KEYDOWN`: Up/Down (select), T (add track cycling types), M
  (toggle mute selected). Wires `add_track` + `toggle_track_mute`
  (resolves their dead-code warnings).
- [x] Readout strip shows all shortcut hints.
- [x] `cargo build` clean, `cargo test` 19 passed, launch alive 4s+.
- [ ] `rename` (needs input dialog — deferred to dialog increment).
- [ ] `seek_seconds` (needs click-to-seek + timeline duration — deferred
  to element/clip-rendering increment).

**Done when**: T/M/Up/Down work and add_track/toggle_track_mute warnings
are resolved.
**STATUS: DONE (2026-06-27)** — see STATE.md. rename/seek_seconds
documented as deferred.

## Increment 4d — Remaining panel content (DONE)

- [x] **4d-1: Rename dialog (Ctrl+R)** — `dialogs::prompt_dialog` via
  `DialogBoxIndirectParamW` with an in-memory `DLGTEMPLATE` (no resource
  file). `TemplateBuilder` handles DWORD alignment. Pre-fills the current
  project name, selects all text. Wires `Project::rename` (resolves its
  dead-code warning). Empty/whitespace names are rejected with a MessageBox.
- [x] **4d-2: Click-to-seek on timeline** — `WM_LBUTTONDOWN` maps the
  click x-position to a time position within the timeline duration,
  calls `Project::seek_seconds` (resolves its dead-code warning).
  `timeline_duration()` uses `metadata.duration_seconds` if non-zero,
  else a 30s minimum display range. Playhead indicator (vertical line)
  drawn on the timeline.
- [x] **4d-3: Property fields panel** — `draw_properties_panel` shows
  project metadata + settings as a field list: Name (with Ctrl+R hint),
  ID, Version, Duration, Canvas (W×H), FPS, Aspect, Tracks/Assets count.
- [x] **4d-4: Element/clip model + clip rendering** — `Element` (id,
  name, start_seconds, duration_seconds) on `Track.elements`.
  `Project::add_element` + `recompute_duration` (max element end across
  all tracks). Clip blocks rendered on each track row (colored by track
  type, positioned by start/duration). 'E' key adds a 5s test clip at
  the playhead position. 6 new tests (41 total).
- [x] `cargo build` clean, `cargo test` 41 passed, `cargo fmt`, launch
  alive 3s+.
- [ ] Full element content rendering (transforms, effects, masks) —
  deferred to the compositor-content increment.
- [ ] Click-to-select / drag elements — deferred to the mouse-interaction
  increment.

**STATUS: DONE (2026-06-27)** — see STATE.md. All four sub-steps
complete. The timeline now shows clip blocks, the properties panel shows
project settings, the playhead is visible and click-to-seek works, and
projects can be renamed via a native dialog.

## Increment 5 — AI copilot + collab + dialogs + teleprompter

- Native equivalents of the remaining editor components.

## Increment 6a — Native project persistence (DONE)

- [x] `serde`/`serde_json`/`thiserror` added (deps decision recorded).
- [x] `Serialize`/`Deserialize` on all model types; `Playhead`
  `#[serde(transparent)]`.
- [x] `persist.rs`: `ProjectFile` (file_version for migrations),
  `save_project` (atomic tmp+rename), `load_project` (version check),
  `default_save_path`, typed `PersistError`. 5 round-trip tests.
- [x] Ctrl+S wired: save to `<id>.artpr.json` + MessageBox.
- [x] `cargo build` clean, `cargo test` 24 passed, launch alive 3s+.

**STATUS: DONE (2026-06-27)** — see STATE.md.

## Increment 6b — Top-1 export via ffmpeg-sidecar (DONE)

- [x] Full FFmpeg dependency decision + approval (user "yang terbaik"
  2026-06-27) in `docs/harness/DEPENDENCY_DECISIONS.md`.
- [x] `ffmpeg-sidecar` added with `default-features = false` (no runtime
  binary download — supply-chain mitigation).
- [x] `src/export.rs`: `ExportOptions` (+ `validate`), typed
  `ExportError`, `export_video` (compositor `render_frame_to_bytes` →
  BGRA via stdin → `-hwaccel auto` encode → `.mp4`), `default_export_path`.
  6 validation tests.
- [x] `Renderer::export_video` reuses preview's GpuContext + Compositor.
- [x] `Ctrl+E` wired: 30-frame (1s) proof clip → `<id>-export.mp4` +
  MessageBox (path / typed error + ffmpeg hint).
- [x] `cargo build` clean, `cargo test` 30 passed, launch alive 3s+.
- [x] Honest MVP scope: clear-colour frames (no elements yet); real
  content flows through the same pipeline once 4d lands.

**STATUS: DONE (2026-06-27)** — see STATE.md. End-to-end export runs
once ffmpeg is on PATH or bundled (packaging = Increment 7).

## Increment 6b-followups (later)

- [ ] Bundle a pinned LGPL FFmpeg binary in the install dir (packaging).
- [ ] Export progress UI (FFmpeg stderr progress parsing via
  ffmpeg-sidecar's iterator).
- [ ] Real frame_count from timeline duration (once elements exist).
- [ ] Native save/export file dialogs (GetSaveFileNameW).

## Increment 6c — Native media import + file dialogs (DONE)

- [x] `src/dialogs.rs` (new) — typed wrappers around `GetOpenFileNameW` /
  `GetSaveFileNameW` (Win32 common dialogs via `windows` crate
  `Win32_UI_Controls_Dialogs` feature). `save_dialog` / `open_dialog`
  return `Option<PathBuf>` (`None` = cancel, `Err` = real failure via
  `CommDlgExtendedError`). `Filter` struct builds the Win32 filter
  buffer. `DialogError` typed (`thiserror`).
- [x] Ctrl+S wired to native "Save As" dialog (replaces the fixed-cwd
  path from 6a). Suggested filename = `<id>.artpr.json`.
- [x] Ctrl+O wired to native "Open" dialog → loads `.artpr.json` →
  replaces editor state (playhead resets, selection resets).
- [x] Ctrl+E export path now comes from a native "Save As" dialog
  (replaces the fixed-cwd export path from 6b).
- [x] `state.rs`: `MediaKind` (Image/Video/Audio/Other, inferred from
  extension), `MediaAsset` (id/name/path/kind, `from_path`), `Project.assets`
  + `add_asset` (deduplicates by path). 5 new tests (35 total).
- [x] Ctrl+I wired to native "Open" dialog → imports a media file as a
  `MediaAsset` (native file path, no blob URL — read via `std::fs`).
- [x] `draw_assets_list`: tools panel renders the asset list (kind tag +
  name per row, empty-state hint "Import media (Ctrl+I)").
- [x] Readout strip updated with all shortcut hints (Ctrl+S/O/I/E).
- [x] `cargo build` clean, `cargo test` 35 passed, `cargo fmt`, launch
  alive 3s+.

**STATUS: DONE (2026-06-27)** — see STATE.md. Native file dialogs +
media import replace the browser's file-picker/IndexedDB path.

## Increment 7 — Workspace integration + CI + docs + What's New

- With explicit approval, add `apps/desktop-native` to root `Cargo.toml`
  `members` (sensitive path — needs sign-off) OR keep standalone.
- CI job for the native crate (mirrors the Tauri CI-exclude pattern).
- Update `AGENTS.md`, `ROADMAP.md`, What's New, release notes.

## Dependency decision — `windows` crate (windows-rs)

- **Why needed**: access the Win32 API (windowing, GDI/Direct2D, message
  loop) from Rust. No existing repo code does this — Tauri abstracts
  windowing internally, so nothing in-repo can be reused for raw Win32.
- **RULES.md order**: this is "Standard platform API" (#3) — the
  `windows` crate is Microsoft's official Rust binding to Win32/COM,
  not an arbitrary third-party dependency.
- **Maintenance**: Microsoft, very active.
- **License**: MIT (compatible with Artidor's MIT LICENSE).
- **Security**: official, FFI bindings only, no network/runtime
  behavior for the windowing features used. No transitive risk for the
  minimal feature set.
- **Bundle/perf**: zero runtime cost; only the requested Win32 features
  are compiled in.
- **Features used (minimal)**: `Win32_Foundation`,
  `Win32_UI_WindowsAndMessaging`, `Win32_Graphics_Gdi`,
  `Win32_System_LibraryLoader`.
- **Alternatives considered**: raw `extern "system"` FFI (rejected —
  reinvents the wheel, violates "prefer existing library"); `windows-sys`
  (rejected — raw FFI, no ergonomic helpers); pure C/C++ Win32 (rejected
  — no integration with existing Rust crates/toolchain).
- **Rollback**: delete `apps/desktop-native/` — fully isolated, no
  shared files touched.

## Sensitive paths touched

- Root `Cargo.toml`: **NOT touched** (crate is standalone with its own
  `[workspace]`). Opting into the root workspace is deferred to
  Increment 7 and requires explicit approval.
- `ROADMAP.md`: edited (Level 1, not sensitive) to record owner override.
- `AGENTS.md`: edited (Level 1) in Increment 7 to document the new path.
- `apps/web/**`, `apps/desktop-web/**`, `rust/**`, CI, secrets: untouched.

## Verification per increment

- `cargo build` (and `cargo test` once logic exists) inside
  `apps/desktop-native/`.
- Manual visual parity check against `apps/web` for UI increments.
- No effect on web/Tauri builds (crate is isolated).
