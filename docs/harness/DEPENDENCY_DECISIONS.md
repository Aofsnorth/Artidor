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