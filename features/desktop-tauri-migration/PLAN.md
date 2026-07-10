# Plan: Desktop Tauri Migration

## Phases (smallest safe changes, each verified)

### Phase 1: Tauri scaffold (this session)

1. Add `tauri` crate to workspace
2. Create `apps/desktop/src-tauri/` with minimal Tauri config
3. One hello-world command to verify Tauri builds
4. **Verify**: `cargo check` + `cargo tauri build` (or dev)

### Phase 2: Tauri commands for compositor

1. `render_frame` command — takes FrameDescriptor JSON, returns BGRA bytes
2. `init_compositor` command — creates WGPU context + compositor
3. `upload_texture` command — uploads media to GPU
4. `resize_compositor` command — resizes output texture
5. **Verify**: `cargo check` + unit test render_frame returns correct size

### Phase 3: Web frontend Tauri detection

1. `apps/web/src/lib/tauri/detect.ts` — detect if running in Tauri
2. `apps/web/src/lib/tauri/compositor-bridge.ts` — IPC wrapper that
    mirrors `wasm-compositor.ts` interface
3. Switch renderer to use Tauri bridge when detected
4. **Verify**: `bunx tsc --noEmit` + `bun run lint:web`

### Phase 4: Native export pipeline

1. `export_video` command — FFmpeg native pipeline
2. Wire web export button to Tauri command when in desktop mode
3. **Verify**: `cargo check` + manual export test

### Phase 5: Cleanup

1. Remove old GPUI code (`apps/desktop/src/ui/`, `apps/desktop/src/app.rs`, etc.)
2. Update `AGENTS.md` architecture section
3. What's New entry
4. **Verify**: full `cargo check` + `bunx tsc --noEmit` + `bun run lint:web`

## What we keep from GPUI work

- `apps/desktop/src/media/loader.rs` — image decode logic → Tauri command
- `apps/desktop/src/state/` — project model (if needed on Rust side)
- Safety fixes (file size limits, path validation) → port to Tauri commands

## What we delete

- All `apps/desktop/src/ui/` — GPUI UI code
- `apps/desktop/src/app.rs` — GPUI app
- `apps/desktop/src/render/` — GPUI viewport (replaced by Tauri command)
- `apps/desktop/src/playback/` — GPUI playback (replaced by web)
- `apps/desktop/Cargo.toml` — GPUI deps (replaced by Tauri deps)
