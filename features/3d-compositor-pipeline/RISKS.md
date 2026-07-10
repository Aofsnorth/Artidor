# Risks: 3D Compositor Pipeline

## 1. Roadmap conflict — WPF desktop-native (RISIKO TERTINGGI)

**Risiko**: ROADMAP.md §"Tech Stack" menyebut desktop shell = Tauri 2.0.
WPF .NET **tidak ada** di roadmap. AGENTS.md: "agent must not add features
that conflict with ROADMAP.md without explicit approval." WPF juga masuk
kategori "Large rewrite / New dependency-heavy features" yang forbidden
without approval.

**Dampak**: jika dipaksakan tanpa approval, melanggar prime directive &
roadmap rule; review PR akan ditolak; potensi duplikasi maintenance tiga
desktop shell (GPUI legacy, Tauri, WPF).

**Mitigasi**:

- Phase D (WPF) **diberhentikan sampai approval eksplisit** user/maintainer.
- Phase A–C (rust scene3d + Tauri 3D) aman, align P1 performance, jalan
  dulu — nilai 3D sudah didapat via Tauri tanpa WPF.
- Setelah approval: update ROADMAP.md & AGENTS.md dulu (Phase D.0)
  sebelum scaffold WPF.
- WPF diposisikan sebagai **app ketiga opsional Windows-premium**, bukan
  pengganti Tauri. Tauri tetap desktop shell utama cross-platform.

**Rollback**: folder `apps/desktop-native/` + `rust/bridges/native/`
terisolasi — hapus dari workspace members + revert scaffold. Tidak
mengganggu Tauri/web/2D path.

## 2. D3DImage shared surface sync fragile

