# Plan: 3D Compositor Pipeline

Plan detail bertahap. Setiap phase = perubahan terkecil yang aman, diverifikasi
sebelum lanjut. Prime Directive AGENTS.md: smallest safe change.

> **Urutan dependency**: Phase A (rust math) → B (compositor 3D path) →
> C (Tauri) → D (WPF native) → E (web UI) → F (VR) → G (tracker).
> Phase A & B & C tidak butuh approval (align P1). Phase D butuh approval
> (WPF di luar roadmap). Bisa mulai A–C sambil menunggu approval D.

---

## Files to Read First

- `rust/crates/compositor/src/frame.rs` — struktur descriptor 2D saat ini.
- `rust/crates/compositor/src/compositor.rs` — pipeline render 2D (uniform,
  shader, pipeline layout) yang jadi pola untuk 3D.
- `rust/crates/compositor/src/shaders/layer.wgsl` — shader quad 2D.
- `rust/crates/gpu/src/context.rs` — `GpuContext` (device/queue/surface).
- `apps/desktop-web/src-tauri/src/lib.rs` — pola Tauri command + state.
- `apps/web/src/lib/tauri/compositor-bridge.ts` — pola IPC bridge web.
- `ROADMAP.md` — alignment & approval gate.
- `features/3d-compositor-pipeline/RESEARCH.md` — riset fitur.

---

## Phase A — `rust/crates/scene3d` (math + scene graph, no GPU)

**Tujuan**: semua matematika & tipe scene 3D, murni Rust, teruji unit. Belum
sentuh GPU. Ini fondasi yang dipakai compositor & kedua desktop app.

### A.1 Crate scaffold
1. Buat `rust/crates/scene3d/Cargo.toml` (edition 2024, deps: `serde`,
   `bytemuck`, `thiserror`, `glam` untuk math 3D, `nalgebra` alternatif).
   - **Cek dependency policy**: `glam` dipakai luas di ekosistem wgpu,
     maintained, MIT/Apache. Dokumentasi keputusan di
     `docs/harness/DEPENDENCY_DECISIONS.md`.
2. Tambah ke `Cargo.toml` workspace members.
3. `rust/crates/scene3d/src/lib.rs` — re-export modul.
4. **Verify**: `cargo check -p scene3d`.

### A.2 Transform 3D
5. `src/transform.rs`:
   - `Transform3D { position: [f32;3], rotation_euler: [f32;3] (deg),
     scale: [f32;3], anchor: [f32;3] }` (serde, camelCase).
   - `fn to_matrix(&self) -> [[f32;4];4]` (model matrix, glam).
   - `fn lerp(a, b, t)` untuk keyframe interpolation.
6. Unit test: identity = mat4 identitas; translate+rotate deterministik;
   lerp endpoint benar.

### A.3 Camera
7. `src/camera.rs`:
   - `enum CameraKind { OneNode, TwoNode }`.
   - `struct Camera { kind, position: [f32;3], point_of_interest: [f32;3],
     rotation: [f32;3], focal_length_mm: f32, sensor_size_mm: f32,
     aperture_mm: f32, focus_distance: f32, dof_enabled: bool }`.
   - `fn view_matrix(&self) -> [[f32;4];4]` (look-at untuk two-node;
     rotasi langsung untuk one-node).
   - `fn projection_matrix(&self, aspect: f32, near: f32, far: f32)`.
   - `fn fov_degrees(&self)`.
8. Unit test: two-node look-at menghadap POI; one-node pakai rotation;
   projection perspective benar (titik tengah z=0 → NDC tengah).

### A.4 Light
9. `src/light.rs`:
   - `enum LightKind { Parallel, Spot, Point, Ambient, Environment }`.
   - `struct Light { kind, position, direction, color: [f32;3],
     intensity: f32, cast_shadow: bool, cone_angle_deg: f32,
     penumbra_deg: f32, falloff: f32, environment_texture_id: Option<String> }`.
   - Helper: `fn direction_to_target(from, to)`.
10. Unit test: spot cone clamp; ambient ignore position.

