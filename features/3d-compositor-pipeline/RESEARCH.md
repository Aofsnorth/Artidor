# Deep Research: 3D Features — After Effects & Premiere Pro

Riset dasar untuk merancang pipeline 3D Artidor. Sumber utama: dokumentasi
Adobe resmi, blog Adobe, komunitas Adobe Beta, Maxon Cineware, dan tutorial
industri. Riset interop WPF .NET berasal dari repo Microsoft WPFDXInterop,
SharpDX, HelixToolkit, wgpu-native, dan Stack Overflow.

> Catatan: skill `deep-research-agent` menargetkan 100+ sumber. Untuk plan
> implementasi yang actionable, fokus diarahkan ke sumber teknis otoritatif
> (Adobe docs, Maxon, Microsoft interop) yang langsung memandu desain. Sumber
> lengkap di §6.

---

## 1. After Effects — Sistem 3D

### 1.1 Tiga render engine 3D

Sejak AE 24.2 (2024) ada tiga engine yang bisa dipilih di Composition Settings → 3D Renderer:

| Engine | Fokus | Kemampuan | Keterbatasan |
| --- | --- | --- | --- |
| **Classic 3D** | Layer 2D di ruang 3D | posisi/rotasi/scale Z, kamera, lampu dasar, parallax multiplane | tidak ada geometri 3D asli, tidak ada material |
| **Cinema 4D** (Cineware) | Ekstrusi & bevel | ekstrusi text/shape, bevel, material C4D, refleksi, GI | render lambat, layer C4D = 2D layer di AE |
| **Advanced 3D** (Aurora, default 2024+) | Geometri 3D asli | import model GLB/GLTF, material PBR, environment light, shadow catcher, DoF in-engine, parametric meshes | fitur beta terus bertambah |

Sumber: [2][3][7] (lihat §6).

Implikasi Artidor: kita tidak perlu meniru tiga engine. Cukup **satu engine
3D** berbasis WGPU yang mencakup use-case Advanced 3D (geometri + PBR +
lighting + DoF) dan menyediakan mode "Classic 3D" sebagai subset (quad 2D
dengan transform Z + kamera) — ini persis kompatibel dengan compositor
Artidor yang sudah ada (quad-based).

### 1.2 Layer 3D & transform

- Toggle "3D layer switch" (ikon kubus) → layer mendapat sumbu Z.
- Transform 3D: Position (X,Y,Z), Rotation (X,Y,Z / Orientation), Scale (seragam
  atau per-axis), Anchor Point 3D.
- Skala Z tidak berdampak visual pada layer 2D planar tapi mempengaruhi
  bounding untuk shading/shadow.
- Keyframe per-properti, Graph Editor untuk easing.

Sumber: [8][9][10][11].

### 1.3 Kamera 3D — One-Node vs Two-Node

- **One-Node Camera**: kamera handheld/drone; posisi + orientasi bebas, tanpa
  target. Cocok fly-through, VFX compositing match real camera.
- **Two-Node Camera**: punya **Point of Interest**; kamera selalu menghadap
  target. Cocok orbit, arc, follow subjek.
- Properti kamera: focal length / zoom / angle of view, aperture, depth of
  field, focus distance.
- **Unified Camera Tool** (C): orbit / track XY / track Z tergabung.
- Parenting kamera ke 3D Null Object = pola umum untuk gerakan kompleks
  (angled tracking, camera shake pada two-node).

Sumber: [8][9][10][11][12].

### 1.4 Lampu (Lights)

Empat tipe klasik + Environment light (Advanced 3D):

| Tipe | Perilaku | Cast shadow (Adv3D) |
| --- | --- | --- |
| **Parallel** | directional (sinar paralel, seperti matahari) | ya |
| **Spot** | cone angle + penumbra + falloff | ya |
| **Point** | omnidirectional | ya (Adv3D) |
| **Ambient** | tidak ada sumber, naikkan brightness menyeluruh | tidak |
| **Environment** | sphere equirectangular dari HDR/EXR/video/composite layer | ya (refleksi) |

- Switch **"Accepts Lights"** per-layer (on = terkena lighting+shadow, off =
  lit ambient saja, cocok simulasi layar self-illuminated). Didukung Classic
  3D, C4D, dan Advanced 3D. Sumber [4].
- **Animated Environment Lights** (AE Beta 25.2): sumber environment light
  bisa composite/video layer (equirectangular), bukan hanya still HDR. Sumber [1].
