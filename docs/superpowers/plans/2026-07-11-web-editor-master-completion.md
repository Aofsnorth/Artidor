# Web Editor Master Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans`. Execute task-by-task. Update this ledger after every verified task.

**Goal:** Menyelesaikan seluruh permintaan sesi untuk editor web Artidor: reliability, UI consistency, searchable catalogs, real transition imagery, localization, Alight Motion-style effects, keyframes/blending, low-end-PC performance, correct preview/export/audio/transcription, security, and scalability evidence.

**Architecture:** Keep domain mutations in existing editor commands. Keep UI state in React/Zustand. Keep media analysis, effects, transcription, and export off the main thread or GPU-backed. Measure first; optimize evidenced bottlenecks only. Never claim CapCut superiority, hacker immunity, or one-million-user readiness without reproducible evidence.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Bun, Biome, existing WASM/WebGL/WebGPU/media workers. No new dependency by default.

## Global Constraints

- Scope only `apps/web`; docs may record web work. Never modify `apps/desktop-native`.
- Preserve user changes and the dirty worktree. No reset/clean/revert of unrelated work.
- Existing project files remain backward compatible; new fields receive defaults.
- User media remains local by default.
- No new dependency without approval and dependency-policy review.
- TDD for behavior changes. Preview/export parity required.
- No main-thread per-pixel effects. GPU passes or workers only.
- Benchmarks run three times on identical fixtures; report median and worst case.
- Security findings distinguish verified controls, unresolved gaps, and untested assumptions.
- User-facing changes update What's New.

---

## Completion Ledger

### Verified complete in commit `052a0d0`

- [x] Image/photo drag to main track stays an image element; no audio UI.
- [x] `B` split tool, frame-aligned click split, split cursor, Escape/select reset.
- [x] Motion and transition titles centered.
- [x] Dense catalog search foundation wired to animations, transitions, effects, text, filters, overlays, templates, plugins, presets, adjustments.
- [x] One transcription model-load gate and duplicate-start guard.
- [x] White Color & Fill compositing order fixed above media.
- [x] Minimal EN/ID localization provider, persistence, Settings selector, catalog strings.
- [x] AI takeover perimeter sweep animation.
- [x] Performance budget constants.
- [x] Baseline tests, Biome, and production build passed at that checkpoint.

### In progress, uncommitted

- [x] Replace transition cartoon/procedural scenes with deterministic local naturally-colored muted architecture photos.
- [x] Record each photo source and Unsplash License; do not call it MIT licensed.
- [x] Clear attached source diagnostics in `properties/index.tsx` and `aurora-overlay.tsx`.
- [x] Add standalone compact Project Details card beside `VerticalAudioMeter` in docked and floating Properties layouts.

### Not started or incomplete

- [ ] Full card consistency audit matching Transform tab language.
- [ ] Graphic Border controls and renderer/export parity.
- [ ] Keyframes for every touched numeric/color effect and graphic-style control.
- [ ] Verified complete blend-mode set with backend fallback.
- [ ] Priority Alight Motion effects implementation and unsupported catalog states.
- [ ] Whole-app performance passes: timeline, renderer, export, bundle, audio, beat, transcription.
- [ ] Full touched-surface localization; expandable locale registry beyond EN/ID.
- [ ] Security/scalability audit and safe remediation.
- [ ] Three-run benchmark report and final manual QA.

---

## Task 1: Stabilize Current In-Progress Changes

**Files:**

- Modify: `apps/web/src/components/editor/panels/assets/views/transitions.tsx`
- Modify: `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts`
- Test: `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.test.ts`
- Create: `apps/web/public/assets/transition-previews/*`
- Create: `apps/web/public/assets/transition-previews/README.md`
- Modify: `apps/web/src/components/editor/panels/properties/index.tsx`
- Modify: `apps/web/src/components/editor/ai-takeover/aurora-overlay.tsx`