### A.5 Scene descriptor
11. `src/scene.rs`:
    - `struct Scene3DDescriptor { width, height, clear: [f32;4],
      camera: Camera, lights: Vec<Light>, items: Vec<SceneItem3D> }`.
    - `enum SceneItem3D { Layer3D(Layer3DDescriptor), Mesh(MeshInstance),
      Parametric(ParametricMesh) }`.
    - `struct Layer3DDescriptor { texture_id, transform: Transform3D,
      opacity, blend_mode, accepts_lights: bool, cast_shadow: bool,
      receives_shadow: bool, mask: Option<LayerMaskDescriptor> }`.
    - `struct MeshInstance { mesh_id, transform, material_id,
      animation: Option<AnimationClipRef> }`.
    - `enum ParametricMesh { Cube, Sphere, Plane, Torus, Cone, Cylinder }`
      + subdivisi params.
12. **Verify**: `cargo test -p scene3d` (semua unit test lulus) +
    `cargo check`.

### A.6 Mesh & material (data only, parse di Phase B)
13. `src/mesh.rs` — `struct MeshData { positions: Vec<[f32;3]>,
    normals: Vec<[f32;3]>, uvs: Vec<[f32;2]>, indices: Vec<u32>,
    joints: Vec<[u16;4]>, weights: Vec<[f32;4]> }` (skinning opsional).
14. `src/material.rs` — `struct PbrMaterial { base_color: [f32;4],
    roughness, metalness, emissive: [f32;3], emissive_intensity,
    normal_texture_id, base_color_texture_id }`.
15. **Verify**: `cargo test -p scene3d` + `cargo check`.

---

## Phase B — Extend `compositor` dengan 3D render path (WGPU)

**Tujuan**: `compositor::render_scene3d` render scene 3D ke texture via WGPU.
2D path lama tidak tersentuh.

### B.1 Shader 3D layer
16. `rust/crates/compositor/src/shaders/layer3d.wgsl`:
    - vertex: model→view→projection, kirim world_pos & uv ke fragment.
    - fragment: sample texture, terapkan lighting (loop lights di uniform
      array), opacity, blend_mode.
17. `shaders/light.wgsl` — fungsi lighting: Blinn-Phong + PBR term dasar
    (diffuse + specular + ambient). Environment = sample equirect cubemap-
    from-2d.
18. Uniform struct `repr(C)`: `CameraUniform { view: [[f32;4];4], proj,
    camera_pos, focus_distance, aperture, dof_enabled }`,
    `LightUniform { kind, position, direction, color, intensity, cone,
    penumbra, cast_shadow }` (array max 16 light),
    `Layer3DUniform { model, opacity, accepts_lights, blend_mode }`.

### B.2 Pipeline 3D
19. Di `compositor.rs` tambah field: `scene3d_pipeline`,
    `scene3d_layout`, `light_bind_group_layout`.
20. `pub fn render_scene3d(&mut self, ctx: &GpuContext, scene:
    &Scene3DDescriptor) -> Result<Vec<u8>, CompositorError>`:
    - upload mesh/texture (reuse `TextureStore`).
    - build uniform buffer camera + lights.
    - render pass: depth buffer wajib (baru — 2D path tidak pakai depth).
    - sortir item: opaque depan→belakang, transparent belakang→depan.
    - output BGRA bytes (sama seperti `render_frame_to_bytes`).
21. Depth texture: `wgpu::TextureFormat::Depth32Float`, format render
    target `Bgra8Unorm` (sama dengan 2D path).

### B.3 Shadow map (Tier 1 minimal: hard shadow)
22. `shaders/shadow.wgsl` — render depth dari POV light ke shadow map
    texture (2048² default, configurable).
23. `render_shadow_pass` sebelum main pass; sample shadow map di
    `layer3d.wgsl` untuk `cast_shadow` light.
24. Shadow catcher: layer khusus yang hanya render shadow (alpha = shadow
    intensity), komposit ke footage.

### B.4 DoF + depth map (Tier 2)
25. Post-pass `shaders/dof.wgsl`: blur berdasar depth buffer +
    focus_distance/aperture (CoC). Output ke final.
