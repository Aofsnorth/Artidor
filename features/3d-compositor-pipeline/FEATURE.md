# Feature: 3D Compositor Pipeline (AE/Premiere-style 3D)

## Problem

Artidor saat ini hanya compositor **2D quad-based**. `QuadTransformDescriptor`
(`rust/crates/compositor/src/frame.rs`) hanya punya center/width/height/
rotation/flip — tidak ada sumbu Z, tidak ada kamera perspektif, tidak ada
lighting, tidak ada geometri 3D. User tidak bisa:

- menempatkan layer di kedalaman Z (parallax multiplane)
- menganimasikan kamera 3D (dolly/orbit/fly-through)
- menambah lampu dengan shadow
- import model 3D (GLB/GLTF) ke timeline
- output 360°/VR equirectangular

After Effects (Advanced 3D engine) dan Premiere Pro (Immersive/VR) punya
kemampuan ini. Riset lengkap di `RESEARCH.md`.

## Goal

Setelah feature ini, Artidor punya **satu pipeline 3D berbasis WGPU** yang
hidup di `rust/` (single source of truth), diekspos ke:

1. **desktop-web (Tauri)** — via Tauri command baru, reuse `compositor`.
2. **desktop-native (WPF .NET)** — via cdylib Rust + D3DImage shared surface.

Tier fitur (detail di `RESEARCH.md` §3):
- **Tier 1 — Classic 3D** (P1): transform XYZ, kamera one/two-node, lampu
  (Parallel/Spot/Point/Ambient) + shadow, parallax.
- **Tier 2 — Advanced 3D** (P2): GLB/GLTF + skeletal anim, material PBR,
  environment light, shadow catcher, DoF in-engine, depth map, parametric
  mesh.
- **Tier 3 — Immersive/VR** (P2): equirectangular output, VR Plane to
  Sphere, stereoscopic layout, reframe 360.
- **Tier 4 — Tracking** (P2/P3): 3D Camera Tracker.

## Non-Goals

- Tidak meniru tiga engine AE secara terpisah — satu engine saja.
- Tidak menambah engine 3D di sisi WPF (logika 3D hanya di `rust/`).
- Tidak mengganti Tauri sebagai desktop shell utama (ROADMAP). WPF
  desktop-native adalah **app ketiga opsional** untuk Windows native
  premium — bukan pengganti Tauri.
- Tidak mengubah `rust/crates/compositor` 2D path yang sudah berjalan
  (3D = render path baru, 2D path tetap).
- Tidak mengubah auth/payment/security/MCP.
- Tier 4 (Camera Tracker) tidak masuk scope awal — riset-only di plan ini.

## Roadmap Alignment

- [x] P1 Important — "Performance on heavy projects" (native WGPU 3D
      rendering via Tauri/WPF, bukan WASM OffscreenCanvas).
- [x] P2 Nice to Have — "New effects", "Additional transitions".
- [ ] **Not on roadmap, approval required** — desktop-native WPF adalah
      arah baru. ROADMAP.md §"Tech Stack" menyebut desktop shell = Tauri
      2.0. WPF .NET **tidak ada** di roadmap dan masuk kategori
      "Large rewrite / New dependency-heavy features" yang butuh
      approval eksplisit.

> **Approval diperlukan** sebelum memulai Tier 1 WPF. Bagian Tauri + rust/
> 3D sudah align dengan P1 performance dan tidak butuh approval khusus.

## What's New

- [x] Yes

Reason: user-facing besar — kamera 3D, lampu, model 3D, output VR. Wajib
entry `apps/web/src/lib/whats-new/feed.ts` per tier.

## Acceptance Criteria

### Tier 1 — Classic 3D
- [ ] `rust/crates/scene3d` dengan `Transform3D`, `Camera` (one/two-node),
      `Light` (4 tipe) terdefinisi & teruji (unit test math).
- [ ] `compositor::render_scene3d` menghasilkan frame benar untuk scene
      multi-layer 3D + kamera (snapshot test BGRA).
- [ ] Tauri command `render_scene3d` + `upload_texture_3d` bekerja di
      desktop-web (manual QA: parallax terlihat saat kamera dolly).
- [ ] WPF desktop-native menampilkan frame 3D via WriteableBitmap (MVP)
      dan via D3DImage shared surface (target).
- [ ] Layer 2D eksisting masih render identik (regression test).
- [ ] `cargo test` + `cargo check` + `bunx tsc --noEmit` + `bun run lint:web` lulus.

### Tier 2 — Advanced 3D
- [ ] Import GLB/GLTF (mesh + 1 skeletal anim) render benar.
- [ ] Material PBR (base color/roughness/metalness/emissive/normal) shader
      pass snapshot test.
- [ ] Environment light (HDR equirect) menerangi scene + refleksi.
- [ ] Shadow catcher menangkap shadow pada footage.
- [ ] DoF in-engine + depth map extraction output benar.

### Tier 3 — Immersive/VR
- [ ] Output equirectangular 2:1 dari scene 3D benar (no seam).
- [ ] VR Plane to Sphere menempel layer 2D ke sphere.
- [ ] Stereoscopic over/under + SbS output benar.

## Affected Areas

- [x] `apps/web` (UI inspector 3D, viewport gizmo, timeline keyframe 3D)
- [x] `rust` (crate baru `scene3d`, extend `compositor`, bridge `native`)
- [ ] `packages/mcp-server`
- [x] `apps/desktop-web/src-tauri` (command 3D baru)
- [x] `apps/desktop-native` (WPF — folder baru, butuh approval)
- [x] `docs` (dokumentasi 3D, What's New)
- [x] tests (unit math 3D, snapshot render, regression 2D)

## Architecture (singkat)

```
rust/ (single source of truth)
├── crates/scene3d   (NEW) Transform3D, Camera, Light, Mesh, Material, Environment
├── crates/compositor (EXTEND) render_scene3d path + 3D shaders
└── bridges/native    (NEW, cdylib) C ABI untuk WPF

apps/desktop-web/src-tauri  (EXTEND) Tauri commands render_scene3d, upload_mesh
apps/desktop-native         (NEW, WPF .NET) UI shell + D3DImage host + P/Invoke
apps/web                    (EXTEND) inspector 3D, viewport gizmo, Tauri bridge
```

Detail implementasi: `PLAN.md`. Risiko: `RISKS.md`. Riset: `RESEARCH.md`.