- [ ] Verify transition-photo helper returns deterministic distinct local pairs.
- [ ] Verify images are real photos, naturally colored, muted by CSS, not monochrome, cartoon, rainbow, or runtime-random.
- [ ] Verify local assets are compressed WebP, bounded dimensions, lazy browser-decoded, and require no runtime third-party request.
- [ ] Verify manifest contains photographer, source URL, and exact governing license.
- [ ] Run focused test, Biome, TypeScript, diagnostics.
- [ ] Review diff; commit only these stabilized changes.

**Commands:**

```bash
bun test apps/web/src/components/editor/panels/assets/views/components/procedural-preview.test.ts
bunx biome lint apps/web/src --max-diagnostics=1000
bunx tsc -p apps/web/tsconfig.json --noEmit
```

---

## Task 2: Standalone Project Details Card

**Files:**

- Create: `apps/web/src/components/editor/project-details-summary.ts`
- Test: `apps/web/src/components/editor/project-details-summary.test.ts`
- Create: `apps/web/src/components/editor/project-details-card.tsx`
- Modify: `apps/web/src/app/editor/[project_id]/page.tsx`

**Required fields:** project name, resolution, FPS, duration, track count, media count. Empty projects show zero values.

- [ ] Add failing pure summary tests for populated and empty projects.
- [ ] Implement summary using canonical ticks and actual project types.
- [ ] Render compact accessible card beside `VerticalAudioMeter`.
- [ ] Wire both docked and floating Properties layouts.
- [ ] Prevent narrow-panel overflow; project card may collapse details progressively, never become blank.
- [ ] Localize labels through existing i18n.
- [ ] Run focused tests, Biome, TypeScript, manual narrow-width check.

---

## Task 3: Catalog Coverage and Card Consistency

**Files:**

- Audit/modify: `apps/web/src/components/editor/panels/assets/views/*.tsx`
- Modify shared asset-card primitives only where 3+ views share the same intent.

- [ ] Inventory all registry-backed tabs with many entries, including transitions, motion/animations, effects, text, filters, overlays, templates, presets, plugins, adjustments, stickers, sounds, and remaining dense tabs.
- [ ] Add `CatalogSearch` only where absent.
- [ ] Filter case-insensitively by localized label, stable ID, category, and keywords.
- [ ] Preserve category-first then query filtering and original ordering.
- [ ] Use one compact no-results state.
- [ ] Align card radius, borders, focus-visible, spacing, hover duration, and dimensions with Transform tab.
- [ ] No layout-shifting hover, nested decorative cards, custom cursor, or unnecessary animation.
- [ ] Add tests for accent/whitespace normalization and stable ordering.
- [ ] Screenshot-check 375/768/1440-equivalent editor panel widths where tooling permits.

---

## Task 4: Localization Completion

**Files:**

- Modify: `apps/web/src/lib/i18n/*`
- Modify touched editor components and Settings.

- [ ] Define typed locale registry and dictionary fallback to English.
- [ ] Keep EN and Indonesian complete for every surface touched by this plan.
- [ ] Make adding another locale data-only: register metadata plus dictionary, no component changes.
- [ ] Browser-language detection on first run; persist `artidor.locale`.
- [ ] Localize project details, split tool labels, transcription states, catalog titles/search/empty states, graphic controls, effects, blend modes, export/performance-visible errors.
- [ ] Preserve stable effect IDs independent of translated labels.
- [ ] Add interpolation, missing-key, invalid-persisted-locale, and locale-switch tests.
- [ ] Do not promise arbitrary machine-translated languages without actual dictionaries.

---

## Task 5: Graphic Border and Keyframe-Complete Controls

**Files:**

- Modify: `apps/web/src/components/editor/panels/properties/tabs/graphic-tab.tsx`
- Modify: `apps/web/src/components/editor/panels/properties/tabs/graphics-style-tab.tsx`
- Modify timeline graphic-style types/defaults/serialization.
- Modify renderer compositor and export serializer.