**Risiko**: interop WPF D3DImage antar device (DX12 WGPU → DX11 → DX9Ex)
punya masalah sync "fundamentally broken" (SharpDX#599). Bisa tearing,
stale frame, deadlock.

**Dampak**: render WPF tidak stabil pada frame timing tertentu; QA sulit
reproduksi.

**Mitigasi**:

- MVP WPF pakai **WriteableBitmap copy** (Opsi B) dulu — zero interop
  complexity, validasi end-to-end 3D pipeline. Performa cukup untuk
  1080p 30-60fps.
- Shared surface (Opsi A) hanya setelah MVP stabil + benchmark
  justifikasi. Pakai surface queue + fence manual, lock per-frame.
- Fallback: jika shared surface gagal stabil, tetap pakai WriteableBitmap
  untuk ≤1080p; shared surface hanya untuk 4K.

**Rollback**: kembali ke WriteableBitmap path (kode tetap ada).

## 3. Dependency baru (glam, gltf, Vortice.Windows)

**Risiko**: AGENTS.md melarang dependency tanpa justifikasi + policy check.
`glam` (math 3D), `gltf` (parser GLB), `Vortice.Windows` (DirectX managed)
adalah dependency berat baru.

**Dampak**: ukuran binary naik, supply-chain risk, maintenance burden.

**Mitigasi**:

- `glam`: standar de-facto ekosistem wgpu, maintained, MIT/Apache,
  zero-unsafe. Catat di `docs/harness/DEPENDENCY_DECISIONS.md` dengan
  alasan (math 3D manual = bug-prone, glam sudah dipakai komunitas wgpu).
- `gltf`: parser resmi Khronos format, pure Rust, maintained. Alternatif
  `easy-gltf` lebih high-level — bandingkan di decision doc.
- `Vortice.Windows`: penerus SharpDX (unmaintained), MIT, aktif. Hanya
  untuk Phase D (WPF) — butuh approval. Cek `DEPENDENCY_POLICY.md`.
- Semua dicatat dengan rollback plan (uninstall tidak affect 2D path).
- Versi pin ke rilis ≥7 hari (AGENTS.md dependency rule).

## 4. Compositor 2D regression

**Risiko**: extend `compositor.rs` dengan 3D path bisa mengganggu 2D path
yang sudah berjalan (shared `GpuContext`, `TextureStore`, depth buffer
baru bisa konflik resource).

**Dampak**: proyek 2D eksisting rusak → data loss persepsi user, broken
export (P0 roadmap violation).

**Mitigasi**:

- 3D = **render path baru** (`render_scene3d`), tidak ubah `render_frame`.
- Shader 3D = file `.wgsl` baru, tidak sentuh `layer.wgsl`/`blend.wgsl`.
- Depth texture hanya dibuat di 3D path.
- **Regression golden test**: snapshot 2D frame pre-change, assert
  byte-identical post-change di CI sebelum merge.
- `cargo test -p compositor` wajib lulus setiap phase B sub-step.

**Rollback**: feature flag `enable_3d` di renderer; off = 2D path pure.

## 5. Performa 3D di WASM fallback

**Risiko**: 3D path di WASM (OffscreenCanvas) mungkin tidak feasible untuk
scene kompleks (geometri dense + lighting). ROADMAP P1 = performance.

**Dampak**: web-only user (non-Tauri) tidak dapat 3D atau lag.

**Mitigasi**:

- MVP: 3D **hanya native** (Tauri/WPF). `is3DSupported()` return false di
  pure-web WASM. UI sembunyikan panel 3D jika tidak didukung.
- Future: 3D WASM dengan geometri limit + lighting simplified (Tier 1
  only) — riset terpisah, bukan scope plan ini.
- Komunikasi jelas ke user: 3D butuh desktop app.

## 6. Project file format migration

**Risiko**: menambah `Scene3DDescriptor` ke format project `.artpr` bisa
break project lama jika tidak backward-compatible.

**Dampak**: data loss persepsi — user tidak bisa buka proyek lama (P0).

**Mitigasi**:

- `Scene3DDescriptor` **opsional** di project schema (serde `default`).
- Project lama (2D-only) load → tidak ada kamera → fallback 2D path.
- Versi schema naik minor + migration test (load fixture project lama).
- Tidak perlu migrasi data; 3D field muncul saat user pertama kali
  aktifkan layer 3D.

**Rollback**: strip field 3D saat save jika `enable_3d` off → file
kompatibel ke versi lama.

## 7. Scope creep Tier 2–4

**Risiko**: Tier 2 (GLB/PBR/DoF), Tier 3 (VR), Tier 4 (tracker) sangat
luas. Bisa drag berbulan-bulan, mengganggu P0/P1 lain (Tauri migration
Phase 4–7 yang masih pending).

**Dampak**: fokus roadmap terganggu; Tauri native export (P1) tertunda.

**Mitigasi**:

- Tier 1 (Classic 3D) = target pertama, deliver nilai cepat.
- Tier 2–4 di plan sebagai fase terpisah, **tidak mulai** sebelum Tier 1
  shipped + Tauri Phase 4–5 (native export) selesai (P1 priority).
- Setiap tier = feature folder sendiri bila perlu, PR terpisah.
- Tracker (Tier 4) riset-only di plan ini — implementasi deferred.

## 8. Keamanan import mesh/texture

**Risiko**: parser GLB/GLTF + texture decode dari file user = attack
surface (malformed file, OOM, path traversal di native FS).

**Dampak**: crash, DoS, potensi RCE via parser bug.

**Mitigasi**:

- Batas ukuran file (sudah ada 200MB) + dimensi (8192px) — reuse safety
  hardening GPUI lama, port ke 3D path.
- Parser `gltf` pure-Rust (no unsafe C dep) — cek audit.
- Validasi mesh: vertex count limit, index bounds check.
- Path validation di Tauri/WPF command (sudah ada pola di `lib.rs`).
- Tidak ada `eval`/`new Function`/shell exec (AGENTS.md security).

## 9. Multi-desktop-shell maintenance burden

**Risiko**: tiga shell (GPUI legacy, Tauri, WPF) = triplicate UI kerja
walaupun logic di rust/. ROADMAP sudah rencana hapus GPUI (Phase 6 Tauri).

**Dampak**: maintenance cost tinggi, bug parity.

**Mitigasi**:

- WPF hanya setelah GPUI benar-benar dihapus (Tauri Phase 6 selesai) —
  jangan tiga shell hidup bersamaan.
- UI WPF port dari web panel, logic 100% rust/ via JSON scene —
  tidak duplikasi domain logic (AGENTS.md).
- Pertimbangkan: apakah WPF memberi nilai di atas Tauri di Windows?
  Justifikasi: D3DImage zero-copy native, akses Windows API premium,
  distribusi MSIX. Jika tidak kuat, **skip WPF**, pertebal Tauri saja.
  → Ini pertanyaan kunci untuk approval gate.

## 10. Dokumentasi & What's New

**Risiko**: AGENTS.md wajib update What's New per user-facing change +
dokumentasi 3D. Skip = melanggar Documentation Rules.

**Mitigasi**:

- Entry `feed.ts` per tier (Tier 1 ship → entry 1).
- Dokumentasi 3D: cara aktifkan layer 3D, kamera, lampu, export VR.
- Update AGENTS.md arsitektur setelah Phase D approval.
- Jika tidak update, tulis eksplisit alasan di PR.
