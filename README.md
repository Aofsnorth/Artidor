# ⚠️ ATTENTION: UNDERGOING STABILIZATION

> **Please be advised that this application is currently undergoing major stabilization, bug fixes, and a comprehensive codebase audit.** 
> **Do not use this application in production or rely on it for critical work until these processes are complete.**

<br />

<div align="center">

<a href="https://artidor.vercel.app/">
<img src="apps/web/public/logos/artidor/logo-particles.png" alt="Artidor" width="180" />
</a>

### The video editor that respects your machine.

**Local-first · MIT-licensed · No uploads · No paywalls · AI-native**

<a href="https://artidor.vercel.app/">Website</a> · <a href="#quick-start">Quick start</a> · <a href="#features">Features</a> · <a href="#ai-co-pilot">AI Co-Pilot</a> · <a href="https://github.com/Aofsnorth/Artidor/issues">Issues</a> · <a href="https://discord.com/invite/Mu3acKZvCp">Discord</a>

[![MIT License](https://img.shields.io/badge/license-MIT-white?style=flat-square)](./LICENSE)
[![Built on OpenCut](https://img.shields.io/badge/fork-OpenCut-2a2a2a?style=flat-square)](https://github.com/OpenCut-app/OpenCut)
[![Bun](https://img.shields.io/badge/bun-1.2.18-f9f1e1?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![Next.js 16](https://img.shields.io/badge/next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/react-19-149eca?style=flat-square&logo=react)](https://react.dev)
[![Rust 2024](https://img.shields.io/badge/rust-2024-f74c00?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![wgpu](https://img.shields.io/badge/gpu-wgpu-005a9c?style=flat-square)](https://wgpu.rs)
[![Postgres](https://img.shields.io/badge/db-postgres-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)

</div>

## Preview

<p align="center">
  <img src="docs/progress/image-1.png" alt="Artidor Main Workspace" width="100%" />
</p>
<p align="center" style="display: flex; justify-content: space-between; gap: 2%;">
  <img src="docs/progress/image-2.png" alt="Artidor Detail" width="49%" />
  <img src="docs/progress/image-3.png" alt="Artidor Detail" width="49%" />
</p>
<p align="center" style="display: flex; justify-content: space-between; gap: 2%;">
  <img src="docs/progress/image-4.png" alt="Artidor Detail" width="49%" />
  <img src="docs/progress/image-5.png" alt="Artidor Detail" width="49%" />
</p>

---

## Why

Most "free" video editors are paywalled. The rest upload your footage to a server you don't control. The ones that don't are unusable.

Artidor does the obvious things:

- **Local-first.** Your media and your projects live on your device. No upload, no cloud relay, no "free tier" that throttles after 50 exports.
- **Actually free.** MIT-licensed. Nothing paywalled, nothing watermarked, nothing "Pro" tier.
- **Web, desktop, mobile.** Same Rust core, three frontends. Start a project on your laptop, finish it on your phone.
- **AI-native.** An optional Co-Pilot that speaks every command the editor speaks — and learns your style as you edit.

No manifesto. No "rethinking the creative process." Just a tool that works.

---

## Features

### Editing
- **Non-destructive timeline** — tracks, scenes, elements with frame-accurate keyframes
- **Multi-track composition** — main, overlay, audio tracks; independent blend modes
- **Inspector** — transform, opacity, blend mode, effects, masks, audio per element
- **Effect library** — procedural effects (blur, glitch, color grade, particle, typography)
- **Transitions** — fade, wipe, slide, morph, plus 30+ presets
- **Captions** — auto-detect speech, editable in-line
- **Color grading** — wheels, scopes, LUTs, curves
- **Motion tracking** — point / box / planar trackers
- **Speed ramping** — preset or custom curves with audio stretch
- **Stabilization** — 2D rolling-shutter + full gyro-aware (when available)
- **Audio waveform** — RMS-normalized, beat detection, stretch
- **Text tracks** — alignment, weight, italic, decoration, tracking, motion presets
- **Bookmarks** — first, last, prev, next via transport keys

### Performance
- **GPU compositor** — wgpu-based, runs WebGL / Metal / Vulkan / DX12
- **Rust core** — `TICKS_PER_SECOND = 120_000` for lossless time math at 24/25/29.97/30/50/59.94/60/120 fps
- **Lazy chunk loading** — heavy tabs (AI Edit) load on first click
- **Streaming renders** — `MediaRecorder` chunks, no full download
- **Service worker cache** — returning visitors load the app shell in < 200ms

### Platform
- **Web** — Next.js 16 + React 19, ships as a PWA
- **Desktop** — GPUI (in progress), same Rust core
- **Mobile** — responsive web app, the same UI on small screens
- **Cloud** — Postgres + Redis for projects that *want* to sync (off by default)

---

## AI Co-Pilot

`Artidor` ships with an AI panel in the left bar (under **Assets**). The Co-Pilot speaks every command the editor speaks — split, trim, retime, keyframe, transition, color-grade, import, export — and **dispatches them as tool calls** against the live editor.

Three things set it apart from "AI edits your video" toys:

### 1. It's not a wrapper
The Co-Pilot doesn't transcribe your prompt and run a script. It has 40+ typed tools — `set_project_fps`, `insert_text_element`, `upsert_keyframe`, `apply_preset`, `export_project` — each one wraps a real `EditorCore` method. The LLM can't hallucinate outside the editor's surface.

### 2. It learns from you
Every command you fire (via mouse, keyboard, *or* the AI) is logged to a 500-event telemetry store. The Co-Pilot's system prompt includes your **last 20 edits** — cut pattern, easing, pacing — so its suggestions match your style instead of generic.

### 3. It can clone a reference video
Drop a finished video into the AI panel. The **style extractor** runs entirely client-side:
- 16-frame sampling → 4×4×4 RGB histogram (dominant palette)
- Luma-delta cut detection (cuts-per-minute, average shot length)
- Motion energy curve (32-bucket intensity over time)
- BPM autocorrelation (audio tempo)
- → A `StyleProfile` injected into the prompt

The Co-Pilot then imitates that pacing on your timeline.

### Configure

```bash
# .env.local — pick ONE
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434  # local
```

If no key is set, the panel still opens — it just tells you on the first send.

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh) ≥ 1.2.18. Docker is optional (for cloud features like collab).

### Just the editor (offline, no DB)

```bash
git clone https://github.com/Aofsnorth/Artidor.git
cd Artidor
bun install
bun dev:web
```

Open <http://localhost:3000>. Projects live in IndexedDB; nothing leaves your machine.

### Full stack (cloud features + auth + collab)

```bash
git clone https://github.com/Aofsnorth/Artidor.git
cd Artidor
docker compose up -d db redis serverless-redis-http
cp apps/web/.env.example apps/web/.env.local
bun install
bun dev:web
```

The default `.env.example` works out of the box — Postgres + Redis are auto-created with dev credentials. The offline editor works without any of this.

### Editing the Rust core

```bash
# Build the WASM module once
bun run build:wasm
cd rust/wasm/pkg && bun link
cd ../../apps/web && bun link artidor-wasm

# Or: rebuild on every change
bun dev:wasm      # in a second terminal
bun dev:web       # in the first
```

### Desktop

`apps/desktop` uses GPUI. See [`apps/desktop/README.md`](apps/desktop/README.md) for the Rust toolchain.

---

## Project layout

```
Artidor/
├─ apps/
│  ├─ web/                       Next.js 16 + React 19 frontend
│  │  ├─ src/
│  │  │  ├─ app/                 Routes, layouts, server components
│  │  │  │  ├─ api/              API routes (ai, auth, drive, github, …)
│  │  │  │  ├─ editor/           /editor/[project_id] — the workspace
│  │  │  │  └─ projects/         /projects — the dashboard
│  │  │  ├─ components/          UI shell — no domain logic
│  │  │  │  └─ editor/panels/    Asset / properties / timeline
│  │  │  ├─ core/                EditorCore facade + 14 managers
│  │  │  ├─ hooks/               React bindings
│  │  │  ├─ lib/
│  │  │  │  ├─ ai/               AI Co-Pilot (provider, tools, telemetry, style)
│  │  │  │  ├─ timeline/         Timeline types
│  │  │  │  └─ export/           MediaRecorder pipelines
│  │  │  └─ stores/              Zustand stores
│  │  └─ public/                 Static assets (logos, fonts, screenshots)
│  └─ desktop/                   GPUI shell — same Rust core
│
├─ rust/
│  ├─ wasm/                      Compiles to artidor-wasm npm package
│  └─ crates/                    Workspace crates
│     ├─ bridge/                 #[export] proc-macro → wasm_bindgen
│     ├─ time/                   MediaTime, FrameRate, Easing, keyframes
│     ├─ gpu/                    wgpu device + pipeline cache
│     ├─ compositor/             Scene graph + draw ordering
│     ├─ effects/                Effect definitions + parameter trees
│     └─ masks/                  Mask shapes + compositing
│
├─ docs/                         Architecture notes
└─ .github/                      CI, issue templates, contributing
```

**Rule of thumb:** *if it's not a UI concern, it goes in `rust/`.* Every line of business logic in `apps/web/src/core/` is a migration in progress.

---

## Environment variables

The app works **fully offline** with no environment variables. The defaults in `apps/web/.env.example` cover local dev. Cloud / AI features need these:

| Variable | Required for | Default |
|---|---|---|
| `OPENAI_API_KEY` | AI Co-Pilot (GPT) | — |
| `ANTHROPIC_API_KEY` | AI Co-Pilot (Claude) | — |
| `OLLAMA_BASE_URL` | AI Co-Pilot (local) | `http://localhost:11434` |
| `GITHUB_TOKEN` | Higher GitHub API rate (5k/hr) | — |
| `DATABASE_URL` | Postgres (cloud features) | `postgresql://artidor:artidor@localhost:5432/artidor` |
| `BETTER_AUTH_SECRET` | Auth | dev-only fallback |
| `UPSTASH_REDIS_REST_URL` | Redis | `http://localhost:8079` |
| `UPSTASH_REDIS_REST_TOKEN` | Redis | dev-only fallback |
| `FREESOUND_CLIENT_ID` | Sound search | — |
| `FREESOUND_KEY` | Sound search | — |

---

## Architecture highlights

- **Single source of truth for time.** `rust/crates/time` exposes `MediaTime(i64)` wrapping ticks at `TICKS_PER_SECOND = 120_000`. That divides cleanly into every supported framerate (24/25/29.97/30/50/59.94/60/120), so frame boundaries are never fractional.
- **One Rust core, three frontends.** All non-UI code lives in `rust/`. Frontends are replaceable; the core is not. `#[export]` on a Rust function turns into `#[wasm_bindgen(js_name = "camelCase")]` automatically.
- **No business logic in React.** The `apps/web/src/core/` facade is a thin wrapper over the Rust core. Components own rendering, never domain rules.
- **Self-improving AI.** Telemetry is a 500-event ring buffer persisted to `localStorage`. The LLM sees your last 20 edits and matches them.
- **CSS-first animations.** No animation library — `motion/react` only for orchestration; everything else is `transition` + CSS variables.

---

## Scripts

| Script | What it does |
|---|---|
| `bun dev:web` | Next.js dev server on :3000 |
| `bun dev:wasm` | `cargo watch` rebuilds the Rust → WASM package on every change |
| `bun run build:web` | Production build of the web app |
| `bun run build:wasm` | One-shot WASM build |
| `bun run lint:web` | Biome lint |
| `bun run lint:web:fix` | Biome lint with `--write --unsafe` |
| `bun run format:web` | Biome format (renderer dir) |
| `bun run test` | Bun test runner |
| `bun run preview:web` | Next.js production preview |
| `bun run publish:wasm` | Build + publish `artidor-wasm` to npm |
| `bun run generate:fonts` | Regenerate the font sprite chunks in `public/` |

---

## Contributing

Two rules:

1. **Don't write what the platform already gives you.** `aria-*` beats `div`. CSS `transition` beats an animation lib. Postgres constraints beat app code. A Rust iterator beats a JS one.
2. **Logic goes in `rust/`, UI goes in `apps/`.** If you find yourself putting a domain rule in a React component, move it.

Before opening a PR:
- `bun run lint:web` (and `lint:web:fix` for what biome can repair)
- `bun run test` (Bun test runner)
- `cd apps/web && bunx tsc --noEmit` (no type errors)

For larger changes, open an issue first so we can agree on direction. See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) for the rest.

---

## Community

- **Discord** — 
- **X / Twitter** — 
- **GitHub Discussions** — <https://github.com/Aofsnorth/Artidor/discussions>
- **Sponsors** — <https://artidor.vercel.app/sponsors> (if you want to throw a few bucks at the project)

---

## License

[MIT](./LICENSE). Use it, fork it, ship a competitor, whatever.

Built on the foundation of [OpenCut](https://github.com/OpenCut-app/OpenCut) — same MIT license, same DNA. All Rust core is original Artidor work.

<div align="center">

<sub>Built in public · The repo is the brand</sub>

</div>