- [ ] Audit existing fill, stroke, shadow, border state to avoid duplicate concepts.
- [ ] Add Border enable, color, width, opacity, position, and join only where renderer supports them.
- [ ] Add backward-compatible defaults.
- [ ] Route numeric/color controls through existing keyframe hooks.
- [ ] Use stepped behavior for boolean/discrete modes only.
- [ ] Ensure Color & Fill, border, stroke, shadow, and effect mutable controls share preview/export interpolation semantics.
- [ ] Test default migration, keyframe interpolation, white fill, border placement, and preview/export descriptors.

---

## Task 6: Complete Verified Blend Modes

**Required set:** normal, darken, multiply, color-burn, lighten, screen, plus-lighter, color-dodge, overlay, soft-light, hard-light, difference, exclusion, hue, saturation, color, luminosity; add plus-darker only if every required backend verifies it.

- [ ] Centralize typed blend-mode IDs.
- [ ] Verify Canvas, GPU preview, compositor, serialization, and export mappings.
- [ ] Add explicit `normal` fallback for unknown/unsupported values.
- [ ] Preserve old project values safely.
- [ ] Add table-driven parse/mapping/fallback tests.
- [ ] Add representative pixel/parity tests where renderer harness permits.

---

## Task 7: Alight Motion Effect Catalog Audit

**Output:** `docs/research/alight-motion-effects-web-2026-07-11.md`

- [ ] Normalize the complete user-supplied catalog by group and stable ID.
- [ ] Remove accidental duplicate `Berkedip` entry while recording alias compatibility.
- [ ] Map each name to: existing-working, existing-needs-fix, planned-GPU, alias, unavailable, or rejected-for-cost.
- [ ] Record parameters, defaults, ranges, units, keyframe eligibility, pass count, quality tiers, and fallback.
- [ ] Research official/public documentation and reproducible references; do not copy proprietary shaders/assets.
- [ ] Never display unavailable effects as working.

**Priority working subset:**

- Text: Count Up/Down, Text Spacing, Text Progress, Timecode, Text Randomizer, Change Text.
- Matte/key: Chroma Key, Advanced Chroma Key where primitives permit, Luma Key, Matte Choker, Solid Matte, Wipe, Radial Wipe, Spill Cleaner.
- Opacity: Blink, Block Dissolve, Feather, Fade In/Out, Dissolve.
- Repeat/transform: Repeat, Grid/Linear/Radial Repeat, Offset, Auto/Manual Shake, Rotate, Transform, Raster Transform.
- Blur: Box, Directional, Motion, Gaussian, Lens, Zoom, Sharpen, Unsharp Mask.
- Image/edge: Glow, Inner Glow, Drop Shadow, Edge Glow, Find Edges, Contour, Halftone.
- Color/light: Brightness/Contrast, Color Balance, Replace Color, HSL/RGB Mixer, Tint, Four Color Gradient, Gradient Overlay, Colorize.
- Distortion/procedural: Mirror, Bulge/Pinch, Kaleidoscope, Polar Coordinates, Pixelate, Tile, Swirl, Turbulent Displace, Fractal Noise, Checkerboard, Grid, Starfield, Rain, Snow, Scanlines, VHS Noise.

---

## Task 8: Effects Engine Phase B

**Files:**

- Modify/create: `apps/web/src/lib/effects/definitions/*`
- Modify effect registry/categories/parameter schemas.
- Modify GPU compositor passes and export mapping.

- [ ] Split implementation into small families: color/key, geometry, blur, edge, procedural, text.
- [ ] For each family: failing registry/default test, minimal GPU pass, preview/export parity test, low-quality preview tier.
- [ ] Queue and visibility-gate effect-card previews.
- [ ] Bound multi-pass count and texture sizes on low-end quality.
- [ ] Reuse intermediate textures and shader pipelines.
- [ ] No CPU per-pixel main-thread path.
- [ ] Disable unsupported effects with clear reason and no dead controls.
- [ ] Benchmark representative one-pass and multi-pass stacks three times.

---

## Task 9: Timeline Low-End-PC Performance