26. Mode output `depth`: alih-alih BGRA, return depth buffer sebagai
    R32Float → untuk precomp DoF/fog eksternal.
27. **Verify**: snapshot test scene 2-layer + kamera dolly (frame A vs B
    berbeda, parallax terbukti); regression test 2D path lama identik;
    `cargo test -p compositor` + `cargo check`.

### B.5 GLB/GLTF import (Tier 2)
28. `scene3d::mesh::load_gltf(bytes) -> Result<MeshData, _>` pakai crate
    `gltf` (dependency decision dicatat).
29. Skeletal: decode `skins` + `animations` → `AnimationClipRef` +
    `fn sample_pose(clip, time) -> [[f32;4];4]` per joint.
30. Tauri/WPF upload mesh bytes → `upload_mesh` command → `TextureStore`
    ekstensi `MeshStore`.
31. **Verify**: load sample GLB (Khronos sample), render benar, animasi
    playback time-based benar.

---

## Phase C — desktop-web (Tauri) commands 3D

**Tujuan**: web frontend bisa render 3D via native compositor di Tauri.

### C.1 Tauri commands
32. `apps/desktop-web/src-tauri/src/lib.rs` tambah:
    - `render_scene3d(scene: Scene3DDescriptor, state) -> Vec<u8>` (BGRA).
    - `upload_mesh(id: String, bytes: Vec<u8>) -> ()` (parse GLB, simpan
      ke MeshStore).
    - `upload_texture_3d(id, bytes, w, h)` (reuse pola upload eksisting).
    - `render_scene3d_depth(scene) -> Vec<f32>` (depth map output).
33. Daftarkan di `tauri::generate_handler!`.
34. **Verify**: `cargo check` di `apps/desktop-web/src-tauri`.

### C.2 Web IPC bridge
35. `apps/web/src/lib/tauri/compositor-bridge.ts` tambah:
    - `renderScene3D(scene: Scene3DDescriptor): Promise<Uint8Array>`.
    - `uploadMesh(id, bytes)`, `uploadTexture3D(...)`.
    - Mirror interface `wasm-compositor.ts` agar renderer switch transparan.
36. `apps/web/src/lib/tauri/detect.ts` — sudah ada, tidak berubah.
37. **Verify**: `bunx tsc --noEmit` + `bun run lint:web`.

### C.3 Renderer switch
38. Di renderer viewport: deteksi Tauri → pakai `renderScene3D` native;
    else fallback WASM 2D (3D tidak didukung di WASM untuk MVP — flag
    `is3DSupported()`).
39. **Verify**: manual QA desktop-web — parallax terlihat saat kamera dolly.

---

## Phase D — desktop-native WPF .NET (BUTUH APPROVAL)

> **Gate**: Phase ini butuh approval eksplisit karena WPF di luar ROADMAP.
> Lihat `RISKS.md` §roadmap. Jangan mulai sebelum approval.

### D.1 Rust cdylib bridge
40. Buat `rust/bridges/native/` (crate `crate-type = ["cdylib"]`).
41. C ABI header `native.h`:
    - `void* artidor_compositor_new(uint32_t w, uint32_t h);`
    - `int artidor_render_scene3d(void* ctx, const uint8_t* scene_json,
      size_t len, uint8_t* out_bgra, size_t out_len);`
    - `int artidor_upload_mesh(void* ctx, const char* id,
      const uint8_t* bytes, size_t len);`
    - `void* artidor_shared_dx12_handle(void* ctx, uint64_t* out_handle);`
      (untuk D3DImage shared surface, Phase D.3).
    - `void artidor_compositor_free(void* ctx);`
42. Internal: wrap `GpuContext` + `Compositor`, simpan state di `Box`.
43. **Verify**: `cargo build -p native --release` menghasilkan `native.dll`
    + `cargo test` FFI round-trip (JSON scene → bytes).

### D.2 WPF app scaffold
44. `apps/desktop-native/` — solution .NET 8 WPF (`dotnet new wpf`).
    - `App.xaml`, `MainWindow.xaml`, `EditorViewport` (custom
      `FrameworkElement` host).
    - Project structure mirror `apps/web` panel layout (timeline, assets,
      inspector) — UI shell saja, logic via Rust.
