# FFmpeg Integration Options

> Analisis opsi integrasi FFmpeg ke Artidor. **Semua opsi di sini bisa dilakukan di
> kode**, dengan trade-off yang berbeda. Tidak ada pilihan default — keputusan ada
> di pengguna (per RULES.MD §2).

---

## Latar Belakang

Artidor saat ini me-render video **100% di browser** via:

- **wgpu/WASM compositor** di `rust/crates/compositor/`
- **MediaRecorder API** untuk export (`apps/web/src/lib/export/`)
- **Browser-native decoder** untuk playback

Trade-off yang diketahui:

| Pro | Kontra |
|---|---|
| Zero install, no native binary | Codec terbatas (H.264, VP9, VP8, AV1 di modern browser) |
| Pure local-first, MIT clean | Tidak bisa ProRes, DNxHR, H.265 encode di Firefox/Safari |
| Bundle size kecil tanpa FFmpeg.wasm | Export konsisten lintas OS/browser tidak terjamin |
| Privacy-first (no upload) | Slow-mo / optical-flow butuh native code untuk kecepatan |

OpenCut (parent) pakai FFmpeg server-side. Artidor tidak bisa pakai pola yang sama
karena local-first constraint.

---

## Opsi 1: FFmpeg.wasm (WASM build FFmpeg)

**Apa:**
Bundle FFmpeg.wasm (`@ffmpeg/ffmpeg` + `@ffmpeg/util`) di frontend, jalankan
sebagai Web Worker. Import/export/transcode terjadi client-side.

**Trade-off:**

| Aspek | Detail |
|---|---|
| **Bundle size** | +25–35 MB (core), +60 MB untuk build penuh dengan semua codec |
| **Codec coverage** | H.264, H.265, VP9, AV1, ProRes (read-only), DNxHR (read-only), AAC, MP3, FLAC |
| **Performance** | 3–10× lebih lambat dari native (WASM interpreter), cukup untuk export < 5 menit, tidak nyaman untuk > 15 menit |
| **Local-first** | ✅ — semua client-side, tidak ada upload |
| **MIT clean** | ✅ — FFmpeg LGPL, FFmpeg.wasm wrapper MIT |
| **Privacy** | ✅ — tidak ada data keluar device |

**File yang akan terpengaruh:**
- `apps/web/package.json` (tambah `@ffmpeg/ffmpeg`, `@ffmpeg/util`)
- `apps/web/src/lib/export/` (tambah adapter FFmpeg.wasm)
- `apps/web/src/lib/media/` (tambah path transcode)
- `apps/web/src/components/editor/dialogs/export-dialog.tsx`
  (tambah opsi "Transcode dengan FFmpeg")
- `apps/web/public/` (host FFmpeg.wasm core file, +25MB)
- `apps/web/next.config.ts` (exclude FFmpeg dari default bundle, dynamic import)

**Estimasi kerja:** 5–8 hari (satu developer).

**Risiko:**
- Bundle size berdampak ke first-load. **Mitigasi:** lazy load FFmpeg.wasm hanya
  saat user memilih "Use FFmpeg" di export dialog.
- Web Worker + WASM threading: bug Safari lama (sudah fix di Safari 17+).
- COOP/COEP header wajib di `next.config.ts` untuk SharedArrayBuffer.
  (Pakai `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy:
  require-corp` di response.)

**Verifikasi awal yang harus dilakukan sebelum decide:**
- Test dengan project 1080p 5 menit: berapa detik wall time untuk export H.265?
- Test dengan file ProRes .mov: apakah read sukses?
- Test di Firefox + Safari: apakah SharedArrayBuffer tersedia?

---

## Opsi 2: FFmpeg via Tauri/Rust (Desktop Only)

**Apa:**
Pakai `ffmpeg-next` Rust crate di `apps/desktop/`. Desktop app sudah GPUI (per
README), tinggal add FFmpeg sebagai sidecar. Browser tetap pakai pipeline saat ini.

**Trade-off:**