- [ ] Add horizontal clip virtualization with overscan and pinned selected/dragged clips.
- [ ] Keep vertical row virtualization active during drag.
- [ ] Move edge auto-scroll to one timeline-root RAF loop.
- [ ] Pass stable clip-specific props; stop full-track prop memo invalidation.
- [ ] Pass `isSelected` per clip; stop selection fan-out subscriptions.
- [ ] Precompute adjacency flags; remove O(n²) neighbor checks.
- [ ] Cache sorted snap points and use binary search.
- [ ] RAF-coalesce volume/opacity patch batches and skip empty patches.
- [ ] Add 64 MiB global filmstrip LRU with retry after rejected decode.
- [ ] Test 1k/10k clip range filtering and drag correctness.
- [ ] Benchmark three runs; report commit p95, drag frame p95, memory worst case.

---

## Task 10: Preview, Renderer, and Export Performance/Correctness

- [ ] Serialize image `mediaId` and safe source metadata for export workers.
- [ ] Add image/video/audio mixed-project export round-trip test.
- [ ] Dynamic-import export stack only when export starts.
- [ ] Consolidate WASM initialization to one deferred owner.
- [ ] Load font atlas chunks only when needed.
- [ ] Replace fixed 500 ms worker stagger with readiness handshake.
- [ ] Release buffers, textures, blob URLs, frame caches in `finally` paths.
- [ ] Keep frame accuracy, audio sync, color, and effects identical across preview/export.
- [ ] Add representative 1080p and low-end quality fixtures.
- [ ] Benchmark preview dropped frames, seek latency, export wall time, peak memory three times.

---

## Task 11: Audio Detection, Beat Analysis, Transcription

- [ ] Replace incorrect beat tick constants with canonical `120_000` ticks/second.
- [ ] Add request IDs, busy/single-flight semantics, cancellation, timeout, and stale-response rejection.
- [ ] Decode through a browser-supported path; transfer PCM to workers.
- [ ] Cache beat results by media identity plus analysis settings.
- [ ] Return clip beats in absolute timeline ticks to typed AI tools.
- [ ] Verify audio presence detection for silent video, muted tracks, mono, stereo, speech, steady music, tempo change, short, and long fixtures.
- [ ] Keep transcription model loading single-flight and one loading card.
- [ ] Cap/confirm very large model downloads, pin model revisions, reuse loaded model.
- [ ] Benchmark model download separately from warm inference.
- [ ] Test all changed worker protocols and cleanup paths.

---

## Task 12: AI Takeover Reliability and Motion

- [ ] Keep perimeter animation transform/opacity-only where possible.
- [ ] Add reduced-motion fallback.
- [ ] Verify revoke cancels active AI execution, not only UI state.
- [ ] Verify co-edit mode pointer behavior and chat stacking.
- [ ] Keep animation isolated/memoized and free from per-frame React state.
- [ ] Add accessible visible status outside `aria-hidden` overlay if current badge is hidden from assistive tech.

---

## Task 13: Security Audit and Safe Remediation

**Output:** `docs/security/web-editor-audit-2026-07-11.md`

- [ ] Review threat model and project security policies.
- [ ] Run dependency audit, Semgrep, Gitleaks, Biome, TypeScript, tests, build.
- [ ] Review XSS, CSRF, SSRF, auth/session, CSP, remote images, uploads, media metadata, parser limits, rate limits, AI tool permissions, prompt injection boundaries, secret exposure, DoS, and resource cleanup.
- [ ] Fix verified safe frontend issues with regression tests.
- [ ] Stop before sensitive auth/API changes only when exact risk requires user approval.
- [ ] Record command, version, date, result, false positives, unresolved findings, severity, and remediation owner.
- [ ] Never claim zero vulnerabilities.

---

## Task 14: Scalability Audit Toward One Million Users

- [ ] Document workload assumptions: active users, concurrent editors, project size, upload/export/transcription rates, storage, regions, latency target.
- [ ] Audit stateless routes, DB indexes/constraints, connection pools, queues, cache, object storage/CDN, rate limits, backpressure, retries, idempotency, observability, and failure isolation.
- [ ] Identify browser-local versus server capacity boundaries.
- [ ] Run bounded safe load tests only against approved local/test endpoints.
- [ ] Report measured saturation points and required infrastructure changes.
- [ ] Never claim guaranteed one-million-user safety from local static analysis.

