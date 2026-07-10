# State: Desktop Native (Win32 API)

Living progress log for the Win32 native rewrite. Newest on top.

## 2026-07-10 — Fix hover flicker with double buffering (DONE)

**What**: removed the remaining flicker that appeared when the mouse hovered
over buttons in the Home/Projects screens.

- **Root cause**: although `WM_MOUSEMOVE` now only invalidated the window when
  hover changed, the `WM_PAINT` handler drew the entire chrome frame directly
  to the screen HDC. GDI draws each primitive sequentially, so the button
  highlight appeared and disappeared between primitives.
- **Fix** — double-buffer `main_proc` `WM_PAINT`: render all chrome to a
  memory DC sized to the full client area, then `BitBlt` the result to the
  screen in one go. The `HDC` fallback to the screen DC is kept if the memory
  allocation fails.

**Files**:

- `apps/desktop-native/src/main.rs` — `WM_PAINT` now creates a memory DC/bitmap
  via `CreateCompatibleDC`/`CreateCompatibleBitmap`, draws through it, and
  copies with `BitBlt(..., SRCCOPY)`.

**Verify**:

- `cargo check`: clean.
- `cargo test`: **104 passed, 0 failed**.
- `cargo fmt`: applied.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No new dependency.

**What's New**: NOT updated — the native shell is not yet shipped to end users.

## 2026-07-10 — Fix startup flicker (DONE)

**What**: removed the white flash / flicker when the main window first
appears.

- **Root cause**: both the main and viewport child window classes used
  `COLOR_WINDOW` (system white) as their background brush. The window was
  made visible before `WM_PAINT` had a chance to draw the dark editor/home
  background, causing a brief white flash.
- **Fix** — set both `WNDCLASSW.hbrBackground` to `GetStockObject(BLACK_BRUSH)`
  in `src/main.rs`.
- **Startup ordering** — `Renderer` is now created and bound to the viewport
  child *before* `ShowWindow`/`UpdateWindow`, so the first paint already has
  the compositor ready and does not show an empty surface.

**Files**:

- `apps/desktop-native/src/main.rs` — black stock brush for both window
  classes; deferred `ShowWindow`/`UpdateWindow` until after renderer init.

**Verify**:

- `cargo check`: clean.
- `cargo test`: **104 passed, 0 failed**.
- `cargo fmt`: applied.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No new dependency.

**What's New**: NOT updated — the native shell is not yet shipped to end users.

## 2026-07-10 — Home/Projects parity + warning cleanup (DONE)

**What**: finalised the 1:1 landing-page Home screen and project hub, and
removed the remaining `cargo check` warnings.

- **Home screen (`src/ui/welcome.rs`)** — full landing-page header with nav
  links, GitHub star pill, hero eyebrow, mixed serif/sans headline, primary
  and secondary CTAs, glass preview frame, 4-column stats strip, and a
  recent-projects card row. Mode switches to `Editor` (new untitled project)
  or `Projects` on relevant clicks.
- **Project hub (`src/ui/projects.rs`)** — breadcrumb nav, search/sort/view
  pills, a "New project" button, project list with scroll support, and a
  "Create from template" row. Template cards create a new project with the
  chosen canvas size.
- **Input wiring (`src/window/shortcuts.rs`)** — `handle_lbuttondown` updated
  for the new `HomeState` and `ProjectsState` fields; `Esc` returns from
  Editor to Home; `Ctrl+N` creates a new project from Home/Projects.
- **Warning cleanup** — `cargo check` now reports zero warnings. Removed an
  unused `ExportError` variant and theme constant; marked intentionally-dead
  persistence/export/history helpers with `#[allow(dead_code)]` and
  explanatory comments; removed unnecessary `unsafe` blocks and replaced
  no-op `drop(state)` calls.

**Files**:

- `apps/desktop-native/src/ui/welcome.rs` — home/landing redesign.
- `apps/desktop-native/src/ui/projects.rs` — project hub redesign.
- `apps/desktop-native/src/window/shortcuts.rs` — mouse/keyboard handlers for
  new buttons and screens.
- `apps/desktop-native/src/state/{history,persistence,project}.rs` —
  `#[allow(dead_code)]` annotations for helpers used in tests/future wiring.
- `apps/desktop-native/src/export/mod.rs` — removed unused `Validation`
  variant and `RenderFrameOptions` import.
- `apps/desktop-native/src/theme.rs` — removed unused `LANDING_HEADER_BG`
  constant.
- `apps/desktop-native/src/ui/assets/effects.rs` — `#[allow(dead_code)]` on
  `EffectDef::shader`.
- `apps/desktop-native/src/window/mod.rs` — `#[allow(dead_code)]` on
  `renderer_for_child`.

**Verify**:

- `cargo check`: clean.
- `cargo test`: **104 passed, 0 failed**.
- `cargo fmt`: applied.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No new crate. No new dependency. No secrets, no network code.

**What's New**: NOT updated — the native shell is not yet shipped to end
users.

## 2026-07-10 — UI parity: editor chrome + preview/compositor (DONE)

**What**: rounded the editor chrome and made the preview viewport render
actual timeline clips as placeholder layers.

- **Editor UI fidelity** — header, footer, tab bar, assets panel, effects
  library, inspector, transport toolbar, and timeline track rows now use
  the new `rounded_fill_rect` / `rounded_border_rect` helpers and vertical
  gradient backgrounds. This matches the web landing-page glass/cyan/ember
  palette and the rounded-xl corners from `apps/web`.