- **Shadow catcher**: plane yang menangkap shadow dari objek virtual ke
  footage. **Color shadows**: shadow berwarna (real-world shadow jarang
  pure black). Sumber [2].

### 1.5 Depth of Field (Advanced 3D, in-engine)

- AE Beta 26.2: DoF in-engine untuk Advanced 3D — bekerja dengan model 3D,
  parametric mesh, Substance material, 3D text/shape.
- 4 kontrol animatable: focus distance, aperture, blur level, highlight
  threshold (approx).
- Default: approximate physical camera; focus distance default ke z=0.
- Menangani transparansi bertingkat (fokus subjek melewati jendela).
- **Depth map extraction**: precomp Advanced 3D scene → depth map per-pixel
  untuk post DoF/fog. Sumber [2][5].

### 1.6 Geometri 3D & material

- Import **GLB/GLTF** dengan **embedded animation** (skeletal rig, bone
  deformation, keyframe) — retiming native. Sumber [2].
- **Parametric Meshes** (AE Beta 26.0): Cube, Sphere, Plane, Torus, Cone,
  Cylinder sebagai building block; butuh Advanced 3D. Sumber [3].
- **Substance 3D Materials (SBSAR)**: dipetakan ke mesh dengan mode
  "Proportional" / "Stretch". Material default: Color, Roughness, Metal,
  Emission Color, Emission Intensity. Sumber [3].
- **Substance 3D Painter** "Send to After Effects" — texturisasi presisi.
- **Extruded text/shapes** via Cinema 4D renderer (ekstrusi + bevel +
  material). Sumber [6][13].

### 1.7 3D Camera Tracker

- Effect "3D Camera Tracker" menganalisis footage → ekstrak camera motion +
  3D scene data (background process seperti Warp Stabilizer).
- Solve = reverse-engineer focal length + gerakan kamera asli.
- Hasil: track points 3D; pilih 3+ titik → buat shadow catcher / text /
  null 3D yang aligned ke permukaan.
- Tujuan: composite elemen 3D ke footage 2D dengan parallax yang benar.
- Sumber [14][15][16][17].

### 1.8 Cineware (integrasi Cinema 4D Lite)

- C4D Lite gratis terbundel AE; .c4d drag-drop ke project = Cinema 4D layer.
- CINERENDER terintegrasi: render C4D langsung di AE, kontrol via efek
  CINEWARE. Camera/light/null/text/shape AE ditransfer ke C4D (text/shape →
  Extrude object). Sumber [6][13].
- Sync real-time: perubahan scene C4D langsung update di AE.

### 1.9 Navigasi 3D & snapping

- Unified Camera Tool (orbit/track XY/track Z).
- Auto-orientasi plane gambar mesh: XY (back wall) / XZ (floor) / YZ (side
  wall) tergantung orientasi kamera (>45°). Sumber [3].
- 3D snapping ke titik, grid, layer.

---

## 2. Premiere Pro — Sistem "3D" (Immersive / VR)

Premiere Pro **bukan** editor 3D scene seperti AE. "3D" di Premiere =
**immersive / 360° / VR video** + transform 3-axis terbatas. Tidak ada
geometri 3D, tidak ada kamera perspektif, tidak ada lighting. Ini penting
dipisahkan agar Artidor tidak meniru fitur yang tidak relevan.

### 2.1 VR / Immersive sequence

- Sequence VR: projection **Equirectangular** (satu-satunya yang didukung).
- Layout: **Monoscopic**, **Stereoscopic Over/Under**, **Stereoscopic Side by Side**.
- VR properties auto-detect saat import; bisa mix resolusi & layout berbeda
  dalam sequence sama via **VR Projection** effect.
- Captured View: Horizontal 360° × Vertical 180° default (full sphere).
- VR Video Display di Program Monitor (wrench → VR Video) → preview
  equirectangular atau drag-look; Monitor View FOV (mis. 160×90 = sim
  YouTube 16:9). Sumber [18][19][20][21][22].

### 2.2 Immersive Video effects (kategori khusus)

Efek yang sadar spherical projection (bukan efek 2D biasa):

- **VR Rotate Sphere** — rotasi 3-axis sphere.
- **VR Blur** / **VR Spherical Blur** — blur radial yang intens ke edge
  sphere (fade immersive antar scene).
