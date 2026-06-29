# Artidor Roadmap

This roadmap is the product direction for Artidor.

AI agents must read this file before implementing new features.

## Current Focus (Q3 2026)

- **Desktop migration** — Tauri 2.0 shell replacing GPUI (in progress)
- **Performance** — Web Worker offloading, native rendering, faster export
- **Stabilization** — Bug fixing, timeline/editor reliability
- **Security hardening** — CI supply chain, secret scanning, OWASP
- **AI copilot safety** — Typed tools, permission bypass, takeover control

## Recently Shipped (2026-06-24 → 2026-07-09)

### Desktop
- Tauri 2.0 scaffold with native WGPU compositor commands (init_compositor, render_frame, is_compositor_ready)
- Web frontend Tauri detection + IPC bridge (detect.ts, compositor-bridge.ts)
- GPUI desktop app scaffold (will be phased out — kept for reference)
- Desktop UI parity patches (header, footer, tab bar, viewport, timeline, assets, inspector)
- Safety hardening: panic → graceful, file size limits (200MB), dimension limits (8192px)

### Performance
- Beat detection moved to Web Worker (5-10x faster, no UI freeze, live progress)
- Waveform peak computation with event-loop yielding
- Mediabunny buffers() loops now yield between chunks
- AI chat panel re-render optimization (granular zustand selectors)
- AI status animation moved to CSS (no JS interval re-renders)
- Export performance tuning, preview fast-seek, AV1 codec research

### AI Copilot
- 18+ new low-level tools (playback, info, bookmark CRUD, snapshot)
- AI can read timeline markers and element bookmarks
- Tool chaining with element IDs
- AI takeover mode with aurora border + revoke race fix
- Multimodal vision/video support
- Per-project chat history with persisted revert
- Custom AI persona, reference button, expandable tool calls
- Provider cards redesign, searchable Puter models, model fetch UI
- MCP server cards, MCP CSP fix, full tool coverage MCP client

### Editor
- Per-property copy/paste
- Camera switcher transitions, fog/DOF toggles
- Playhead drag scrub, scrub drag mode dropdown
- Timeline virtualization re-render fix
- Drag z-order fix, import storage hydration fixes
- Stock library songs, templates, feedback

### Security
- CI supply chain hardening
- SSRF fix + provider timeout
- CodeQL security fixes
- Rate limit fail-open
- Secret scan, Semgrep SAST, dependency audit

### Infrastructure
- Realtime collaboration scaffold
- Docs page
- Google verification
- Vercel preview deployment

## Not Allowed Without Approval

- Large rewrite (Tauri migration is the current approved exception)
- New monetization/paywall
- Cloud-first behavior
- User media upload by default
- Auth/payment changes
- Public API changes
- New dependency-heavy features
- Major UI redesign without plan
- Force push to main
- Editing `.env*`, secrets, credentials
- Changing license/legal text
- Disabling CI/security checks

## Approved overrides (owner decisions)

- **2026-06-27 — Win32 native desktop path** (`apps/desktop-native/`):
  the owner approved a full native Win32 API rewrite of the web app as a
  parallel desktop shell, kept alongside the web app (`apps/web`) and the
  Tauri path (`apps/desktop-web`). This is a large rewrite that overrides
  the "Tauri migration is the current approved exception" rule above. It
  is built incrementally from the smallest verifiable unit (Increment 0 =
  a single native Win32 window). See `features/desktop-native-win32/`.
  Tauri remains the roadmap-default desktop shell; Win32 is an explicit
  parallel path, not a replacement.

- **2026-06-29 — MKV multi-track dubbing/subtitle switching**
  (`features/mkv-multitrack-switching/`): the owner approved a new
  web-only feature that lets users switch the active embedded audio
  (dubbing) track and subtitle track on multi-track MKV files (and
  other supported multi-track containers), plus toggle subtitles
  on/off. This is off the Q3 2026 stabilization focus and overrides
  the "Do not add off-roadmap features without approval" rule. Scope
  is explicitly limited to **track switching + toggle** — no subtitle
  text editing, no re-dubbing, no desktop paths. MKV playback already
  works in the web preview per owner. Phase 0 (mediabunny API audit)
  gates any feature code; no new dependency without owner approval
  and `docs/harness/DEPENDENCY_POLICY.md` compliance. See
  `features/mkv-multitrack-switching/`.

## Feature Priorities

### P0 — Critical (must fix before any new features)

- Prevent data loss
- Prevent broken exports
- Fix crashes
- Fix security issues
- Fix project persistence
- Fix timeline corruption

### P1 — Important (active work)

- **Tauri migration completion** — wire renderer to native compositor, native FFmpeg export, delete old GPUI code
- **Performance on heavy projects** — Web Worker offloading for audio decode, native rendering, faster export
- Timeline stability
- Editor UX reliability
- AI copilot typed tool safety
- E2E coverage for core editor flow

### P2 — Nice to Have (after P1 is stable)

- New effects
- New templates
- UI polish
- Additional transitions
- More AI editing presets
- Mobile app (Tauri mobile)
- Plugin SDK

## Active Initiatives

### 1. Desktop Tauri Migration (in progress)

**Status**: Phase 1-3 complete (scaffold + commands + web bridge). Phase 4-5 pending.