---

## Task 15: Full Validation and Release Evidence

- [ ] Run all Bun web tests.
- [ ] Run Biome with zero source errors/warnings in scoped web files.
- [ ] Run TypeScript no-emit.
- [ ] Run production web build.
- [ ] Run diagnostics and classify non-web/docs/tooling warnings separately.
- [ ] Run every performance fixture three times; report median and worst case.
- [ ] Manual QA: image drop, no image audio, split tool, centered motion title, transition photos, every catalog search, project card, transcription singleton, white fill, border/keyframes/blends, representative effects, audio/beat, mixed-media export, locale persistence, AI revoke/reduced motion.
- [ ] Update What's New newest-first.
- [ ] Final review against every checkbox in this master plan.

**Commands:**

```bash
bun test apps/web/src
bunx biome lint apps/web/src --max-diagnostics=1000
bunx tsc -p apps/web/tsconfig.json --noEmit
bun run build:web
semgrep scan

gitleaks detect --source .
```

---

## Definition of Done

- Every requested behavior is either verified working or explicitly documented unavailable with reason.
- Preview and export agree for fill, border, blend modes, images, and implemented effects.
- Low-end-PC optimizations have before/after evidence, not adjectives.
- Security and scale reports state evidence and gaps, not absolute guarantees.
- No unresolved scoped diagnostics errors.
- Full web test, lint, typecheck, and build evidence is fresh.

---

## Appendix A: Complete Requested Alight Motion Effect Catalog

Appendix ini normatif. Setiap nama wajib diaudit satu per satu. Nama tidak boleh hilang hanya karena belum diimplementasikan. Status akhir setiap item harus `working`, `needs-fix`, `planned-gpu`, `alias`, `unavailable`, atau `rejected-with-evidence`.

### Teks

- Hitung Naik/Turun
- Jarak Teks
- Kemajuan Teks
- Kode waktu
- Pengacak Teks
- Ubah Teks

### Matte/Mask/Key

- Burning Wipe+
- Chroma Key
- Chroma Key Lanjutan
- Fade Noise
- Luma Key
- Luma Stamper
- Matte Choker
- Matte Solid
- Pembersih Tumpahan Kunci
- Pinggiran Matte
- Skema
- Usap
- Usap Radial
- [X] Luma Stamper+
- [X] Wipe+

### Lainnya

- 2D Tunnel
- 2D Tunnel V2
- 3D Floor Grid
- 3D Extrude Plus
- 3D Extrude Pyramid
- 3D Scape
- About Me
- Audio Visualisation
- Color Grid
- Cubemap 3D
- DNA
- Echoing
- Echo Spinner
- Extruded
- Echo Keyframes
- Electro Graph
- Fake 3D
- Fingerprint
- Firework Particle
- Flame
- Galaxy
- Gradient Displace
- HDR Quality CC
- High Tech Tunnel
- Isi Belakang
- Isolate
- Jelly Cubes
- Kuantisasi Waktu
- Light Particle
- Light Speed
- Lightning Sky
- Linescape
- Magic Extrude
- Manual Shake
- Manual Shake V2
- Meteor
- Money Fall
- Neon Fireworks
- New Starmap
- Noise Reduction
- Object Extrude
- Optic Compensation
- Paper Burn
- Pemisahan Ulang Channel (HSV)
- Pemisahan Ulang Channel (RGB)
- Pemotong Jedah
- Penilaian Latar Belakang
- Pixel Explosion
- Pixel Sortie
- Plasma Wave
- Plasma Random
- Plasma Triangle
- Point Tunnel
- Quality Fixer
- Random Visual #1
- Retro Grid and Sun
- Rocky Terrain
- Solid Latar Belakang
- Shaded Light
- Simple Grid
- Speed Lines 1
- Square Tunnel
- Star Trails
- Sunset
- Synthwave
- VCR Distortion
- VHS Noise
- VR Combined
- Vortex Void
- Voxel Tunnel