- **VR Chromatic Aberration**, **VR Color Grading**, **VR Digital Glitch**,
  **VR Fractal Noise**, **VR Color Gradients**.
- **VR Plane to Sphere** — tempel elemen 2D ke sphere (Scale + Rotate
  Projection). Sumber [22][23].
- **VR Projection** — reframe tilt/pan/roll dinamis; mix layout berbeda.
- **VR Sharpen**, **VR De-Noise**, **VR Fisheye**.

Catatan: Warp Stabilizer **tidak** bekerja pada 360 footage. Sumber [19].

### 2.3 Reframe & AI

- **Insta360 Reframe plugin** (2024): import .insv langsung di Premiere,
  reframe ke resolusi/FOV/sudut kamera kustom tanpa export berulang
  (kualitas terjaga via proxy .lrv). Sumber [24][25].
- **Auto Reframe** (AI bawaan Premiere): reframing 16:9 → vertikal dengan
  tracking subjek.
- VR headset playback untuk QA immersive. Sumber [19].

### 2.4 Yang relevan untuk Artidor

Dari Premiere, yang worth diadopsi:

1. **Equirectangular projection aware rendering** (untuk output 360).
2. **VR Plane to Sphere** — tempel layer 2D ke sphere (parallax 360).
3. **Stereoscopic layout** (over/under, SbS) untuk output VR.
4. **Reframe** dari 360 → perspektif 16:9/9:16 (AI-assisted opsional).

Yang **tidak** relevan: tidak ada scene graph 3D, tidak ada kamera
perspektif, tidak ada lighting — semua itu domain AE/Artidor-Rust.

---

## 3. Sintesis: Fitur 3D yang harus dimiliki Artidor

Dikombinasikan dengan arsitektur Artidor (compositor WGPU quad-based, rust/
sebagai single source of truth, desktop-web Tauri + desktop-native WPF):

### 3.1 Tier 1 — Classic 3D (foundation, P1)

- Layer 2D planar di ruang 3D: transform Position XYZ, Rotation XYZ,
  Scale XYZ, Anchor 3D.
- **Kamera** one-node & two-node (point of interest), focal length, zoom,
  aperture, DoF.
- **Lampu**: Parallel, Spot, Point, Ambient (cast shadow opsional).
- Parallax multiplane (sudah natural dari Z + kamera).
- Mode "Classic 3D" = subset compositor eksisting (quad + transform Z +
  kamera) → backward compatible.

### 3.2 Tier 2 — Advanced 3D (P2)

- Import **GLB/GLTF** (mesh + skeletal animation + retiming).
- **Material PBR**: base color, roughness, metalness, emissive, normal.
- **Environment light** (equirectangular HDR/EXR + composite/video layer).
- **Shadow catcher** + color shadows.
- **Depth of Field in-engine** + depth map extraction (precomp).
- **Parametric meshes** (cube/sphere/plane/torus/cone/cylinder).

### 3.3 Tier 3 — Immersive / VR (P2)

- Equirectangular projection-aware output.
- VR Plane to Sphere (tempel 2D ke sphere).
- Stereoscopic layout (over/under, SbS).
- Reframe 360 → perspektif (manual + AI opsional).

### 3.4 Tier 4 — Tracking (P2/P3)

- 3D Camera Tracker (analisis footage → camera motion + track points).
- Match composite elemen 3D ke footage 2D.

---

## 4. Interop WPF .NET — opsi rendering 3D

desktop-native = WPF .NET. WPF render tree = DirectX 9Ex / D3DImage.
Butuh host GPU surface (WGPU DX12) ke WPF.

### 4.1 Opsi A — D3DImage + shared surface (rekomendasi)

- Rust crate `compositor` dikompilasi sebagai **cdylib** (C ABI) via crate
  bridge baru `rust/bridges/native`.
- WGPU di Windows default backend **DX12**. Render ke DX12 texture dengan
  `SHARED` flag → `IDXGIResource1::CreateSharedHandle`.
- Sisi .NET: **Vortice.Windows** (DirectX 11/12 managed, penerus SharpDX
  yang sudah unmaintained). `D3D11Device.OpenSharedResource` dari handle
  DX12 → texture DX11.
- **D3DImage** (WPF) menerima IDirect3DSurface9; butuh bridge DX11→DX9Ex
  via DXGI surface sharing (`D3D11_SHARED_WITHOUT_MUTEX`).