**Phases**:
- [x] Phase 1: Tauri scaffold (Cargo.toml, tauri.conf.json, icons, capabilities)
- [x] Phase 2: Tauri commands (init_compositor, render_frame, is_compositor_ready)
- [x] Phase 3: Web frontend Tauri detection + compositor bridge
- [ ] Phase 4: Wire web renderer to NativeCompositor when in Tauri
- [ ] Phase 5: Native FFmpeg export pipeline
- [ ] Phase 6: Delete old GPUI code (apps/desktop-web/src/ui/, app.rs, etc.)
- [ ] Phase 7: Update AGENTS.md, What's New, release notes

**Track**: `feat/desktop-tauri-migration` branch, PR #36

### 2. Performance Offloading (ongoing)

**Completed**:
- [x] Beat detection → Web Worker
- [x] Waveform peak computation → yielding
- [x] Mediabunny buffers() → yielding
- [x] AI chat panel → granular selectors

**Pending**:
- [ ] Audio decode (decodeAudioData) → Web Worker or chunked decode
- [ ] OfflineAudioContext.startRendering() → yield or worker
- [ ] Export pipeline → native FFmpeg (via Tauri when desktop)
- [ ] Preview rendering → native WGPU (via Tauri when desktop)

### 3. AI Copilot Safety (ongoing)

**Completed**:
- [x] Typed tool executor with schema validation
- [x] Permission bypass mode (user-approved)
- [x] Takeover control with revoke
- [x] Tool chaining with element IDs
- [x] Per-project chat history

**Pending**:
- [ ] Tool execution sandboxing
- [ ] Rate limiting per tool
- [ ] Audit log for all tool calls
- [ ] Rollback for destructive tool calls

### 4. Desktop Native — Win32 API (owner-approved, in progress)

**Status**: Increment 0–4g + 5 + 6a + 6b + 6c + 7 complete. Increment 0 = native
Win32 window scaffold. Increment 1 = top-1 preview foundation (native
WGPU/D3D12 surface, zero CPU readback). Increment 2 = 1:1 editor chrome
(GDI on parent + D3D12 on child HWND). Increment 3 = state model
(reusing the repo's `time` crate, 13 unit tests). Increment 4 = state
wired to UI (per-window `WindowState`, chrome from live `Project`).
Increment 4b = interactive timeline panel (track list + arrow-key frame
seek). Increment 4c = track selection + keyboard interactions (Up/Down
select, T add track, M toggle mute). Increment 4d = panel content (rename
dialog Ctrl+R, click-to-seek, property fields, element/clip model + clip
rendering, 'E' to add test clips). Increment 4e = playback (Spacebar
play/pause, WM_TIMER frame-accurate advance). Increment 4f = clip
selection + delete (click clip to select, Delete key, clip properties in
inspector). Increment 4g = playback transport UI (play/pause indicator +
timecode in footer). Increment 5 = AI copilot stub (local suggestions,
no network/keys) + teleprompter overlay (Ctrl+P, scrolls text over
preview based on playhead). Increment 6a = native project persistence
(save/load `.artpr.json` via serde + std::fs, atomic write, Ctrl+S).
Increment 6b = top-1 export backend (compositor → ffmpeg-sidecar with
`-hwaccel auto` → `.mp4`, Ctrl+E). Increment 6c = native file dialogs +
media import (GetOpenFileNameW/GetSaveFileNameW, Ctrl+S/O/I/E via native
dialogs, MediaAsset model with native file paths). Increment 7 =
packaging notes (FFmpeg bundling, release build, distribution). 49 unit
tests total. Built up incrementally toward full 1:1 UI parity. The web
app and the Tauri path are both kept and still ship.

**Crate**: `apps/desktop-native/` — standalone Rust crate with its own
`[workspace]` (the sensitive root `Cargo.toml` is NOT edited). Win32 API
is accessed via the official Microsoft `windows` crate (windows-rs).

**Phases**: see `features/desktop-native-win32/PLAN.md` (Increment 0 =
window scaffold; later increments add app shell, state bridge, viewport
compositor, panels, AI/copilot, native I/O + export, workspace/CI).

**Approval**: owner override 2026-06-27 (see "Approved overrides" above).

## Roadmap Rule

Every feature must answer:

1. Is this aligned with the roadmap?
2. Is this user-facing?
3. Does it need a What's New entry?
4. Does it need docs?
5. Does it need migration/rollback notes?

## Sensitive Paths

```txt
.env*
**/*.pem
**/*.key
**/*secret*
**/*token*
.github/workflows/**
.github/dependabot.yml
.github/CODEOWNERS
packages/mcp-server/**
apps/web/src/app/api/**
apps/web/src/lib/auth/**
apps/web/src/lib/ai/**
rust/**
Cargo.toml
package.json
bun.lock
Cargo.lock
LICENSE
```

## Tech Stack

- **Web frontend**: Next.js 16, React 19, TypeScript, Tailwind, Zustand
- **Desktop shell**: Tauri 2.0 (replacing GPUI)
- **Desktop shell (native, parallel)**: Win32 API via the `windows` crate — `apps/desktop-native/` (owner-approved 2026-06-27; incremental 1:1 rewrite of the web app)
- **Native backend**: Rust (compositor, gpu, effects, masks, time, bridge crates)
- **WASM bridge**: rust/wasm crate (initCompositor, renderFrame)
- **Package manager**: Bun
- **CI**: GitHub Actions (CI, Bun CI, Security, E2E, Release)
- **Deploy**: Vercel (web), Tauri bundler (desktop)