45. P/Invoke wrapper `NativeInterop.cs` — `[DllImport("native.dll")]`
    sesuai header. Safe handle untuk ctx.
46. **Verify**: `dotnet build` + hello-world render (clear color) tampil.

### D.3 Render host — MVP WriteableBitmap
47. `EditorViewport.OnRender`: panggil `artidor_render_scene3d` → BGRA →
    `WriteableBitmap` → `Image` di canvas.
48. Composition timer (`DispatcherTimer` 60fps) atau `Rendering`
    event untuk drive frame.
49. **Verify**: render scene 3D Tier 1 tampil di WPF, parallax terlihat.

### D.4 Render host — D3DImage shared surface (target performa)
50. Tambah dep **Vortice.Windows** (DirectX11/12). Catat di
    `DEPENDENCY_DECISIONS.md` (Vortice = penerus SharpDX, maintained,
    MIT). Cek `docs/harness/DEPENDENCY_POLICY.md`.
51. WGPU render ke DX12 texture `SHARED` →
    `artidor_shared_dx12_handle` return NT shared handle.
52. Sisi C#: `D3D11Device.OpenSharedResource` → DX11 texture →
    bridge DX11→DX9Ex via DXGI surface sharing (`D3D11_SHARED_WITHOUT_MUTEX`)
    → `D3DImage.SetBackBuffer`.
53. Sync: surface queue / fence manual (SharpDX#599 caveat — lihat
    `RESEARCH.md` §4.1). Lock per-frame.
54. **Verify**: 1080p 60fps tanpa tearing; 4K ≥30fps; bandingkan CPU vs
    shared surface (harus zero-copy GPU).

### D.5 UI parity minimal
55. Timeline, assets panel, inspector 3D (transform XYZ, camera, light)
    — port dari `apps/web` panel sebagai WPF UserControl. Logic tetap
    panggil Rust via JSON scene.
56. **Verify**: manual QA parity flow (import media → timeline → render).

---

## Phase E — Web UI 3D (inspector, viewport gizmo, timeline)

**Tujuan**: user bisa mengatur scene 3D dari UI web (berlaku juga Tauri).

### E.1 Inspector 3D
57. `apps/web/src/components/inspector/` tambah panel:
    - Transform3D (X/Y/Z position, rotation, scale, anchor).
    - Camera props (kind, focal, aperture, DoF, focus distance).
    - Light props (kind, color, intensity, cast shadow, cone).
58. Baca komponen eksisting dulu sebelum tambah class (AGENTS.md React rule).

### E.2 Viewport gizmo
59. Gizmo 3D (move/rotate/scale) di viewport — overlay canvas, proyeksikan
    world→screen pakai camera matrix dari `scene3d`.
60. Orbit/pan/zoom camera (Unified Camera Tool analog).

### E.3 Timeline keyframe 3D
61. Keyframe per-properti 3D (position X/Y/Z, rotation, dst.) — extend
    timeline eksisting, jangan rewrite.
62. **Verify**: `bunx tsc --noEmit` + `bun run lint:web` + E2E core flow.

---

## Phase F — Immersive / VR (Tier 3)

63. `scene3d::projection::equirectangular` — render 6 face → equirect
    stitch (atau single-pass sphere projection shader).
64. `shaders/plane_to_sphere.wgsl` — tempel layer 2D ke sphere.
65. Stereoscopic: render dua kamera (left/right IPD) → over/under atau SbS.
66. Output mode `Scene3DOutputMode { Perspective, Equirectangular,
    StereoscopicOverUnder, StereoscopicSideBySide }`.
67. **Verify**: equirect 2:1 no seam (sample di uv boundary); stereoscopic
    eye offset benar.

---

## Phase G — 3D Camera Tracker (Tier 4, riset-only di plan ini)

> Scope awal: riset. Implementasi setelah Tier 1–3 stabil.