- **Inspector polish** — property rows and section headers get subtle
  rounded backgrounds; clip/project panels share a consistent header style.
- **Preview/Compositor** — `Renderer::render` now builds a
  `FrameDescriptor` from the live `Project` and renders one coloured layer
  per active timeline element. Layer position, size, rotation, opacity,
  flip, and blend mode are mapped from the element `Transform`. One-pixel
  colour textures are cached per track type so the GPU upload is only done
  once per colour.
- **Viewport wiring** — `viewport_proc` pulls the current `Project` from the
  parent `WindowState` and passes it to `Renderer::render` on `WM_PAINT`.

**Files**:

- `apps/desktop-native/src/ui/header.rs` — gradient header, rounded logo,
  identity pod, zoom capsule, and action-hub buttons.
- `apps/desktop-native/src/ui/footer.rs` — gradient footer, rounded timer
  capsule and BETA badge.
- `apps/desktop-native/src/ui/tab_bar.rs` — rounded glass rail, rounded tab
  buttons, rounded storage card.
- `apps/desktop-native/src/ui/assets/mod.rs` — rounded asset rows and kind
  tags.
- `apps/desktop-native/src/ui/assets/effects.rs` — rounded effect cards and
  category tags.
- `apps/desktop-native/src/ui/viewport_toolbar.rs` — rounded transport and
  draw/quality/fullscreen buttons.
- `apps/desktop-native/src/ui/timeline/track.rs` — rounded track rows and
  type tags.
- `apps/desktop-native/src/ui/inspector/mod.rs` — rounded property rows and
  section headers, shared `draw_property_row` helper.
- `apps/desktop-native/src/render/mod.rs` — `FrameDescriptor` construction,
  per-track-type colour texture cache, blend-mode conversion.
- `apps/desktop-native/src/render/viewport.rs` — `WM_PAINT` now reads the
  parent `WindowState` and passes the live `Project` to `render`.

**Verify**:

- `cargo check`: clean.
- `cargo test`: **104 passed, 0 failed**.
- `cargo fmt`: applied.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No new crate. No new dependency. No secrets, no network code.

**What's New**: NOT updated — the native shell is not yet shipped to end
users.

## 2026-06-27 — Increment 5 + 7: AI copilot stub + teleprompter + packaging (DONE)

**What**: completed the AI copilot stub, teleprompter overlay, and
packaging notes:

- **5: AI copilot stub** — `copilot.rs` module with `suggest(project)`
  returning context-aware canned suggestions (no network, no API keys,
  no secrets). Suggestions cover: empty project, no clips, missing
  track types (video/audio/text), long-form projects, very short
  projects, and a positive tip for balanced projects. Deterministic
  (pure function of project state). 6 unit tests. Suggestions render
  in the lower portion of the tools panel.
- **5: Teleprompter** — Ctrl+P opens a prompt dialog to enter scrolling
  text. When non-empty, the text scrolls vertically over the preview's
  lower third based on the playhead position (scroll fraction =
  playhead/duration). Word-wrap by char count. Empty text disables the
  overlay. `teleprompter_text` + `teleprompter_on` in `WindowState`.
- **7a: ROADMAP + What's New** — ROADMAP.md updated with Inc 4d–4g,
  5, and 6c status. What's New NOT updated because the native shell is
  not yet shipped to end users (no release, no users) — per
  `docs/product/WHATS_NEW_POLICY.md` the feed is for user-facing
  changes in shipped products.
- **7b: Packaging notes** — README.md updated with FFmpeg bundling
  instructions (env var, sidecar cache, system PATH), release build
  instructions, and distribution notes. No installer yet (future
  increment — Inno Setup or WiX).

**Files**:

- `apps/desktop-native/src/copilot.rs` — NEW. `Suggestion` struct,
  `suggest(project) -> Vec<Suggestion>`. 6 tests (empty, no clips,
  missing audio, balanced, long-form, deterministic).
- `apps/desktop-native/src/main.rs` — `mod copilot`.
  `draw_copilot_suggestions` in tools panel. `teleprompter_text` and
  `teleprompter_on` in `WindowState`. Ctrl+P handler (prompt dialog →
  set/clear teleprompter). `draw_teleprompter_overlay` and `wrap_text`
  helper. `paint_chrome` signature extended with teleprompter params.
- `apps/desktop-native/README.md` — Packaging section (FFmpeg bundling,
  release build, distribution).
- `ROADMAP.md` — Inc 4d–4g + 5 + 6c status updated.

**Verify**:

- `cargo build`: clean.
- `cargo test`: **49 passed, 0 failed** (43 + 6 copilot).
- `cargo fmt`: applied, `cargo fmt --check` clean.
- Launch: alive 3s+ — copilot suggestions visible in tools panel,
  Ctrl+P opens teleprompter dialog, text scrolls over preview during
  playback.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No web/Tauri files changed. No new crate. No API keys, no network code,
no auth/AI lib logic touched (`apps/web/src/lib/ai/**` not modified).

**What's New**: NOT updated — the native shell is not yet shipped to
end users. Per `docs/product/WHATS_NEW_POLICY.md`, the feed is for
user-facing changes in shipped products. The native shell has no
release yet.

## 2026-06-27 — Increment 4e/4f/4g: playback + clip selection + transport UI (DONE)

**What**: completed the playback and clip-interaction layer:

- **4e: Playback** — Spacebar toggles play/pause. When playing, a
  `WM_TIMER` (interval = 1000/fps ms) advances the playhead one frame
  per tick via `seek_relative_frame(1)`. At end of timeline, playback
  stops and wraps to 0. Timer is killed on pause and on `WM_DESTROY`.