### Opacity/Visibility

- Berkedip
- Berkedip
- Block Dissolve
- Bulu
- Fade In/Out
- Larut
- Opasitas Tekanan

Kedua entri `Berkedip` dipertahankan karena sumber meminta katalog 1:1. Audit boleh menetapkan entri kedua sebagai alias/duplikat, tetapi tidak boleh menghapusnya dari matriks pelacakan.

### Ulangi

- Bidang Sebar
- Pengulangan
- Pengulangan Kisi
- Pengulangan Linear
- Pengulangan Radial
- Pengulangan Sebaran
- Ulangi Sepanjang Jalur

### Move/Transform

- Ayun
- Bantuan Skala
- Corner Pin (Beta)
- Gerak Sepanjang Jalur
- Guncang Otomatis
- Kerlipan Acak
- Offset
- Ombang-ambing
- Pemindahan Acak
- Putar
- Regangkan Sumbu
- Transform
- Transformasi Raster
- Ukuran Tekanan

### 3D

- 3D Particles (Beta)
- Balik Layer
- Bintang Polyhedron
- Bulatkan
- Cincin
- Ellipsoid
- Gulung Halaman
- Hati
- Kotak
- Kotak Berongga
- Kubus
- Piramida
- Prisma Bintang
- Prisma Heksagonal
- Prisma Segitiga
- Raster Extrude
- Segi delapan
- Silang Tiga Sumbu
- Silinder
- Terowongan
- Torus

### Procedural

- 3D Grass
- Aurora
- Awan
- Bad Signal
- Bintang-Bintang
- Bintang-Bintang Sederhana
- Bintang
- Blok Warna
- Bercak Pendaran
- Api
- Bubble
- Burung Walet
- Cahaya Silau
- Chromatic Lensflare
- Circular Fall
- Color Multi
- Colorful Lens Flare
- Comet
- Constellations
- Creation Starfield
- Cuaca
- Diffuse Glow
- Dotted Point
- Eclipse
- Feather Fall
- Flashing Alert
- Floating Rings
- Flow Texture
- Fractal Noise
- Fractal Texture
- Garis-garis
- Glow Halos
- Glow Radiant
- Glow Sweep
- Gradient Flow
- Grunge
- Halftone
- Hexagon Grid
- Jajaran Heksagonal
- Jaring
- Lightning Rush
- Matrix Code
- Nickel Texture
- Noise Lensflare
- Papan Catur
- Petir
- Pita
- Pola Simpul
- Rainbow Flame
- Raindrop
- Rintik Hujan
- Ruang Bintang
- Random Numbers
- Random Light Bulbs
- Retro Sun
- Rintik Air
- Set Kekaburan
- Shape Tunnel
- Sinar Energi
- Sinar Radial
- Sky Clouds
- Smoke Noise
- Smoke Particle
- Snow Falling
- Snowflake
- Sparks
- Split Lines
- Starfield Particle V2
- Starburst
- TV Analogue
- TV Scanline + Glitch
- Titik
- Text Displacement
- Turbulent
- VHS Tape
- Wavy Line
- Wrap Texture
- Wings Line
- Wireframe Generator
- ZCC Meteor

### Distorsi/Warp

- Cermin
- Cubit/Tonjolan
- Cubit/Tonjolan dari Dalam
- Glitch Blocks
- Glitch MaskLines
- Glitch Noise
- Glitch Offset
- Glitch Pixel
- Glitch RGB
- Glitch RandomPattern
- Glitch VHS
- Ikal
- Kaca
- Kaca Cermin
- Kaleidoskop
- Koordinat Kutub
- Lengkung Fraktal
- Lengkungan
- Lengkungan Gelombang
- Melting Screen
- Penampil 360°
- Pergeseran Petak Heksagon
- Peta Pemindahan
- Peta Pemindahan Kutub
- Pixelate
- Puddle
- Pusaran
- Putar Ubin Heksagon
- Rainy Screen
- Refraction Warp
- Remas
- Reorientasi Bidang 360°
- Riak Bundar
- Stretch Segment
- Surface Waterwave
- Swirl+
- Turbulent Displace
- Ubin
- Ubin Geser
- Ubin Heksagonal
- Ubin Putar
- VHS Distortion
- Warp Distortion
- Water Reflection

