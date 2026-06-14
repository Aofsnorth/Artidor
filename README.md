<p align="center">
  <img src="apps/web/public/logos/artidor/logo-uploaded.png" alt="Artidor" width="180" />
</p>

<p align="center">
  <strong>Artidor</strong> &nbsp;·&nbsp; a video editor that respects your machine and your time
</p>

<p align="center">
  <a href="https://artidor.app">Website</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="https://github.com/Aofsnorth/Artidor/issues">Issues</a> ·
  <a href="./LICENSE">MIT License</a>
</p>

<p align="center">
  <sub>Built on the foundation of <a href="https://github.com/OpenCut-app/OpenCut">OpenCut</a> &nbsp;·&nbsp; MIT</sub>
</p>

---

## Why

The short version: most "free" video editors are paywalled, the rest upload your footage to a server you don't control, and the ones that don't are unusable.

Artidor does the obvious things:

- **Local-first.** Your media and your projects live on your device. No upload, no cloud relay, no "free tier" that throttles after 50 exports.
- **Actually free.** MIT-licensed. Nothing paywalled, nothing watermarked, nothing "Pro" tier.
- **Web, desktop, mobile.** Same Rust core, three frontends. Open a project on your laptop, continue on your phone.
- **AI-native.** Optional tools that fit your workflow, not the other way around.

No manifesto. No "rethinking the creative process". Just a tool that works.

---

## Quick start

Prerequisites: [Bun](https://bun.sh) and (optionally) [Docker](https://docs.docker.com).

```bash
git clone https://github.com/Aofsnorth/Artidor.git
cd Artidor
bun install
bun dev:web
```

Open <http://localhost:3000>. That's it.

For local Postgres + Redis (needed for cloud features like collab):

```bash
docker compose up -d db redis serverless-redis-http
cp apps/web/.env.example apps/web/.env.local
bun dev:web
```

The default `.env.example` works out of the box. Skip Docker entirely if you only need the offline editor.

### Editing the Rust core

```bash
bun run build:wasm
cd rust/wasm/pkg && bun link
cd apps/web && bun link artidor-wasm
```

Then `bun dev:wasm` rebuilds on every change.

### Desktop

`apps/desktop` uses GPUI. See [`apps/desktop/README.md`](apps/desktop/README.md) for the Rust toolchain setup.

---

## Project layout

```
Artidor/
├─ apps/
│  ├─ web/       Next.js 16 + React 19
│  └─ desktop/   GPUI (in progress)
├─ rust/
│  ├─ wasm/      Compiles to a JS-callable package
│  └─ crates/    Compositor, effects, masks, decoder
└─ docs/         Architecture notes
```

All business logic is moving into `rust/`. Frontend code is a UI shell — it never owns logic, only rendering and interaction.

---

## Contributing

Two rules:

1. Don't write what the platform already gives you. `aria-` beats `div`. CSS `transition` beats an animation lib. Postgres constraints beat app code.
2. Logic goes in `rust/`, UI goes in `apps/`. If you find yourself putting a domain rule in a React component, move it.

See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) for the rest.

---

## License

[MIT](./LICENSE). Use it, fork it, ship a competitor, whatever.
