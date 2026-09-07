# QA — Catalog preview & monitor cleanup (2026-09-07)

Branch: `fix/catalog-preview-performance`

## Perubahan

1. **Kartu ringkasan proyek dihapus** dari kolom meter (`apps/web/src/app/editor/[project_id]/page.tsx`).
   Import `ProjectDetailsCard` dihapus; kolom meter dan perilaku resize tetap utuh.
2. **Signal monitor hands-free** (`apps/web/src/components/editor/panels/assets/views/components/scopes.tsx`):
   - State `frozen`, tombol pause/play, badge `ScopeStatus` (LIVE/Frozen/Waiting), dan
     ikon `PauseIcon`/`PlayIcon` dihapus.
   - Loop sampling 12 fps dan statistik 3 fps **tetap berjalan otomatis** (deps effect kini `[active]`).
   - Footer tidak lagi menampilkan status hold; empty state tetap ada.
3. **Ikon plus katalog putih** (cyan → `text-white`):
   - `apps/web/src/components/editor/panels/assets/draggable-item.tsx` (kartu bersama)
   - `views/filters.tsx`, `views/transitions.tsx`, `views/presets.tsx`
   - Grep `text-cyan-400` hasilnya 0 setelah perubahan.
4. **Preview efek jujur + fallback terlihat**:
   - `services/renderer/effect-preview.ts`: `renderPreview()` kini mengembalikan
     `{ rendered, usedFallback }`; sukses hanya dilaporkan jika `drawImage` benar-benar
     berjalan. Tidak ada `getImageData` (regresi anti-readback tetap dijaga).
   - `views/effects.tsx`: `isPainted` hanya true saat `outcome.rendered`; kegagalan
     menampilkan plate palet deterministik + nama efek (fallback visual, bukan tile kosong).
5. **Overlay kontras** (`views/overlays.tsx`): plate `getPreviewBackgroundStyle` (palet
   deterministik) di belakang gaya overlay, sehingga overlay transparan/gelap
   (vignette, fade, frame) tetap terbaca.
6. **Sticker backdrop catur** (`views/stickers.tsx`): latar hitam pekat diganti
   checkerboard netral (dua lapis linear-gradient) agar artwork transparan gelap/terang
   terbaca. Preview URL shape/flags sudah lokal (data-URL canvas & `/flags/*.svg`),
   jadi tidak ada fallback remote baru.
7. **What's New** ditambahkan di `apps/web/src/lib/whats-new/feed.ts` (entri teratas).

## Audit performa export (ringan, tanpa perubahan)

- `export-performance.ts`: kedalaman antrean dibatasi per resolusi/core (4K >, 4K, <=4K);
  ada fallback untuk worker tanpa sinyal GPU-ready.
- `export-worker.ts`: satu alokasi `OffscreenCanvas` per job (bukan per frame).
- Tidak ditemukan cacat terverifikasi di lapisan kebijakan; tanpa benchmark, tidak ada
  perubahan spekulatif yang diterapkan (sesuai aturan "verified, minimal fixes").

## Validasi

- `bunx tsc --noEmit` (apps/web) — lolos (dijalankan dua kali, termasuk setelah edit akhir).
- `bun run test` — **408 pass / 0 fail** (termasuk regresi baru: konteks 2D hilang →
  `rendered: false`; dan guard entri terbaru What's New diperbarui ke id entri baru).
- Test terfokus `effect-preview` + `scope-analysis` — lolos.
- Lint `biome check`: file yang disentuh bersih secara gaya (diverifikasi terhadap
  konten ternormalisasi LF); kegagalan format CRLF bersifat repo-wide dan pre-existing
  (Windows `core.autocrlf=true` vs biome default LF — file yang tidak disentuh pun
  gagal, mis. `src/app/docs/page.tsx`).
- Verifikasi pixel Playwright (375/768/1440) **belum** dijalankan: server dev Next
  dan browser headless berat CPU; ditunda karena mesin sedang dipakai gaming.
  Jalankan nanti via skill `artidor-ui-verification`.
