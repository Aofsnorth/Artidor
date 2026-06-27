# Plan: Desktop Tauri Migration

## Phases (smallest safe changes, each verified)

### Phase 1: Tauri scaffold (this session)
1. Add `tauri` crate to workspace
2. Create `apps/desktop/src-tauri/` with minimal Tauri config
3. One hello-world command to verify Tauri builds
4. **Verify**: `cargo check` + `cargo tauri build` (or dev)

### Phase 2: Tauri commands for compositor
5. `render_frame` command — takes FrameDescriptor JSON, returns BGRA bytes
6. `init_compositor` command — creates WGPU context + compositor
7. `upload_texture` command — uploads media to GPU
8. `resize_compositor` command — resizes output texture
9. **Verify**: `cargo check` + unit test render_frame returns correct size

### Phase 3: Web frontend Tauri detection
10. `apps/web/src/lib/tauri/detect.ts` — detect if running in Tauri
11. `apps/web/src/lib/tauri/compositor-bridge.ts` — IPC wrapper that
    mirrors `wasm-compositor.ts` interface
12. Switch renderer to use Tauri bridge when detected
13. **Verify**: `bunx tsc --noEmit` + `bun run lint:web`

### Phase 4: Native export pipeline
14. `export_video` command — FFmpeg native pipeline
15. Wire web export button to Tauri command when in desktop mode
16. **Verify**: `cargo check` + manual export test

### Phase 5: Cleanup
17. Remove old GPUI code (`apps/desktop/src/ui/`, `apps/desktop/src/app.rs`, etc.)
18. Update `AGENTS.md` architecture section
19. What's New entry
20. **Verify**: full `cargo check` + `bunx tsc --noEmit` + `bun run lint:web`

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