### Blur

- BCC Lensblur
- Box Blur+
- Buram Direksional
- Buram Gerak
- Buram Kotak
- Buram Lensa
- Buram Putar
- Buram Topeng
- Buram Zoom
- Buram dari Dalam
- Chromatic VortexBlur
- Chromatic Zoom Blur
- Frosted Blur
- Gaussian Blur
- Gaussian Blur+
- Hexagon Blur
- Inner Blur+
- Linear Streaks
- Mosaik
- Motion Blur+
- New Sharpen
- Pertajam
- RGB MotionBlur (Beta)
- Sharpen V3
- Spin Streaks
- Streak Strips
- Unsharp Mask
- Vortex Blur
- Warp Blur
- Zoom Streaks

### Gambar & Tepi

- BlackBar Maker+
- Brush Sketch
- Cahaya
- Cahaya dari Dalam
- Deep Glow+
- DeepGlow Enhanced
- Drop Shadow+
- Edge Glow
- Edge Line
- Free Palette Color
- Garis Halftone
- Garis Kontur
- Glow Scan
- Gradien Kontur
- Kasarkan Tepi
- Kemajuan Gambar
- Miring Halus
- Star Glint
- StarsGlint V2
- Stroke Taper
- Temukan Tepi
- Tepi Halus
- Tepi Listrik
- Titik Halftone
- Titik Halftone CMYK
- Warna Stroke
- [X] Smooth Bevel+

### Warna & Cahaya

- 3 Color Gradient+
- Ambang
- Bayangan Panjang
- Bayangan Radial
- Cahaya Lembut
- Cetak
- Chromatic Abberation
- Color Balance
- Dark Glow
- Fast Adjusting+
- Ganti Warna
- Gradien empat warna
- Gradient Shadow+
- Hamparan Gradien
- Kecerahan / Kontras
- LUT Stealer
- Lens Distortion+
- Mixer HSL
- Mixer RGB
- MultiGradient Map+
- Nada Warna
- New ColorTemp
- New Colorize
- New Dithering

---

## Appendix B: Complete Session Requirement Ledger

Appendix ini normatif. Task 1-15 adalah urutan implementasi; checklist berikut menjaga seluruh permintaan sesi tetap 1:1 dan tidak hilang saat konteks dikompresi.

### Editor behavior and UI

- [ ] Efek motion text judul rata tengah.
- [ ] Background transition memakai image yang bervariasi, bukan kartun, bukan warna-warni/rainbow, bukan monokrom.
- [ ] Image transition berasal dari internet dengan izin penggunaan komersial/modifikasi yang jelas, disimpan lokal, sumber dan lisensi dicatat.
- [ ] Tab berisi banyak item, termasuk transition, motion, effect, dan tab sejenis, memiliki search bar.
- [ ] Image/photo dapat masuk main track melalui drag-and-drop.
- [ ] Track foto tetap bertipe image/photo, bukan video track.
- [ ] Foto tidak memiliki audio controls.
- [ ] Semua desain card mengikuti kelancaran dan konsistensi visual tab Transform.
- [ ] Color & Fill putih dengan opacity maksimum benar-benar mengisi/tint video di preview dan export.
- [ ] Graphic tab memiliki fitur Border.
- [ ] Setiap properti mutable seperti Color & Fill memiliki keyframe.
- [ ] Blend mode lengkap sejauh backend preview/export benar-benar mendukung; fallback eksplisit untuk yang tidak didukung.
- [ ] Sistem bahasa memungkinkan user memilih bahasa; localization memiliki fallback dan struktur penambahan locale.
- [ ] `B` mengaktifkan split cepat lewat mouse dan pointer berubah sesuai tool.
- [ ] Card kanan di sebelah audio meter selalu berisi Project Details pada project baru, tidak kosong.
- [ ] Transition/motion/template memakai warna default/netral agar tidak memusingkan.
- [ ] Transcribe this clip dan full timeline hanya menampilkan satu model-loading card.
- [ ] AI takeover memiliki animasi perimeter yang keren, berjalan di pinggir, dapat dibatalkan, tetap ringan.
- [ ] Semua diagnostics scoped web diperbaiki; warning non-web/tooling dipisahkan secara jujur.