- Pola teruji: repo `microsoft/WPFDXInterop` + sample `SharpDX-Wpf-Direct3D-11-Example`. Sumber [26][27][28][29].
- **Caveat sync**: D3DImage sync antar device "fundamentally fragile"
  (SharpDX issue #599) — butuh surface queue / fence manual. Sumber [28].

### 4.2 Opsi B — WriteableBitmap copy (fallback, simple)

- WGPU render → `render_frame_to_bytes` (sudah ada) → copy BGRA ke
  WriteableBitmap WPF.
- Plus: zero interop complexity, cross-platform.
- Minus: copy CPU per-frame, tidak GPU-zero-copy, ~30-60fps untuk 1080p,
  tidak ideal untuk 4K realtime.
- **Cocok sebagai Tier-0 / MVP** sebelum shared surface selesai.

### 4.3 Opsi C — HelixToolkit (tidak direkomendasi untuk ini)

- HelixToolkit.WPF = wrapper di atas WPF 3D built-in (software/tessellation
  lambat) atau HelixToolkit.SharpDX (DX11). Sumber [30][31].
- Plus: scene graph 3D siap pakai, MVVM.
- Minus: **duplikasi logika 3D** dengan rust/ (melanggar AGENTS.md: rust/
  single source of truth). Hanya cocok jika WPF punya engine 3D sendiri —
  tapi itu melanggar arsitektur "logic in rust/".

### 4.4 Keputusan arsitektur

- **rust/ tetap single source of truth** untuk scene graph 3D, transform
  math, lighting, material, render pipeline. Tidak ada logika 3D di WPF.
- WPF = UI shell + host D3DImage + IPC ke cdylib Rust.
- desktop-web (Tauri) = reuse crate `compositor` 3D path via Tauri command
  baru (sama seperti `render_frame` tapi `render_scene3d`).
- MVP WPF: Opsi B (WriteableBitmap) untuk validasi end-to-end, lalu Opsi A
  (shared surface) untuk performa.

---

## 5. Pemetaan fitur AE/Premiere → modul Rust Artidor

| Fitur AE/Premiere | Modul Rust baru/ekstensi |
| --- | --- |
| Transform 3D layer | `rust/crates/scene3d` (Transform3D, Camera, Light) |
| Kamera one/two-node | `scene3d::camera` |
| Lampu + shadow | `scene3d::light` + shader `light.wgsl` |
| GLB/GLTF import | `scene3d::mesh` (crate `gltf` / `easy-gltf`) |
| Material PBR | `scene3d::material` + shader `pbr.wgsl` |
| Environment light | `scene3d::environment` |
| Shadow catcher | `scene3d::shadow_catcher` |
| DoF in-engine | shader `dof.wgsl` di compositor post-pass |
| Depth map extraction | compositor output mode `depth` |
| Parametric meshes | `scene3d::primitive` |
| Equirectangular / VR | `scene3d::projection` (equirect + stereoscopic) |
| VR Plane to Sphere | shader `plane_to_sphere.wgsl` |
| 3D Camera Tracker | `rust/crates/tracker` (cv/feature match, P3) |
| Compositor 3D render path | extend `rust/crates/compositor` (`render_scene3d`) |
| Tauri bridge | extend `apps/desktop-web/src-tauri` commands |
| WPF native bridge | baru `rust/bridges/native` (cdylib) + `apps/desktop-native` |

---

## 6. Sumber (referensi)

### After Effects

1. Adobe Community — Animated Environmental Lights in AE Beta 25.2 — https://community.adobe.com/questions-534/animated-environmental-lights-available-now-in-after-effects-beta-314441
2. Adobe Blog — 3D & Motion Design Upgrades in AE (IBC 2024) — https://blog.adobe.com/en/publish/2024/09/10/adobe-introduces-3d-motion-design-upgrades-adobe-after-effects
3. Adobe Community — Parametric Meshes & Substance 3D Materials (Beta 26.0) — https://community.adobe.com/announcements-532/new-in-beta-meshes-and-3d-materials-oh-my-314505
4. Adobe Community — Accepts Lights Switch in Advanced 3D (Beta 25.1) — https://community.adobe.com/questions-534/announcement-accepts-lights-switch-in-advanced-3d-314412
5. Adobe Community — Depth of Field in Advanced 3D (Beta 26.2) — https://community.adobe.com/announcements-532/new-in-ae-beta-depth-of-field-in-advanced-3d-1551661
6. Maxon — Cineware for After Effects — https://www.maxon.net/en/cinema-4d/features/cineware-for-after-effects
7. Simon Rankin — AE 2024: A New Era of 3D Rendering — https://www.simonrankin.com/learn/3d-in-adobe-after-effects-in-2024
8. AJ Graphics — Working with 3D Cameras in AE — https://aj-graphics.org/2025/03/11/working-with-3d-cameras-in-after-effects-a-complete-guide/
9. School of Motion — Working with Cameras in AE — https://www.schoolofmotion.com/blog/cameras-after-effects
10. ActionVFX — One-Node vs Two-Node Cameras — https://www.actionvfx.com/blog/understanding-one-node-vs-two-node-cameras-in-after-effects
11. MakeUseOf — Enter the Third Dimension: 3D Workflows in AE — https://www.makeuseof.com/enter-the-third-dimension-working-with-3d-workflows-in-adobe-after-effects/
12. FocusEE — How to Use 3D Camera in AE: Cinematic Guide — https://focusee.imobie.com/edit-video/how-to-use-3d-camera-in-after-effects.htm
13. Maxon Help — CINEWARE in After Effects — https://help.maxon.net/c4d/s22/us/html/1100.html
14. Adobe Help — Tracking 3D Camera Movement — https://helpx.adobe.com/after-effects/using/tracking-3d-camera-movement.html
15. Boris FX — 3D Camera Tracker in AE — https://borisfx.com/blog/3d-camera-tracker-in-after-effects/
16. Pond5 — Motion Tracking: The 3D Camera Tracker — https://blog.pond5.com/12559-motion-tracking-in-after-effects-the-3d-camera-tracker/
17. Effects Collective — Guide to 3D Camera Tracking in AE — https://effectscollective.com/article/guide-to-3d-camera-tracking-in-after-effects/
18. Adobe Help — Cameras, lights, and points of interest — https://helpx.adobe.com/after-effects/using/cameras-lights-points-interest.html
19. Adobe Help — Enable lights to cast shadows — https://helpx.adobe.com/after-effects/using/enable-lights-to-cast-shadows.html

### Premiere Pro

1. Adobe Help — Learn about VR editing in Premiere Pro — https://helpx.adobe.com/au/premiere-pro/kb/work-with-vr.html
2. Adobe Help — Immersive video effects and transitions — https://helpx.adobe.com/premiere/desktop/edit-projects/edit-vr-content/immerse-video-effects-and-transitions.html
3. Adobe Help — Perform three-axis video rotation — https://helpx.adobe.com/premiere/desktop/edit-projects/edit-vr-content/three-axis-video-rotation.html
4. PSU Media Commons — VR Plane to Sphere Effect — https://mediacommons.psu.edu/2019/07/03/using-the-vr-plane-to-sphere-effect-in-adobe-premiere-for-360-video/
5. Insta360 — Reframe Adobe Premiere Pro Plugin — https://www.insta360.com/blog/news/insta360-reframe-adobe-premiere-pro-plugin.html
6. Insta360 Support — How to Use Insta360 Reframe — https://www.insta360.com/support/supportcourse?post_id=20765

### WPF / .NET interop

1. microsoft/WPFDXInterop — D3D11Image + SharpDX — https://github.com/microsoft/WPFDXInterop/issues/10
2. Stack Overflow — Rendering on a WPF Control with DirectX 11 — https://stackoverflow.com/questions/11794516/rendering-on-a-wpf-control-with-directx-11
3. sharpdx/SharpDX#599 — SurfaceQueue / D3DImage sync — https://github.com/sharpdx/SharpDX/issues/599
4. iejeecee/SharpDX-Wpf-Direct3D-11-Example — https://github.com/iejeecee/SharpDX-Wpf-Direct3D-11-Example
5. Helix Toolkit — https://helix-toolkit.github.io/
6. Helix Toolkit GitHub — https://github.com/helix-toolkit/helix-toolkit

### Rust / WGPU FFI

1. The Embedded Rust Book — Rust with C (cdylib) — https://docs.rust-embedded.org/book/interoperability/rust-with-c.html
2. gfx-rs/wgpu-native — https://github.com/gfx-rs/wgpu-native
3. Rustonomicon — FFI — https://doc.rust-lang.org/nomicon/ffi.html
4. lib.rs — wgpu crate — https://lib.rs/crates/wgpu
