# Dependency Decisions

Track every new dependency, framework, crate, SDK, plugin, or GitHub Action added to Artidor.

## Template

```md
## YYYY-MM-DD — <package-name>

Package:
Version:
Ecosystem:

Problem:
Decision:
Alternatives considered:

Security review:
License:
Maintenance:
Bundle/performance impact:
Rollback plan:

Approved by:
```

## 2026-07-09 — tauri

Package: tauri
Version: 2.11.3
Ecosystem: cargo (Rust)

Problem: Desktop app needs a native shell that reuses the web frontend
while accessing native GPU (WGPU) and native export (FFmpeg). The
previous GPUI approach required rewriting 100+ React components in
Rust, which is weeks of work with no rendering advantage.

Decision: Use Tauri 2.0 as the desktop shell. The web frontend runs
unchanged in the system WebView. Rust commands expose native WGPU
compositor and FFmpeg export to the frontend via IPC.

Alternatives considered:
1. **GPUI (current)** — requires full UI rewrite, no export advantage
2. **Electron** — bundles Chromium (~150MB), known CVE surface, heavy
3. **Tauri 2.0** — system WebView (~10MB binary), MIT/Apache, Rust-native
4. **Wails (Go)** — requires Go toolchain, conflicts with Rust direction

Security review:
- Known vulnerabilities: None critical in 2.x (checked GitHub advisories)
- Install scripts: No postinstall scripts (Rust crate, not npm)
- Transitive dependency risk: Low — Tauri has tight dep tree, mostly
  `tauri-utils`, `tauri-runtime`, `tauri-runtime-wry` (WebView wrapper)
- Browser/server safety: Tauri IPC is deny-by-default with capabilities.
  No code execution from frontend unless explicitly exposed as a command.
- Supply-chain: 108k GitHub stars, Tauri Programme in Commons Conservancy,
  regular releases (1629 releases, latest 2026-06-17)

Maintenance:
- Last release: 2026-06-17 (v2.11.3)
- Activity: Very active — 450 contributors, weekly releases
- Docs: Excellent (v2.tauri.app)
- API stability: v2 is stable, no breaking changes within 2.x

License: MIT OR Apache-2.0 (dual, compatible with Artidor)

Bundle/performance impact:
- Binary size: ~10MB (system WebView, no bundled Chromium)
- vs Electron: ~150MB smaller
- vs GPUI: similar, but Tauri reuses web UI (saves weeks of dev time)
- Runtime: native Rust process + system WebView, low memory

Rollback plan:
1. Remove `apps/desktop/src-tauri` from `Cargo.toml` workspace members
2. Remove `@tauri-apps/api` from `package.json` if added
3. `git checkout -- apps/desktop/` to restore GPUI version
4. Web app continues to work in browser as-is (no Tauri dependency in web)

Approved by: User (explicit "Ya, full switch" approval)

## 2026-06-27 — windows (windows-rs)

Package: windows
Version: 0.62.2
Ecosystem: cargo (Rust)

Problem: The owner-approved Win32 native desktop shell
(`apps/desktop-native/`) needs direct access to the Win32 API
(windowing, message loop, GDI/Direct2D) from Rust. No existing repo
code provides raw Win32 access — Tauri abstracts windowing internally,
so nothing in-repo can be reused for a pure Win32 shell.

Decision: Use the official Microsoft `windows` crate (windows-rs),
which provides direct Rust bindings to the Win32 API. This is "Standard
platform API" access (DEPENDENCY_POLICY order #3), not an arbitrary
third-party dependency. It keeps one toolchain for the whole repo and
lets the shell reuse the existing Rust core crates via path deps later.

Alternatives considered:
1. **Existing repo code** — none; Tauri hides raw Win32 windowing.
2. **Raw `extern "system"` FFI** — reinvents the wheel; violates the
   "Do Not Reinvent" / "prefer existing library" rules.
3. **`windows-sys`** — raw FFI only, no ergonomic helpers; more unsafe
   glue for no benefit.
4. **Pure C/C++ Win32** — no integration with existing Rust
   crates/toolchain; conflicts with the Rust-native direction.