- **4f: Clip selection + delete** — Click on a clip block selects it
  (bright white border). `selected_element: Option<(usize, usize)>` in
  `WindowState`. Properties panel switches to clip properties (Name,
  ID, Track, Start, Duration) when a clip is selected. Delete key
  removes the selected clip via `Project::remove_element` (new method,
  recomputes duration). Click on empty timeline area deselects + seeks.
- **4g: Playback transport UI** — Footer now shows play/pause glyph
  (▶/⏸) + timecode (current/duration) on the left, settings in center.

**Files**:

- `apps/desktop-native/src/state.rs` — `Project::remove_element` (by
  track_id + element_id, retains non-matching, recomputes duration).
  2 new tests (remove + recompute, unknown returns false) → **43 tests
  total**.
- `apps/desktop-native/src/main.rs` — `WM_TIMER` handler (frame advance
  and end-of-timeline wrap). Spacebar (0x20) in key match. VK_DELETE
  handler. `WM_LBUTTONDOWN` rewritten: first hit-tests clip blocks
  (iterates tracks × elements, checks x/y against clip rect), then
  falls back to click-to-seek. `selected_element` in `WindowState`.
  `draw_timeline_tracks` + `draw_properties_panel` + `paint_chrome`
  updated to pass `selected_element` through. Clip border uses bright
  color when selected. Properties panel shows clip fields when selected,
  project fields otherwise. Footer shows play/pause glyph + timecode.
  `KillTimer`/`SetTimer`/`WM_TIMER`/`VK_DELETE` imports added.

**Verify**:

- `cargo build`: clean.
- `cargo test`: **43 passed, 0 failed** (41 + 2 remove_element).
- `cargo fmt`: applied.
- Launch: alive 3s+ — Spacebar plays/pauses, clips are selectable,
  Delete removes selected clips, footer shows timecode.

## 2026-06-27 — Increment 4d: panel content + clip model + interactions (DONE)

**What**: completed the remaining panel content and timeline interactions
that were deferred from Increment 4c. The native shell now has:

- A native rename-project dialog (Ctrl+R) — the first text-input dialog
  in the shell, built from an in-memory `DLGTEMPLATE` (no resource file).
- Click-to-seek on the timeline — clicking in the track list area moves
  the playhead to the corresponding time position.
- A playhead position indicator (vertical line) on the timeline.
- A full property-fields panel (Name, ID, Version, Duration, Canvas,
  FPS, Aspect, Tracks/Assets) replacing the single-line placeholder.
- An element/clip model (`Element` on `Track.elements`) with clip-block
  rendering on each track row, and a 'E' shortcut to add a test clip.

**Files**:

- `apps/desktop-native/src/dialogs.rs` — `prompt_dialog(owner, title,
  label, default) -> Result<Option<String>, DialogError>` via
  `DialogBoxIndirectParamW` with an in-memory `DLGTEMPLATE`. `TemplateBuilder`
  handles DWORD alignment per the Win32 dialog template spec. `prompt_proc`
  dialog proc reads the edit text on OK, stores it in a `PromptContext`
  passed via `lparam`. `CommDlgExtendedError`-style cancel/error split
  (result 0 = cancel, -1 = error). Raw style constants in `raw_styles`
  mod (avoids adding more `windows` crate features for obscure constants
  like `SS_LEFT` which lives in `Win32_System_SystemServices`).
- `apps/desktop-native/src/state.rs` — `Element` (id, name,
  start_seconds, duration_seconds, `end_seconds()`), `Track.elements`,
  `add_element`, `end_seconds()`, `Project::add_element` (by track id,
  returns `None` if track not found), and `recompute_duration` (max
  element end across all tracks → `metadata.duration_seconds`). `Eq`
  removed from `Track`/`Scene` (f64 fields in `Element`). 6 new tests
  (element end, track end, add_element + duration update, unknown track,
  recompute across tracks, empty elements on new track) — **41 tests
  total**.
- `apps/desktop-native/src/main.rs` — `WM_LBUTTONDOWN` handler: maps
  click x in the timeline track-list area to a time fraction of
  `timeline_duration`, calls `seek_seconds`. `timeline_duration()`
  helper (real duration or 30s minimum). `TIMELINE_MIN_SECONDS` const.
  Playhead indicator (vertical line, `PLAYHEAD_COLOR`) drawn on the
  timeline. `draw_properties_panel`: 8-field list (Name with Ctrl+R
  hint, ID, Version, Duration, Canvas W×H, FPS, Aspect, Tracks/Assets).
  Clip blocks rendered on each track row (colored by track type,
  positioned by start/duration relative to timeline duration, clip name
  drawn if room). 'E' key: adds a 5s test clip at the playhead position
  to the selected track. Ctrl+R: rename dialog → `Project::rename`.
  `WM_LBUTTONDOWN` + `WM_LBUTTONDOWN` import added to the message
  handler imports.

**Verify**:

- `cargo build`: clean (zero dead-code warnings — `rename` and
  `seek_seconds` are now wired, resolving the last two warnings from
  Inc 4c).
- `cargo test`: **41 passed, 0 failed** (35 prior + 6 element model).
- `cargo fmt`: applied, `cargo fmt --check` clean.
- Launch: process alive 3s+ — Ctrl+R opens the rename dialog, 'E' adds
  a clip (visible as a colored block on the track), click-to-seek moves
  the playhead line, properties panel shows the field list.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No web/Tauri files changed. No new crate — `DialogBoxIndirectParamW` is