### Alight Motion effects

- [ ] Research properti, isi, parameter, default, range, unit, keyframe eligibility, renderer cost, dan fallback seluruh efek Appendix A.
- [ ] Audit efek yang sudah ada di Artidor.
- [ ] Perbaiki efek existing yang salah nama, kategori, controls, preview, renderer, atau export.
- [ ] Tambahkan efek yang belum ada berdasarkan status dan prioritas, tanpa menampilkan efek palsu sebagai working.
- [ ] Jaga performa efek optimal untuk PC kentang memakai GPU/workers, quality tiers, bounded passes, visibility-gated previews, dan cache reuse.

### Performance and correctness

- [ ] Audit seluruh komponen web, bukan hanya beat detection atau preview video.
- [ ] Optimalkan timeline, preview, renderer, effects, search catalogs, export, transcription, audio detection, beat analysis, AI tools, loading, memory, workers, WASM, fonts, and bundle startup.
- [ ] Beat reader/detection tersedia; jika AI belum dapat membaca hasilnya, expose typed read-only result tanpa analyzer kedua.
- [ ] Audio detection diuji dan diperbaiki jika gagal.
- [ ] Preview video diuji dengan fixture nyata.
- [ ] Export diuji untuk video, image, audio, fill, border, blend, dan efek.
- [ ] Transcription diuji untuk cold model load, warm reuse, cancellation, duplicate starts, dan long media.
- [ ] Performa dicek tiga kali memakai fixture sama; laporkan median dan worst case.
- [ ] Target PC kentang menggunakan budget eksplisit, bukan klaim subjektif.
- [ ] Jangan mengorbankan frame accuracy, audio sync, output correctness, transcription quality, atau project safety demi benchmark.
- [ ] Klaim “lebih bagus dari CapCut”, “top 1”, “nomor 1”, atau “maximal terkuat” hanya boleh diganti dengan hasil benchmark terukur; proprietary CapCut internals tidak boleh diklaim telah dikalahkan tanpa data pembanding sah.

### Security and scalability

- [ ] Cek XSS, CSRF, SSRF, auth/session, CSP, secrets, dependency risk, uploads, file/media parsing, metadata validation, rate limits, AI/MCP permissions, prompt injection, DoS/resource exhaustion, cache poisoning, worker isolation, dan data leakage.
- [ ] Jalankan sensor keamanan yang tersedia, termasuk Semgrep dan Gitleaks.
- [ ] Perbaiki celah terverifikasi dengan regression tests.
- [ ] Dokumentasikan false positive dan gap yang belum dapat diuji.
- [ ] Audit scalability menuju 1,000,000 users dengan workload assumptions, DB/indexes, pools, queues, cache, CDN/object storage, backpressure, retries, idempotency, observability, and failure isolation.
- [ ] Jalankan load test bounded hanya pada endpoint local/test yang aman.
- [ ] Jangan mengklaim kebal hacker, tanpa celah, atau aman untuk 1,000,000 users tanpa bukti production-specific.

### Scope and execution

- [ ] Seluruh implementasi produk tetap di `apps/web`.
- [ ] Lanjut sampai seluruh requirement ledger dan Appendix A memiliki status final.
- [ ] Jangan berhenti setelah satu subsistem seperti beat detection.
- [ ] Jangan menghapus perubahan user atau membersihkan dirty worktree secara destruktif.
- [ ] Update What's New.
- [ ] Final response menyebut hasil validasi, benchmark, security findings, remaining risks, dan item unavailable secara eksplisit.