| Aspek | Detail |
|---|---|
| **Bundle size (desktop)** | +80–120 MB (FFmpeg binary), installer +30 MB |
| **Bundle size (web)** | Tidak berubah (zero impact) |
| **Codec coverage** | Full FFmpeg, semua codec, semua container |
| **Performance** | Native speed (1× real-time untuk H.264 single-pass, 0.3× untuk H.265 two-pass) |
| **Local-first** | ✅ — semua client-side |
| **MIT clean** | ⚠️ — FFmpeg LGPL, wajib link dinamis (bukan static) untuk avoid GPL contamination. Di macOS/Windows binary sudah dinamis; di Linux perlu build manual dengan `--enable-shared` |
| **Privacy** | ✅ |

**File yang akan terpengaruh:**
- `apps/desktop/Cargo.toml` (tambah `ffmpeg-next` atau sidecar via `tauri-plugin-shell`)
- `apps/desktop/src/` (tambah FFmpeg adapter module)
- `apps/web/` (tambah feature detection: kalau desktop → pakai Rust adapter,
  kalau web → fallback ke MediaRecorder atau FFmpeg.wasm sesuai Opsi 1)
- `apps/desktop/build.rs` atau CI workflow untuk bundle FFmpeg binary

**Estimasi kerja:** 8–12 hari (butuh setup Tauri/Electron atau pure GPUI integration,
testing cross-OS, codec licensing review).

**Risiko:**
- FFmpeg licensing: LGPL/GPL dinamis. Perlu legal review sebelum ship.
- Bundle size: installer desktop jadi > 200 MB. **Mitigasi:** opsional download
  (user pilih saat first launch).
- Codec licensing di beberapa jurisdiction (H.265 punya patent pool).

**Verifikasi awal:**
- Build desktop dengan FFmpeg sidecar di Windows + macOS + Linux.
- Test export 4K 10 menit: berapa wall time? (Expected: ~3–10 menit.)
- Test import ProRes .mov, H.265 .mp4, AV1 .webm.

---

## Opsi 3: Server-side FFmpeg (Self-hosted, User Opt-in)

**Apa:**
Pakai backend Rust/Node yang ada (di `apps/web/src/app/api/`) untuk expose endpoint
`/api/export/ffmpeg` yang menjalankan FFmpeg di server. User yang mau codec
advanced bisa opt-in dengan membawa server sendiri (Docker compose sudah ada di
README).

**Trade-off:**

| Aspek | Detail |
|---|---|
| **Bundle size** | Zero impact |
| **Codec coverage** | Full |
| **Performance** | Native, tergantung hardware server |
| **Local-first** | ❌ — butuh server, meskipun self-hosted |
| **MIT clean** | ✅ (LGPL di server tidak affect client) |
| **Privacy** | ⚠️ — video harus upload ke server. **Conflict dengan local-first philosophy** |

**File yang akan terpengaruh:**
- `apps/web/src/app/api/export/route.ts` (atau buat baru)
- `docker-compose.yml` (tambah service ffmpeg-server)
- `apps/web/src/components/editor/dialogs/export-dialog.tsx`
  (tambah field "FFmpeg server URL" di settings)
- `apps/web/src/lib/env/` (tambah env var `FFMPEG_SERVER_URL`)

**Estimasi kerja:** 3–5 hari.

**Risiko:**
- **Bertentangan dengan local-first philosophy Artidor.** README eksplisit bilang
  "no uploads, no cloud relay". Opsi ini akan jadi opt-in advanced, tapi bisa
  disalahpahami user sebagai default.
- Maintenance server-side lebih tinggi untuk solo maintainer.
- Tetap harus solve auth (siapa yang boleh pakai server orang lain?).

**Verifikasi awal:**
- Spin up Docker compose dengan ffmpeg-server, export dari local web app.
- Test latency: 1080p 5 menit upload + transcode + download = berapa total wall time?

---

## Opsi 4: Hybrid — FFmpeg.wasm Lazy, Native di Desktop