68. `rust/crates/tracker` — feature match (ORB/SIFT via `opencv` crate
    atau pure-rust `cv-pinhole`), solve camera pose (PnP + bundle adj).
69. Output: `Camera` keyframes + `Vec<TrackPoint3D>` → buat shadow
    catcher / null 3D.
70. **Verify**: sample footage → camera path mendekati ground truth.

---

## Files Expected to Change

**Baru**:
- `rust/crates/scene3d/**` (Phase A)
- `rust/bridges/native/**` (Phase D, cdylib)
- `apps/desktop-native/**` (Phase D, WPF)
- `rust/crates/compositor/src/shaders/{layer3d,light,shadow,dof,plane_to_sphere}.wgsl`
- `features/3d-compositor-pipeline/**` (dokumen ini)

**Extend**:
- `Cargo.toml` (workspace members: scene3d, bridges/native)
- `rust/crates/compositor/src/{compositor.rs, frame.rs, lib.rs}` (3D path)
- `apps/desktop-web/src-tauri/src/lib.rs` (commands 3D)
- `apps/web/src/lib/tauri/compositor-bridge.ts` (IPC 3D)
- `apps/web/src/components/inspector/**` (panel 3D)
- `apps/web/src/lib/whats-new/feed.ts` (entry per tier)
- `ROADMAP.md` (tambah inisiatif 3D + WPF setelah approval)
- `AGENTS.md` (arsitektur: tambah desktop-native + scene3d)
- `docs/harness/DEPENDENCY_DECISIONS.md` (glam, gltf, Vortice)

**Tidak tersentuh**: 2D render path compositor, auth/payment/security/MCP,
`.env*`, CI workflow (kecuali tambah job build WPF setelah approval).

---

## Test Plan

- **Unit** (Phase A): math transform/camera/light deterministik; lerp;
  projection NDC; cone clamp.
- **Unit** (Phase B): `render_scene3d` snapshot BGRA scene referensi;
  depth map output; shadow map resolusi.
- **Regression**: 2D `render_frame_to_bytes` identik pre/post change
  (golden frame).
- **Integration** (Phase C): Tauri command round-trip JSON scene → bytes;
  mesh upload + render.
- **Integration** (Phase D): FFI cdylib round-trip; D3DImage shared
  surface 60fps 1080p benchmark.
- **E2E** (Phase E): Playwright core flow + 3D inspector edit → render.
- **Manual QA**: parallax dolly, orbit two-node, shadow on catcher,
  GLB anim playback, equirect no-seam, stereoscopic eye offset.
- **Perf**: 4K 3D scene ≥30fps native (Tauri/WPF), ≥15fps WASM fallback
  (jika diaktifkan).

## Rollback Plan

- Phase A–C: crate `scene3d` & command 3D independen — feature flag
  `enable_3d` di renderer. Rollback = flag off, 2D path tetap jalan.
- Phase D (WPF): folder `apps/desktop-native` & `rust/bridges/native`
  terisolasi — hapus dari workspace members + `git revert` commit
  scaffold. Tidak mengganggu Tauri/web.
- Shader 3D: file `.wgsl` baru, tidak mengubah shader 2D.
- Dependency (`glam`, `gltf`, `Vortice`): catat di
  `DEPENDENCY_DECISIONS.md` dengan rollback note; bisa di-uninstall
  tanpa efek ke 2D path.
- Migration: project file lama (2D-only) tetap load — `Scene3DDescriptor`
  opsional; jika tidak ada kamera, fallback ke 2D compositor path.

## Phases summary (smallest safe changes)

| Phase | Scope | Approval | Verify gate |
|---|---|---|---|
| A | rust scene3d math | tidak perlu | `cargo test -p scene3d` |
| B | compositor 3D render path | tidak perlu | snapshot + regression |
| C | Tauri commands 3D | tidak perlu | `cargo check` + `tsc` |
| D | WPF native + cdylib | **WAJIB** | `dotnet build` + 60fps QA |
| E | Web UI 3D | tidak perlu | `tsc` + lint + E2E |
| F | Immersive/VR | tidak perlu | no-seam test |
| G | Camera tracker | riset-only | — |