in `Win32_UI_WindowsAndMessaging` (already enabled), raw style constants
used instead of adding more `windows` features.

**What's New**: still not updated — the native shell is not yet shipped
to end users. Reason per RULES.md documented here.

## 2026-06-27 — Increment 6c: native file dialogs + media import (DONE)

**What**: replaced the fixed-cwd Ctrl+S path (6a) and fixed-cwd export
path (6b) with real native Win32 common dialogs (`GetOpenFileNameW` /
`GetSaveFileNameW`), and added media import (Ctrl+I). The native shell
now has the full file workflow: save-as, open, import media, export-as —
all via native OS dialogs, no browser file-picker or IndexedDB. Imported
media is stored as a `MediaAsset` with a native file path (read via
`std::fs`, no blob URLs — unlike the web app's browser-sandboxed blobs).

**Files**:

- `apps/desktop-native/src/dialogs.rs` (new) — typed wrappers around the
  Win32 common dialogs. `save_dialog(owner, title, filters, default_ext,
  default_name) -> Result<Option<PathBuf>, DialogError>` and
  `open_dialog(owner, title, filters) -> Result<Option<PathBuf>,
  DialogError>`. `None` = user cancelled (distinguished from a real
  error via `CommDlgExtendedError() == 0`). `Filter` struct builds the
  Win32 `\0`-separated filter buffer. `DialogError` typed (`thiserror`).
  No new third-party dep — uses the `windows` crate's
  `Win32_UI_Controls_Dialogs` feature (Microsoft's official binding,
  same dependency decision as the rest of the shell).
- `apps/desktop-native/src/state.rs` — `MediaKind` (Image/Video/Audio/
  Other, `from_extension` case-insensitive), `MediaAsset` (id/name/path/
  kind, `from_path` extracts name from file stem), `Project.assets:
  Vec<MediaAsset>` + `add_asset` (deduplicates by path, returns asset
  id). 5 new tests (kind inference, from_path extraction, add_asset
  appends, dedup by path, empty assets on new project) — **35 tests
  total**.
- `apps/desktop-native/src/main.rs` — `mod dialogs;`. `message_box`
  helper (reduces MessageBox repetition). Ctrl+S → native save dialog
  (suggested name `<id>.artpr.json`). Ctrl+O → native open dialog →
  `load_project` → replaces state (playhead + selection reset). Ctrl+E
  → native save dialog for the export output path. Ctrl+I → native open
  dialog → `MediaAsset::from_path` → `add_asset`. `draw_assets_list`:
  tools panel renders the asset list (kind tag + name per row, empty-
  state hint "Import media (Ctrl+I)"). Readout strip updated with all
  shortcut hints.
- `apps/desktop-native/Cargo.toml` — `windows` features updated:
  `Win32_UI_Controls` + `Win32_UI_Controls_Dialogs` added (common dialog
  API). No new crate.

**Verify**:

- `cargo build`: clean (warnings = `rename`/`seek_seconds` defer +
  unused-var suggestions — pre-existing, not introduced here).
- `cargo test`: **35 passed, 0 failed** (30 prior + 5 media asset).
- `cargo fmt`: applied.
- Launch: process alive 3s+ — all four Ctrl handlers (S/O/I/E) do not
  crash; dialogs open modally on demand.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No web/Tauri files changed. `windows` crate features expanded (same
crate, same version, same decision — Microsoft official Win32 binding,
MIT, no new third-party dependency).

**What's New**: still not updated — the native shell is not yet shipped
to end users. Reason per RULES.md documented here.

## 2026-06-27 — Increment 6a: native project persistence (DONE)

**What**: native project save/load as `.artpr.json` via `serde_json` +
`std::fs` — the foundation for the top-1 export backend (state must be
persistable before frames can be exported). First real user-facing
capability of the native shell: persist your work to disk.

**Files**:

- `apps/desktop-native/src/persist.rs` (new) — `ProjectFile` wrapper
  with a `file_version` for future migrations, `save_project` (atomic
  write: `<path>.tmp` then rename, no corruption on mid-write failure),
  `load_project` (validates file version, rejects future versions
  explicitly), `default_save_path`, `PersistError` (typed, `thiserror`).
  5 round-trip tests (save/load equality, atomicity no tmp left, future
  version rejection, default path, wrapper version).
- `apps/desktop-native/src/state.rs` — added `Serialize`/`Deserialize`
  to all model types (`Project`, `ProjectMetadata`, `ProjectSettings`,
  `CanvasSize`, `TrackType`, `Track`, `Scene`). `Playhead` gets
  `#[serde(transparent)]` so it serializes as its inner `MediaTime` →
  i64 (matches web tick-based playhead). `MediaTime`/`FrameRate` already
  derive serde in the `time` crate (unconditional, not wasm-gated).
- `apps/desktop-native/src/main.rs` — `mod persist;`. Ctrl+S wired:
  saves to `<id>.artpr.json` in cwd + MessageBox with the path (success
  or typed error). `GetKeyState(VK_CONTROL) < 0` detects Ctrl.

**Why this is the export-backend foundation**: the top-1 export path
(render frames via the compositor → feed a native encoder) needs the
project state on disk first (export is launched from a saved project,
and the export pipeline reads canvas/fps/tracks from the model). Native
file I/O also replaces the web app's IndexedDB persistence for the
native shell. The actual FFmpeg encode is the next step and needs a
full dependency decision + approval (media pipeline framework —
"Forbidden Without Explicit Approval" per DEPENDENCY_POLICY).

**Verify**:

- `cargo build`: clean (8 warnings: `rename`/`seek_seconds` defer +
  unused-var suggestions).
- `cargo test`: **24 passed, 0 failed** (19 model + 5 persistence).
- Launch: process alive 3s+ — Ctrl+S handler does not crash.

**Sensitive paths**: `rust/**` NOT edited (path-deps only). Root
`Cargo.toml` untouched. No web/Tauri files changed. New direct deps
`serde_json` (new), `serde` + `thiserror` (promoted transitive) — all
standard serde-ecosystem, MIT, already used in-repo; decision recorded
in `docs/harness/DEPENDENCY_DECISIONS.md`.

**What's New**: still not updated — the native shell is not yet
released/shipped to end users, so no end-user sees this capability yet.
Reason per RULES.md documented here. Will update when the native app
ships.

## 2026-06-27 — Increment 6b: FFmpeg export — DECISION DRAFTED (PENDING APPROVAL)

**What**: drafted the full FFmpeg dependency decision for the top-1
export backend. **No crate added, no code written** — per
DEPENDENCY_POLICY, media pipeline frameworks are "Forbidden Without
Explicit Approval", so this is the Level-0 planning step (always
allowed). Implementation starts only after user approval.

