# Risks: Desktop Tauri Migration

## Risk: GPUI code deletion is irreversible

- **Likelihood**: Low (git history preserves everything)
- **Impact**: Medium (if Tauri approach fails, need to revert)
- **Mitigation**: Phase 5 (cleanup) is last. Phases 1-4 build Tauri
  alongside GPUI. Only delete after Tauri is verified working.
- **Rollback**: `git checkout -- apps/desktop/`

## Risk: Tauri WebView differences from browser

- **Likelihood**: Medium
- **Impact**: Medium (some CSS/APIs may behave differently in WebView2)
- **Mitigation**: Tauri uses system WebView (Edge WebView2 on Windows,
  WebKit on macOS/Linux). These are the same engines as Chrome/Safari.
  Test critical paths (canvas, WebGL, WASM) early in Phase 2.
- **Rollback**: Web app continues to work in browser as-is.

## Risk: WGPU context creation in Tauri vs WASM

- **Likelihood**: Low
- **Impact**: Low (WGPU native is more capable than WASM WGPU)
- **Mitigation**: `gpu` crate already supports native (non-wasm) targets.
  The compositor already works with native WGPU in the GPUI app.
- **Rollback**: Fall back to WASM compositor in WebView.

## Risk: FFmpeg dependency for export

- **Likelihood**: Medium
- **Impact**: Medium (FFmpeg must be bundled or system-installed)
- **Mitigation**: Use `ffmpeg-next` crate or shell out to system FFmpeg.
  Decision deferred to Phase 4. Document in DEPENDENCY_DECISIONS.md.
- **Rollback**: Use browser MediaRecorder in WebView (existing path).

## Risk: Large Cargo.toml change

- **Likelihood**: Low
- **Impact**: Low (additive — new workspace member, no changes to existing)
- **Mitigation**: Tauri is a separate crate, doesn't affect existing crates.
- **Rollback**: Remove `apps/desktop/src-tauri` from workspace members.

## No security risk

- Tauri's IPC is deny-by-default (capabilities-based)
- No secrets, auth, or MCP changes
- Tauri uses system WebView (no bundled Chromium with known CVEs)
- MIT/Apache-2.0 dual license (compatible with Artidor)