5. **`windows` (windows-rs)** — official Microsoft binding, MIT, direct
   Win32 access, integrates with Rust crates. Chosen.

Security review:
- Known vulnerabilities: None known for the windowing feature set used.
  `windows` is generated bindings (no runtime logic of its own).
- Install scripts: None (Rust crate, not npm).
- Transitive dependency risk: Very low — depends only on
  `windows-core` (small, Microsoft) and `windows-link` (FFI link glue).
  Minimal feature set: `Win32_Foundation`,
  `Win32_UI_WindowsAndMessaging`, `Win32_Graphics_Gdi`,
  `Win32_System_LibraryLoader`.
- Browser/server safety: N/A — desktop-only, no network behavior in the
  features used.
- Supply-chain: Microsoft official crate, very widely used, frequent
  releases.

Maintenance:
- Last release: 0.62.2 (resolved by `cargo add` as latest
  Rust-1.96-compatible).
- Activity: Microsoft, very active, regular releases.
- Docs: Official docs.microsoft.com / rust guides.
- API stability: Bindings track the Win32 API; minor version churn
  possible (mitigated by tiny surface + pinned version).

License: MIT (compatible with Artidor's MIT LICENSE).

Bundle/performance impact:
- Zero runtime cost — generated FFI bindings only.
- Only the requested Win32 features are compiled in.
- Binary: the increment-0 exe is ~159 KB (debug).

Rollback plan:
1. Delete `apps/desktop-native/` (fully isolated — no shared files).
2. Revert the `ROADMAP.md` approval note and this decision entry.
3. Root `Cargo.toml` was never edited, so nothing else needs cleanup.
4. Web app and Tauri path are unaffected (no shared files touched).

Approved by: User (explicit owner override 2026-06-27 to add the Win32
native desktop path; documented in ROADMAP.md "Approved overrides").

## 2026-06-27 — pollster

Package: pollster
Version: 0.4.0
Ecosystem: cargo (Rust)

Problem: The Win32 native shell (`apps/desktop-native/`) must call
`GpuContext::new()` once at startup, which is `async` (it awaits WGPU
adapter/device acquisition). The shell's main thread runs a Win32
message loop and is not async. We need to block on a single one-shot
async call without pulling in a full async runtime.

Decision: Use `pollster`, a tiny no-async-runtime blocking executor
(~100 lines, no deps). `block_on(GpuContext::new())` drives the one
future to completion on the calling thread. This is the minimal choice
for a single one-shot await; we do NOT need tokio/async-std here (the
Tauri crate uses tokio because it runs many concurrent IPC handlers).

Alternatives considered:
1. **tokio** (already used by the Tauri crate) — full runtime, heavy for
   a single one-shot await; over-engineered for this shell.
2. **async-std / smol / blocking** — same over-engineering concern.
3. **pollster** — ~100 LOC, zero deps, exactly "block on one future".
   Chosen.
4. **Hand-roll a noop executor** — reinvents the wheel, violates the
   "Do Not Reinvent" rule.

Security review:
- Known vulnerabilities: None.
- Install scripts: None (Rust crate).
- Transitive dependency risk: None — zero dependencies.
- Browser/server safety: N/A — desktop only, no network.
- Supply-chain: well-known tiny crate, stable since 2020.

Maintenance:
- Last release: 0.4.0 (mature, rarely needs updates by design).
- Activity: stable, intentionally minimal.
- Docs: minimal but clear.
- API stability: `block_on` is the whole API; stable.

License: MIT OR Apache-2.0 (compatible with Artidor).

Bundle/performance impact: negligible (~1 KB, no runtime).

Rollback plan: remove `pollster` from `apps/desktop-native/Cargo.toml`
and replace `block_on(...)` with a different executor if ever needed.
Crate is fully isolated.

Approved by: User (implicit via owner override 2026-06-27 for the Win32
path; pollster is the minimal-tool choice, not a new framework).

## 2026-06-27 — time (path-dep, repo's own crate)

Package: time (repo crate)
Version: 0.1.0 (local path)
Ecosystem: cargo (Rust) — path dependency

Problem: The native shell needs timeline math (frame rates, tick-based
media time, frame alignment) for the editor state model (Increment 3).
This logic already exists in `rust/crates/time` and is shared with the
web app via WASM. Reimplementing would duplicate domain logic
(AGENTS.md "No duplicate domain logic").

Decision: Depend on the repo's own `time` crate via `path =
"../../rust/crates/time"` (default features = no wasm). Same pattern as
the `compositor`/`gpu` path-deps. `bridge` (proc-macro) comes in
transitively because `time` uses `#[export]`; without the `wasm`
feature, `#[export]` is a no-op, so `time` compiles as pure native
logic. `rust/**` is NOT edited (read-only dependency).

Alternatives considered:
1. **Reimplement FrameRate/MediaTime** — duplicates domain logic,
   forbidden.
2. **Depend on `time` via path** (chosen) — zero duplication, shared
   logic, matches the compositor/gpu path-dep pattern.
3. **Use crates.io `time` crate** — different crate (chronology, not
   timeline-frame math); wrong tool.

Security review: N/A — repo's own crate, already reviewed in-tree.

Maintenance: maintained as part of this repo.

License: same as repo (MIT).

Bundle/performance impact: tiny pure-logic crate, no runtime cost.

Rollback plan: remove `time` from `apps/desktop-native/Cargo.toml`.
`rust/**` was never edited.

Approved by: User (implicit via owner override 2026-06-27).

## 2026-06-27 — serde + serde_json + thiserror (persistence foundation)

Package: serde, serde_json, thiserror
Version: serde 1.0.228 (promoted transitive), serde_json 1.0.150 (new
direct), thiserror 2.0.18 (promoted transitive)
Ecosystem: cargo (Rust)

Problem: native project persistence (save/load `.artpr.json`) — the
foundation for the top-1 export backend. The editor state must be
serializable to disk before frames can be exported, and a native shell
needs direct file I/O (no browser IndexedDB). Needs: derive
`Serialize`/`Deserialize` on the model, JSON codec, typed errors.

Decision:
- `serde` (+ `derive`): the repo's standard serde ecosystem, already a
  transitive dep (via `time`, `compositor`). Promoted to direct — this
  is "Existing installed dependency" (RULES.md order #2), not a new
  external crate.
- `serde_json`: the standard Rust JSON codec. Already used in-repo by
  `compositor` and the Tauri crate. New direct dep but the most
  standard/low-risk choice ("Small well-maintained library" #4) — the
  web app persists projects as JSON, so this matches the on-disk shape.
- `thiserror`: typed error enums. Already transitive (via
  `compositor`/`effects`/`masks`). Promoted to direct for
  `PersistError`. Standard, zero-runtime-cost.

Alternatives considered:
1. **Hand-rolled JSON** — reinvents serde_json, violates "Do Not
   Reinvent".
2. **A binary format (bincode/postcard)** — smaller/faster but not
   human-inspectable; the web app uses JSON, and hand-editability helps
   debugging during migration. JSON chosen.
3. **`anyhow` for errors** — violates "No unnecessary `any`"; `thiserror`
   keeps errors typed (RULES.md "Typed over dynamic").

Security review:
- Known vulnerabilities: none for any of the three (serde ecosystem is
  ubiquitous, audited).
- Install scripts: none (Rust crates).
- Transitive risk: minimal — serde_json pulls `itoa`, `memchr`, `ryu`,
  `zmij` (all tiny, standard).
- No network, no unsafe in the used surface.

Maintenance: all three are among the most-used Rust crates, very active,
stable APIs.

License: MIT OR Apache-2.0 (all three; compatible with Artidor).

Bundle/performance impact: negligible (serde is already compiled
transitively; serde_json adds ~100KB).

Rollback plan: remove the three from `apps/desktop-native/Cargo.toml`
and delete `src/persist.rs` + the Ctrl+S wiring. `rust/**` never edited.

Approved by: User (implicit via owner override 2026-06-27 for the Win32
path; these are standard serde-ecosystem deps already used in-repo).

## PENDING APPROVAL — Increment 6b: top-1 export via ffmpeg-sidecar (DRAFTED, NOT yet added)

> **Status: APPROVED 2026-06-27** — user delegated the choice ("yang
> terbaik") after reviewing the drafted decision; ffmpeg-sidecar (the
> recommended option) is approved for implementation with the
> supply-chain mitigations below (default-features = false, no runtime
> binary download, bundle a pinned LGPL binary at packaging time).

Package: ffmpeg-sidecar (recommended)
Version: 2.5.2 (or latest stable at approval time)
Ecosystem: cargo (Rust)

Problem: the owner asked for the top-1 fastest **export** path on
Windows. Export = render frames via the repo's `compositor` crate (the
same pipeline used for preview, Increment 1) → feed them to a video
encoder → write an `.mp4`. The fastest available path on Windows is a
native FFmpeg encoder with hardware acceleration (GPU h264/hevc via
`-hwaccel auto` / QSV / NVENC / AMF). The browser-based web app uses
MediaRecorder (slow, software-only); the native shell can do much
better. This is the export half of the "top-1 backend" the owner
requested.

Decision (recommended): use **ffmpeg-sidecar** — a Rust wrapper around
the FFmpeg **CLI binary** (no FFI linking). Pipeline:
  compositor.render_frame_to_bytes(frame) → BGRA bytes via stdin →
  ffmpeg-sidecar (rawvideo input, `-hwaccel auto` encode, h264/hevc) →
  .mp4 file.

Why ffmpeg-sidecar over ffmpeg-next (the FFI binding):
1. **Build pain**: ffmpeg-next links against FFmpeg's libav source,
   requiring a full C toolchain + libav dev headers. This is notoriously
   painful on Windows and would complicate CI + every contributor's
   setup. ffmpeg-sidecar invokes a prebuilt FFmpeg binary — no C build.
2. **Top-1 speed**: `-hwaccel auto` lets FFmpeg pick the best hardware
   encoder (NVENC on NVIDIA, QSV on Intel, AMF on AMD). ffmpeg-next can
   also do this but with far more boilerplate. Encoding is 99% of the
   cost; stdin/stdout IO is not the bottleneck (per the ffmpeg-sidecar
   author + standard knowledge).
3. **Licensing**: FFmpeg source is GPL/LGPL. Linking it (ffmpeg-next)
   pulls those obligations in. ffmpeg-sidecar ships/uses a standalone
   binary and does NOT link FFmpeg source, avoiding the GPL source-link
   requirement. We bundle a pinned FFmpeg binary (see supply-chain).
4. **Maintenance**: ffmpeg-next is in **maintenance-mode** (the author
   states PRs are unlikely to be merged). ffmpeg-sidecar is actively
   developed (latest 2.5.2, regular releases).

Alternatives considered:
1. **ffmpeg-next** (FFI bindings) — rejected: build pain on Windows,
   maintenance-mode, GPL-linking, WTFPL license (permissive but unusual;
   MIT preferred).
2. **ffmpeg-sidecar** (CLI wrapper) — recommended (above).
3. **Hand-roll an encoder** (e.g. openh264 crate) — reinvents a massive
   codec, violates "Do Not Reinvent", nowhere near FFmpeg's format/
   hardware coverage.
4. **Browser MediaRecorder in a WebView** — not native, software-only,
   not top-1 (the whole point of the native shell is to beat this).

Security review:
- **Supply-chain — CRITICAL mitigation**: ffmpeg-sidecar's default
  feature `download_ffmpeg` auto-downloads an FFmpeg binary from the
  internet at runtime. That violates "no network by default" +
  supply-chain safety (a compromised mirror = malicious binary). We
  will **disable `download_ffmpeg`** (`default-features = false`) and
  **bundle a pinned FFmpeg binary** in the app's install dir (or require
  a user-provided path). No runtime binary download.
- The crate itself (`ffmpeg-sidecar`) is pure Rust + MIT, audited-ish
  (28 versions, used widely). Its non-default deps (ureq/tar/xz2/zip)
  are only pulled by `download_ffmpeg`, which we disable.
- Spawns a subprocess (`std::process::Command`) — same as shelling out
  manually. No `unsafe`, no FFI in the used surface.
- Frame data flows via stdin pipe (BGRA bytes) — never touches disk
  unencrypted-intermediate; output is the user-chosen `.mp4`.

License:
- `ffmpeg-sidecar`: **MIT** (compatible with Artidor's MIT LICENSE).
- The bundled FFmpeg binary: FFmpeg is LGPL/GPL depending on build
  config. We will bundle an **LGPL build** (no non-free codecs) and
  document the LGPL obligation in the app's About/legal text. This is
  the same licensing model many commercial editors use with FFmpeg.

Maintenance:
- ffmpeg-sidecar: MIT, active (2.5.2 latest, regular releases since
  2023), 28 versions.
- FFmpeg binary: upstream FFmpeg, very active.

Bundle/performance impact:
- Bundle: ~30-80MB FFmpeg binary (LGPL build, zipped). Adds to install
  size but is the cost of native export.
- Performance: top-1 — hardware-accelerated encode, far faster than
  browser MediaRecorder. This is the explicit goal.

Rollback plan:
1. Remove `ffmpeg-sidecar` from `apps/desktop-native/Cargo.toml`.
2. Delete the export module (to be created in `src/export.rs`).
3. Remove the bundled FFmpeg binary from the install dir.
4. `rust/**` never edited; nothing else affected. Ctrl+S persistence
   (Increment 6a) stays — export is independent of save/load.

Open question for the user (blocks implementation):
- Approve adding `ffmpeg-sidecar` (MIT, CLI wrapper, hwaccel) with
  `default-features = false` (no runtime binary download) + bundling a
  pinned LGPL FFmpeg binary? Or prefer `ffmpeg-next` (FFI) despite the
  build/licensing downsides? Or defer export and do a different
  increment?

Approved by: User (2026-06-27, "yang terbaik" = delegated choice after
reviewing the drafted decision; ffmpeg-sidecar recommended option
approved).

## 2026-06-27 — compositor + gpu (path-deps, repo's own crates)

Package: compositor, gpu (and transitive effects, masks)
Version: 0.1.0 (local path)
Ecosystem: cargo (Rust) — path dependencies

Problem: The Win32 native shell needs the repo's shared compositor
(layer/blend/mask shaders, frame descriptor) and GPU context (WGPU
device/queue, surface configure) to render preview frames directly to a
D3D12 surface — the top-1 preview path the owner requested.

Decision: Depend on the repo's own crates via `path =
"../../rust/crates/..."`, exactly the same pattern the Tauri crate uses
(`apps/desktop-web/src-tauri/Cargo.toml`). This reuses shared logic
(RULES.md "Existing code in repo" = priority #1) with NO duplication and
NO edits to `rust/**` (sensitive path — read-only dependency).

Alternatives considered:
1. **Reimplement compositor/gpu in the native crate** — massive
   duplication, violates "No duplicate domain logic".
2. **Depend on them** (chosen) — zero duplication, shared logic, matches
   the Tauri pattern.
3. **Compile the web WASM compositor** — wrong target (wasm32), no native
   surface access.

Security review: N/A — these are the repo's own crates, already reviewed
in-tree. No new external code introduced.

Maintenance: maintained as part of this repo.

License: same as repo (MIT).

Bundle/performance impact: native WGPU/D3D12 (no WASM layer); this is
the performance win, not a cost.

Rollback plan: remove the two path-deps from
`apps/desktop-native/Cargo.toml`. `rust/**` was never edited, so nothing
to revert there.

Approved by: User (implicit via owner override 2026-06-27).

## PENDING — Top-1 export dependency decision (Increment 6, NOT yet added)

The owner asked for the top-1 fastest **export** path too. The leading
candidate is a native FFmpeg integration driven by the compositor:
- Render frames to a shared GPU texture (avoid CPU readback) and feed an
  FFmpeg hardware pipeline, OR
- Per-frame `compositor.render_frame_to_bytes` -> FFmpeg software encode.

No FFmpeg crate will be added until a full dependency decision is written
here (per DEPENDENCY_POLICY "Forbidden Without Explicit Approval": media
pipeline frameworks need approval). Candidate crates to evaluate then:
`ffmpeg-next` (safe wrapper), or shelling out to a bundled FFmpeg binary.
Decision deferred to Increment 6 per
`features/desktop-native-win32/PLAN.md`.