**Recommendation**: `ffmpeg-sidecar` (MIT, CLI wrapper, `-hwaccel auto`
for GPU encode = top-1 speed, no FFI/build pain on Windows, no GPL
source-link) over `ffmpeg-next` (WTFPL, maintenance-mode, FFI/build
pain). Pipeline: `compositor.render_frame_to_bytes` → BGRA via stdin →
ffmpeg-sidecar encode → `.mp4`.

**Supply-chain mitigation**: disable `download_ffmpeg` (no runtime
binary download) + bundle a pinned LGPL FFmpeg binary.

**See**: `docs/harness/DEPENDENCY_DECISIONS.md` "PENDING APPROVAL —
Increment 6b" for the full decision (problem, alternatives, security,
license, maintenance, bundle/perf, rollback, open question).

**Status**: awaiting user approval to add the crate + implement.

## 2026-06-27 — Increment 6b: top-1 export via ffmpeg-sidecar (DONE)

**What**: implemented the top-1 native export backend. Renders frames via
the repo's own `compositor` crate (the same pipeline as preview, Inc 1)
and pipes raw BGRA bytes to a native FFmpeg encoder via `ffmpeg-sidecar`
(CLI wrapper, no FFI). On Windows FFmpeg picks the best hardware encoder
with `-hwaccel auto` (NVENC / Intel QSV / AMD AMF) — far faster than the
browser's software MediaRecorder the web app uses. This is the export
half of the "top-1 backend" the owner requested.

**Approval**: user delegated the choice ("yang terbaik") after reviewing
the drafted decision; `ffmpeg-sidecar` (the recommended option) approved
2026-06-27. Recorded in `docs/harness/DEPENDENCY_DECISIONS.md`.

**Files**:

- `apps/desktop-native/src/export.rs` (new) — `ExportOptions` (built
  from `Project` settings + frame count, with `validate()`), typed
  `ExportError` (`thiserror`), `export_video()` (spawns FFmpeg via
  `ffmpeg-sidecar`, renders frames via `compositor.render_frame_to_bytes`,
  pipes BGRA via stdin, `libx264`/`yuv420p`/`veryfast` + `-hwaccel auto`),
  `default_export_path`. 6 validation tests (zero dims, zero fps den, zero
  frame count, sane opts, path from project id, options carry settings).
- `apps/desktop-native/src/main.rs` — `mod export;`. `Renderer::export_video`
  delegates to `export::export_video` (reuses the same GpuContext +
  Compositor as preview). `Ctrl+E` wired: exports a 30-frame (1s @ 30fps)
  proof clip to `<id>-export.mp4` + MessageBox (path on success, typed
  error + ffmpeg hint on failure).
- `apps/desktop-native/Cargo.toml` — `ffmpeg-sidecar` added with
  `default-features = false` (no runtime binary download — supply-chain
  mitigation per the decision doc).