**Apa:**
Kombinasi Opsi 1 + Opsi 2. Web pakai FFmpeg.wasm lazy-loaded, desktop pakai native
FFmpeg via sidecar. Sharing codec list, export options, dan error handling
lewat `apps/web/src/lib/export/codecs.ts` (file shared).

**Trade-off:**

| Aspek | Detail |
|---|---|
| **Bundle size (web)** | Lazy: 0 default, +25–35 MB saat user pilih "Advanced export" |
| **Bundle size (desktop)** | +80–120 MB |
| **Best UX** | ✅ — user web tetap zero-install, user desktop dapat kecepatan native |
| **Kompleksitas** | Tinggi — dua adapter, satu shared API |
| **MIT clean** | ✅ di web (LGPL WASM dinamis), ⚠️ di desktop (perlu LGPL compliance) |

**Estimasi kerja:** 12–18 hari (terbesar di antara semua opsi).

**Risiko:**
- WGSL/wgpu + FFmpeg.wasm interop di web: kemungkinan bug memory di Safari lama.
- Desktop LGPL compliance: perlu dokumentasi link dinamis.

---

## Rekomendasi (Bukan Keputusan)

Per RULES.MD §2, keputusan ada di pengguna. Rekomendasi berurutan:

1. **Untuk quickest win tanpa violate local-first:** Opsi 1 (FFmpeg.wasm, lazy load).
   Bundle size impact terasa tapi bisa di-mitigasi dengan lazy load.

2. **Untuk best performance di desktop:** Opsi 2 (native sidecar). Browser tetap
   pakai MediaRecorder seperti sekarang.

3. **Untuk zero bundle impact, opt-in advanced:** Opsi 3 (server-side, opt-in).
   Conflict dengan local-first → perlu klarifikasi apakah ini acceptable.

4. **Untuk production-grade:** Opsi 4 (hybrid). Paling kompleks tapi UX terbaik.

---

## Dependency Compliance (Wajib Sebelum Install)

Per `AGENTS.md` §"Dependency and Framework Rules":

- Baca `docs/harness/DEPENDENCY_POLICY.md` dan `docs/harness/DEPENDENCY_DECISIONS.md`
  sebelum add dependency baru.
- Untuk FFmpeg.wasm: cek lisensi (`@ffmpeg/ffmpeg` MIT, FFmpeg core LGPL).
- Untuk `ffmpeg-next` (Rust): LGPL, perlu dokumentasi link dinamis.
- Cek bundle/performance impact di bundle analyzer.
- Cek apakah `apps/web/src/lib/export/` sudah punya adapter pattern untuk ditiru.
- Document rollback plan.

---

## File yang Akan Diubah (Semua Opsi)

> **Hanya untuk referensi**, bukan implementasi. Tidak edit source code sebelum
> ada approval eksplisit per Opsi.

| Opsi | Files Added | Files Modified |
|---|---|---|
| 1 — FFmpeg.wasm | `lib/export/ffmpeg-wasm-adapter.ts`, `workers/ffmpeg-worker.ts` | `package.json`, `export-dialog.tsx`, `next.config.ts`, `lib/media/`, `lib/export/index.ts` |
| 2 — Desktop native | `apps/desktop/src/ffmpeg/`, `apps/desktop/build.rs` | `Cargo.toml`, `apps/web/src/lib/export/codecs.ts` (detect desktop), `lib/env/` |
| 3 — Server-side | `app/api/export/ffmpeg/route.ts` | `docker-compose.yml`, `export-dialog.tsx`, `lib/env/`, `lib/export/codecs.ts` |
| 4 — Hybrid | Gabungan 1 + 2 + `lib/export/codecs.ts` baru | Semua file di opsi 1, 2, plus router |

---

## Cara Decide

1. Pilih Opsi (1 / 2 / 3 / 4) → catat jawaban di chat.
2. AI membaca file ini, lalu usulkan diff plan terlingkup per Opsi.
3. User approve per-component.
4. AI implementasi, jalankan checks, update `MAINTENANCE.MD`.
5. AI tambah entri "What's New" (per RULES.MD §10).
