# Artidor Desktop Native (Win32 API)

A **native Win32 API** desktop shell for Artidor, built incrementally
toward 1:1 UI parity with the web app (`apps/web`). The web app is
**kept and still shipped** — this is a parallel native path, not a
replacement.

Win32 API is accessed from Rust via the official Microsoft `windows`
crate (windows-rs). This keeps one toolchain for the whole repo and lets
the shell reuse the existing Rust core crates (`compositor`, `gpu`,
`effects`, `masks`, `time`) in later increments.

> **Roadmap note**: This is a large rewrite that the repo owner
> explicitly approved on 2026-06-27, overriding `ROADMAP.md` (which
> lists Tauri 2.0 as the official desktop shell). The Tauri migration
> continues independently. See
> `features/desktop-native-win32/FEATURE.md` and `RISKS.md`.

## Status

**Increment 5 + 7** — native window + top-1 D3D12 preview + 1:1 editor
chrome + interactive timeline (seek, track selection, add/mute, clip
blocks, click-to-seek, playhead indicator, clip selection + delete,
playback) + native project persistence + top-1 FFmpeg export + native
file dialogs + media import + rename dialog + property-fields panel +
AI copilot stub (local suggestions) + teleprompter overlay + packaging
notes. The shell now has the full file workflow, a usable timeline with
clip rendering and playback, and a local AI copilot. See
`features/desktop-native-win32/PLAN.md` for the full phased plan.

### Keyboard shortcuts

| Key | Action |
| ----- | -------- |
| `←` / `→` | Seek one frame back / forward |
| `↑` / `↓` | Select previous / next track |
| `T` | Add a track (cycles Video → Text → Audio → Graphic) |
| `E` | Add a 5s test clip at the playhead (selected track) |
| `M` | Toggle mute on the selected track |
| `Space` | Play / pause (frame-accurate, WM_TIMER) |
| `Delete` | Remove the selected clip |
| `Ctrl+R` | Rename project (native text-input dialog) |
| `Ctrl+P` | Teleprompter (set/clear scrolling text overlay) |
| `Ctrl+S` | Save project (native Save As dialog → `.artpr.json`) |
| `Ctrl+O` | Open project (native Open dialog → `.artpr.json`) |
| `Ctrl+I` | Import media file (native Open dialog → asset list) |
| `Ctrl+E` | Export video (native Save As dialog → FFmpeg `.mp4`) |
| Click | Click-to-seek on timeline; click clip to select |

## Build & run

This is a **standalone crate** (own `[workspace]`), intentionally
decoupled from the repo root workspace so the sensitive root
`Cargo.toml` is not edited. Build it from its own directory:

```bash
cd apps/desktop-native
cargo build
cargo run
```

A native window titled **"Artidor — Native"** (1280×800) opens showing
the editor frame 1:1 with the web app: dark header bar with "Artidor",
TabBar rail on the left, three panels (Assets | preview | Properties)
on the top row, Timeline below, and a footer status strip. The preview
panel interior is rendered by the native D3D12 compositor. Close the
window to exit.

## Requirements

- Rust toolchain (the repo already targets `edition = "2024"`,
  i.e. Rust 1.85+; the project currently uses 1.96).
- Windows (Win32 API). On non-Windows hosts this crate will not build —
  it is a Windows-only native shell.

## Layout

```text
apps/desktop-native/
├── Cargo.toml      # standalone crate; deps: windows, compositor, gpu, pollster, serde, ffmpeg-sidecar
├── README.md       # this file
└── src/
    ├── main.rs     # Win32 window + Renderer (GpuContext+Compositor+Surface) + UI chrome + keyboard
    ├── state.rs    # editor state model (Project, Track, Scene, Element, MediaAsset, Playhead)
    ├── persist.rs  # native project save/load (.artpr.json, atomic write, version check)
    ├── export.rs   # top-1 FFmpeg export (compositor → stdin → hwaccel → .mp4)
    ├── copilot.rs  # AI copilot stub (local suggestions, no network)
    └── dialogs.rs  # native Win32 dialogs (file open/save + text-input prompt)
```

## Verification

- `cargo build` succeeds inside `apps/desktop-native/`.
- `cargo test` — 49 unit tests (state model + persistence + export + copilot).
- `cargo run` launches the window; process stays alive in the message
  loop. All shortcuts work (dialogs open modally on demand, clips render
  on the timeline, click-to-seek moves the playhead, Space plays/pauses,
  copilot suggestions appear in the tools panel, Ctrl+P sets the
  teleprompter).
- No effect on `apps/web` or `apps/desktop-web` (crate is fully isolated;
  `rust/**` is depended-on via path, never edited).

## Packaging

### FFmpeg bundling

Export uses `ffmpeg-sidecar` (v2.5.2), which auto-downloads a matching
FFmpeg binary on first run to a per-user cache dir. For an offline /
shipped build, place `ffmpeg.exe` next to the app executable or set
`FFMPEG_BINARY` env var to an absolute path. The `export.rs` module
calls `ffmpeg_sidecar::command::FfmpegCommand::new`, which respects
these locations in order:

1. `FFMPEG_BINARY` env var (absolute path)
2. Sidecar-managed download cache (`%LOCALAPPDATA%\ffmpeg-sidecar\`)
3. System `PATH` (if FFmpeg is installed system-wide)

For a release bundle, copy `ffmpeg.exe` + `ffprobe.exe` into the
installer's `bin/` directory and set `FFMPEG_BINARY` at launch.

### Release build

```powershell
cd apps/desktop-native
cargo build --release
# Binary: target/release/artidor-desktop-native.exe
```

The release binary is a single `.exe` with no external DLLs (the
`windows` crate links against system DLLs only). For distribution:

1. Copy `artidor-desktop-native.exe` to the install directory.
2. Bundle `ffmpeg.exe` + `ffprobe.exe` (or rely on sidecar auto-download
   on first export).
3. Optional: sign the `.exe` with a code-signing certificate.

No installer is generated yet — that's a future increment (Inno Setup
or WiX). The crate is intentionally installer-agnostic.