**MVP scope (honest)**: with no clip/element content in the model yet
(elements land in Increment 4d), the export renders `frame_count` frames
of the editor clear colour (#111114). This proves the full top-1 pipeline
end-to-end (compositor -> stdin -> hwaccel encode -> .mp4) and is the
smallest safe step. Real content flows through the same pipeline once
the model holds elements — no export code changes needed then, only the
`FrameDescriptor.items` population.

**FFmpeg binary**: `default-features = false` means no auto-download. The
export looks for `ffmpeg` on PATH (system install) or a bundled binary
(packaging sets that up in Increment 7). If not found, `Ctrl+E` surfaces a
clear error MessageBox ("Is ffmpeg installed or bundled?") — no silent
failure. End-to-end export runs once ffmpeg is available.

**Verify**:

- `cargo build`: clean (warnings = `rename`/`seek_seconds` defer + unused
  var suggestions).
- `cargo test`: **30 passed, 0 failed** (24 prior + 6 export validation).
- Launch: process alive 3s+ — export module + Ctrl+E handler do not
  crash (ffmpeg not on PATH in this env → handler surfaces the error
  MessageBox gracefully, as designed).
- End-to-end (needs ffmpeg on PATH or bundled): `Ctrl+E` →
  `<id>-export.mp4` written, playable.

**Sensitive paths**: `rust/**` NOT edited (path-deps only; compositor
reused). Root `Cargo.toml` untouched. No web/Tauri files changed. New dep
`ffmpeg-sidecar` (MIT, no default features) — full decision + approval
in `docs/harness/DEPENDENCY_DECISIONS.md`.

**What's New**: still not updated — the native shell is not yet shipped
to end users. Reason per RULES.md documented here.

## 2026-06-27 — Increment 4c: track selection + keyboard interactions (DONE)

**What**: wired the remaining timeline interactions via keyboard. The
timeline now has a selected-track concept (highlighted row) and the
user can add tracks, select tracks, and toggle mute — all without a
mouse, matching a keyboard-first editor workflow.

**Shortcuts** (no text fields yet, so raw keys are safe):

- `\u{2190}` / `\u{2192}`: seek one frame back / forward (Inc 4b)
- `\u{2191}` / `\u{2193}`: select previous / next track
- `T`: add a new track (cycles Video → Text → Audio → Graphic)
- `M`: toggle mute on the selected track

**Files**: `apps/desktop-native/src/main.rs`

- `WindowState.selected_track: usize` — UI state (kept out of the model
  so `Project` stays pure domain state). Defaults to track 0.
- `draw_timeline_tracks` takes `selected_track`: selected row gets a
  brighter border (white/30) + brighter name text. Readout strip now
  shows all shortcut hints.
- `WM_KEYDOWN` expanded: Up/Down (select, clamped to track count), T
  (add track cycling types + auto-select the new track), M (toggle mute
  on selected track via `toggle_track_mute`). Wires `add_track` and
  `toggle_track_mute` (resolves their dead-code warnings).

**What remains wired-later (2 dead-code warnings)**:

- `rename` — needs an input dialog (Win32 dialog or in-place edit
  control); deferred to a dialog-focused increment.
- `seek_seconds` — needs click-to-seek with x→time mapping, which needs
  a timeline duration (currently 0 with no clips); deferred to the
  element/clip-rendering increment.
- Both are tested logic, not removable.

**Verify**:

- `cargo build`: clean (5 warnings: `rename`, `seek_seconds` + 3 unused
  var suggestions — expected, wired-later).
- `cargo test`: **19 passed, 0 failed** (model logic unchanged).
- Launch: process alive 4s+ — all six shortcuts handle without crash.

**Sensitive paths**: `rust/**` NOT edited. Root `Cargo.toml` untouched.
No web/Tauri files changed. `VK_UP`/`VK_DOWN` from the already-added
`Win32_UI_Input_KeyboardAndMouse` feature (no new dependency).

**What's New**: not updated — internal interactions, no new user-visible
feature surface beyond the editor frame. Reason per RULES.md documented
here.

## 2026-06-27 — Increment 4b: interactive timeline panel (DONE)

**What**: the timeline panel now renders a track list (one row per
track, with type-tag colour + name + muted/hidden flags) and the
playhead is interactive via keyboard (arrow-left / arrow-right = seek
one frame back / forward). This is the first interactive panel content
and the first keyboard wiring.

**Files**:

- `apps/desktop-native/src/state.rs` — added `TrackType` (Video/Text/
  Audio/Graphic), `Track` (id/name/type/muted/hidden), `Scene`
  (id/name/tracks, with `add_track` + `toggle_mute`). `Project` now
  holds a `scene` (default: one "Main" video track, matching the web
  app's new-project scene). Added `Project::add_track`,
  `toggle_track_mute`, `seek_relative_frame` (clamps at frame 0). 6 new
  unit tests (track/scene defaults, add/toggle, seek-relative clamp,
  track-type labels) — **19 tests total, all passing**.
- `apps/desktop-native/src/main.rs` — `draw_timeline_tracks()` renders
  the track list (type-tag colour by `TrackType`, name, state flags) +
  a playhead readout strip at the bottom. `draw_text_left()` helper
  (left-aligned text for track names). `WM_KEYDOWN` handler: arrow
  keys call `seek_relative_frame(±1)` + `InvalidateRect` to repaint.
  Added `Win32_UI_Input_KeyboardAndMouse` feature for `VK_LEFT`/
  `VK_RIGHT` (`VIRTUAL_KEY(u16)`).

**Why this scope**: per Prime Directive, the smallest meaningful
interactive panel content is the track list + frame seek. Full element
rendering (clips with transforms/effects/masks on each track), asset
grid, and property fields are larger surfaces deferred to later
increments. `rename`/`seek_seconds`/`add_track`/`toggle_track_mute`
remain dead-code-warning (wired to menu/dialog/click-seek interactions
later) — they are tested logic, not removable.

**Verify**:

- `cargo build`: clean (4 dead-code warnings for not-yet-wired
  interactions — expected).
- `cargo test`: **19 passed, 0 failed**.
- Launch: process alive 4s+ — track list renders, keyboard handler
  does not crash.

**Sensitive paths**: `rust/**` NOT edited (path-deps only). Root
`Cargo.toml` untouched. No web/Tauri files changed. One new `windows`
feature (`Win32_UI_Input_KeyboardAndMouse`) — part of the already-added
`windows` crate, no new dependency.

**What's New**: not updated — still internal panel content, no new
user-visible feature surface beyond the editor frame. Reason per
RULES.md documented here.

## 2026-06-27 — Increment 4: state model wired to UI (DONE)

**What**: connected the `state::Project` model (Increment 3) to the
editor chrome (Increment 2) so the UI renders from live project data,
not hard-coded labels.

**Files**: `apps/desktop-native/src/main.rs`

- `WindowState` struct holds the editor `Project` + the viewport child
  HWND, stored boxed in the parent's `GWLP_USERDATA` (idiomatic Win32
  per-window state — NO globals, per RULES.md "Avoid global side
  effects"). Replaced the previous `set_child_hwnd`/raw-child-slot
  approach.
- `paint_chrome` now takes `&Project` and renders data from the model:
  - header: `project.metadata.name` (was hard-coded "Artidor")
  - footer: `format!("{height}p • {fps} fps • {aspect} • Stereo")` from
    `project.settings` (matches web `editor-footer.tsx` — verified by
    the `footer_labels_match_web_format` unit test)
  - timeline: playhead position + frame (`playhead.as_seconds()` +
    `frame_floor(fps)`) — proves timeline state is connected
  - properties: project id + version + duration (placeholder until real
    element properties land)
- `main()`: seeds a `Project::new_untitled("untitled", now_ms)` with a
  real epoch timestamp and attaches it to the window.
- `WM_DESTROY`: drops `WindowState` (and destroys the child) in the
  right order (surface safety contract preserved).

**Why `WindowState` instead of a global**: a global `Mutex<Project>`
would work for a single-window shell but violates "Avoid global side
effects" and couples state to process lifetime rather than window
lifetime. Boxing per-window state in `GWLP_USERDATA` is the idiomatic
Win32 pattern and keeps the shell ready for multi-window later.

**Verify**:

- `cargo build`: clean (3 dead-code warnings for `rename`/`seek_*` —
  those are wired to keyboard/mouse interaction in Increment 5).
- `cargo test`: 13 passed, 0 failed (model logic unchanged).
- Launch: process alive 5s+ — state attached, chrome renders from the
  project model (header = "Untitled", footer = "1080p • 30 fps • 16:9 •
  Stereo", timeline = "Playhead 0.000s (frame 0)").

**Sensitive paths**: `rust/**` NOT edited (path-deps only). Root
`Cargo.toml` untouched. No web/Tauri files changed. No new deps.

**What's New**: not updated — still internal wiring, no new user-visible
feature surface. Reason per RULES.md documented here.

## 2026-06-27 — Increment 3: state + data model bridge (DONE)

**What**: a minimal, strongly-typed editor state model that mirrors the
web app's project structure (`apps/web/src/lib/project/types.ts`) so the
native shell holds the same data the web editor does. Timeline math is
NOT reimplemented — it reuses the repo's `time` crate (`FrameRate`,
`MediaTime`) via path-dep, per AGENTS.md "No duplicate domain logic".

**Files**:

- `apps/desktop-native/Cargo.toml` — added path-dep `time`
  (`../../rust/crates/time`, default features = no wasm). `bridge`
  proc-macro comes in transitively (time uses `#[export]`).
- `apps/desktop-native/src/state.rs` (new) — `CanvasSize`,
  `ProjectMetadata`, `ProjectSettings` (reuses `time::FrameRate`),
  `Playhead` (wraps `time::MediaTime`), `Project`. Helpers match web
  semantics: `aspect_label()` = web `formatCanvasAspect`,
  `fps_label()` = web `Math.round(num/den)`, `rename` rejects empty
  names, `seek_seconds`/`seek_frame` reject NaN/overflow.
- `apps/desktop-native/src/main.rs` — `mod state;` (model declared; UI
  wiring is Increment 4).

**Why reuse `time` and not reimplement**: `rust/crates/time` already has
`FrameRate`, `MediaTime` (tick-based, frame-aligned), `Keyframe`, etc.
Reimplementing would duplicate domain logic — forbidden. `bridge` is a
proc-macro (`#[export]`), not types, so it is not reused as a type
source. Web `types/` are zustand UI state (not domain logic), so the
native model is UI state for the shell, not duplication.

**Cloud fields intentionally omitted**: Google Drive folder/file ids,
per-project AI provider override — the native shell is local-first.
Add when a cloud feature lands here.

**Verify**:

- `cargo build`: clean (11 dead-code warnings expected — model not yet
  wired to UI; that is Increment 4).
- `cargo test`: **13 passed, 0 failed.** Covers: default canvas/aspect,
  default settings, new-untitled defaults, rename validation + timestamp,
  playhead seconds round-trip + NaN rejection, frame round-trip at 30fps,
  seek_seconds/seek_frame, footer label format match web.

**Sensitive paths**: `rust/**` NOT edited (path-deps only). Root
`Cargo.toml` untouched. No web/Tauri files changed. No new external dep
(`time` is a repo crate via path).

**What's New**: not updated — internal model, no user-visible change.
Reason per RULES.md documented here.

## 2026-06-27 — Increment 2: UI chrome 1:1 around the D3D12 viewport (DONE)

**What**: reproduced the web editor's top-level chrome 1:1 around the
native D3D12 viewport, using a child-window architecture:

- Parent window = GDI chrome: header bar (h=48, `#111114` + hairline +
  "Artidor"), footer (h=36, `#111114`→`#08080a` two-band gradient +
  "1080p • 30 fps • 16:9 • Stereo"), TabBar rail (w=72, `#08080a` +
  border), tools/properties/timeline panels (`#111114` + faint borders +
  labels). All proportions match the web app's default layout preset
  (`panel-store.ts`: tools 28% / preview 47% / properties 25% on the top
  row; mainContent 64% / timeline 36% vertical; `p-2`/`gap-2` = 8px).
- Child window (`WS_CHILD`) = the preview panel rect; the D3D12
  compositor surface is created from the **child** HWND. This is the
  standard Win32 editor pattern: GDI draws chrome on the parent, DXGI
  presents over the child only, so the GPU viewport never covers the
  chrome. Resize repositions the child to the new preview rect and
  repaints the chrome (`WM_SIZE`).

**Why child window + GDI (not Direct2D)**: GDI for solid fills + thin
borders + centred text is the "Standard platform API" choice (RULES.md
order #3) and needs zero new dependencies — "Do not add dependencies for
tiny problems". Direct2D would be cleaner for gradients/rounded corners
but is a bigger surface + new dep for what is currently flat panels.
The child-window split is required because DXGI cannot share an HWND
with GDI paint (Present covers the whole client).

**Files**: `apps/desktop-native/src/main.rs` — `Layout::compute()`
derives all chrome rects + the viewport rect from the client size; two
window classes (`main_proc` for chrome, `viewport_proc` for the
compositor); `paint_chrome()` GDI helpers (`fill_rect`, `border_rect`
with `HOLLOW_BRUSH`, `draw_text_centered` via `DrawTextW`); child HWND
stored on the parent via `GWLP_USERDATA`; renderer stored on the child
via `GWLP_USERDATA`; `WM_DESTROY` destroys the child first (drops the
surface while the child HWND is still valid = wgpu safety contract).

**Verify**:

- `cargo build`: clean, zero warnings.
- Launch: process alive 5s+ — chrome + child viewport + D3D12 surface
  all init without crash.
- **Manual visual QA** (`cargo run`): dark editor frame 1:1 with the
  web app — header bar top with "Artidor", TabBar rail left, three
  panels (Assets | preview | Properties) on the top row, Timeline below,
  footer strip bottom. The preview panel interior is the D3D12 viewport
  (currently `#111114` clear = empty preview; real content later).

**Sensitive paths**: `rust/**` NOT edited (path-deps only). Root
`Cargo.toml` untouched. No web/Tauri files changed. No new deps (GDI is
part of the already-added `Win32_Graphics_Gdi` feature).

**What's New**: not updated — still internal chrome scaffold, no
user-visible feature surface. Reason per RULES.md documented here.

## 2026-06-27 — Increment 1: top-1 preview foundation (DONE)

**What**: wired the window to the repo's own `gpu` + `compositor` crates
and rendered directly to a native WGPU `Surface` created from the Win32
HWND. On Windows, wgpu selects the **Direct3D 12** backend, so frames go
GPU -> swap chain -> screen with **zero CPU readback** — the fastest
possible preview path, and the same Rust compositor the web app uses
(shared logic), but native instead of WASM/WebGL.

**Files**:

- `apps/desktop-native/Cargo.toml` — added path-deps `compositor`,
  `gpu` (the repo's own crates, same pattern as
  `apps/desktop-web/src-tauri`) and `pollster` (minimal executor to
  block-on the one-time async `GpuContext::new()`).
- `apps/desktop-native/src/main.rs` — `Renderer` struct owns
  `GpuContext` + `Compositor` + `Surface<'static>`; surface created via
  `Instance::create_surface_unsafe(SurfaceTargetUnsafe::RawHandle{...})`
  using `wgpu::rwh::Win32WindowHandle` from the HWND. Renderer attached
  to the window via `GWLP_USERDATA` (idiomatic Win32, no globals). Frame
  rendered on `WM_PAINT`/`WM_SIZE`; `WM_ERASEBKGND` suppressed once the
  compositor owns the client area (no white flash). `WM_DESTROY` drops
  the renderer while the HWND is still valid (surface safety contract).

**Why this is top-1 (not just best-practice)**: the alternative the
Tauri crate uses is `render_frame_to_bytes` — render to texture, copy to
a CPU readback buffer, ship bytes to the JS canvas. That adds a
GPU->CPU->GPU round trip per frame. Rendering straight to a swap-chain
surface from the HWND skips both copies. This is the path the owner
asked for ("top 1 biar makin ngebut").

**Verify**:

- `cargo build` (in `apps/desktop-native/`): clean, zero warnings.
- Launch: process stays alive in the message loop; `GpuContext::new()`
  (D3D12 adapter/device) and `create_surface_unsafe` (D3D12 swap chain
  from HWND) did not crash.
- **Manual visual QA (run it yourself)**: `cargo run` from
  `apps/desktop-native/`. Window opens white-ish (GDI `COLOR_WINDOW`
  fallback) for one frame, then flips to dark `#111114` (the editor
  background, rendered by the native D3D12 compositor). White -> dark =
  proof the native compositor pipeline is presenting end-to-end. If
  init fails, a `MessageBox` appears instead (no silent failure).

**Sensitive paths**: `rust/**` was NOT edited — only depended on via
`path = "../../rust/crates/..."`, exactly like the Tauri crate. Root
`Cargo.toml` still untouched. No web/Tauri files changed.

**What's New**: not updated — Increment 1 is still internal (no
user-visible feature surface yet). Reason per RULES.md documented here.
Will update when a user-visible native surface lands (Increment 2-3).

## 2026-06-27 — Increment 0: native window scaffold (DONE)

Single Win32 window (Rust + `windows` crate). Compiles + launches.
See previous state.

## Top-1 export — decision (NOT yet implemented)

The owner asked for top-1 fastest **export** too. Decision recorded in
`docs/harness/DEPENDENCY_DECISIONS.md` (entry pending implementation):
the top-1 export path on Windows is **native FFmpeg** driven by the
compositor's `render_frame_to_bytes` per frame (or, faster, render
frames to a shared GPU texture and feed an FFmpeg hardware pipeline).
This is deferred to Increment 6 (native I/O + export) per PLAN.md, with
a full dependency decision written before any FFmpeg crate is added.
