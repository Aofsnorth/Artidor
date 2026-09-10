# Editor Bughunt #2 — Export Pipeline (renderer scope)

Scope: hanya `apps/web/src/services/renderer/` + ledger ini. File read-only
(`export-worker-bridge.ts`, `export-codec.ts`, `parallel-export.ts`,
`export-performance.ts` kecuali bug di dalamnya) tidak diubah kecuali ada bug
terbukti. `recommendSegmentCount()` (advisory, belum di-wire) dan decode LRU
tidak disentuh. Track lain (commands/audio/clipboard/persistence/collab) tidak
disentuh. Tidak ada dependensi baru, tidak ada commit.

## Ringkasan fix (6 file sumber + 1 suite test)

| # | File | Bug | Fix |
|---|------|-----|-----|
| F1 | `resolve.ts` | Unknown effect type (`effectsRegistry.get` throw) menggagalkan **seluruh** export padahal graphics path fallback ke rectangle dan param-update path membiarkan unknown untouched | Skip unknown attached effects di `resolveEffectPassGroups`; `resolveEffectLayerNode` return `null` untuk unknown `effectType` |
| F2 | `scene-deserializer.ts` + `export-worker.ts` | `deserializeSceneTree` membuat blob URL per file per export tapi **tidak pernah revoke** — warm worker dipakai ulang antar export sehingga URL menumpuk seumur halaman | Kembalikan `{ root, blobUrls }` + `revokeSceneBlobUrls()`; worker revoke di semua jalur settle (cancel ×3, sukses) |
| F3 | `scene-builder.ts` | Null layer (`type: "text"`, `nullLayer: true`, konten `""`, `hidden: true`) lolos filter hidden (flag ada di elemen, bukan track) lalu **merender node teks kosong** ke preview/export | `continue` untuk `nullLayer === true` (tetap di indeks parent-chain agar anak mewarisi transform) |
| F4 | `export-worker.ts` | Loop progres `0.2 + (localFrame / count) * 0.78`: frame terakhir lapor `(count-1)/count` → **tidak pernah 1.0**; jalur static-scene hanya lapor 0.98 + heartbeat | Post terminal `progress: 1` sebelum `complete`; clamp loop dengan `Math.min(1, …)` |
| F5 | `mask-feather.ts` | `applyMaskFeather` meneruskan `feather` mentah ke WASM — nilai dari project data (paste/clipboard, AI executor, save lama) bisa negatif/NaN/>MAX; hanya handle-drag yang clamp | `clampMaskFeather()` → `[0, MAX_FEATHER]`, non-finite → 0 |
| F6 | `export-output.ts` | `isDiskBackedExportSupported()` throw `TypeError` bila `navigator.storage` undefined (bukan sekadar tanpa `getDirectory`) — crash guard fitur, bukan `false` | Guard `typeof navigator.storage` + null + try/catch → `false` |

Dipertimbangkan lalu **ditolak** (dengan alasan, lihat ronde): reset timer bridge
(no-op — closure fresh per export), pelebaran `isEncoderConfigError`, pewarisan
`muted` video ke render, perubahan `buildSegmentPlans`, perubahan
`concatenateSegments`/offset audio, penambahan `camera`/`audio` node.

## R01 — Baseline suite renderer (test)

- Skenario: pastikan tidak ada yang merah sebelum berburu.
- Bukti kode: `ls apps/web/src/services/renderer/*.test.ts` (13 file, semua di scope).
- Perintah: `bun test src/services/renderer` (dari `apps/web`).
- Hasil: **66 pass, 0 fail** (240 expect, 14 file).

## R02 — Keterbacaan modul untuk probe (test)

- Skenario: verifikasi modul target bisa diimpor langsung di bun (tanpa browser).
- Bukti kode: `src/lib/graphics/index.ts` export `registerDefaultGraphics`,
  `DEFAULT_GRAPHIC_SOURCE_SIZE`; `URL.createObjectURL/revokeObjectURL` ada di bun.
- Perintah: `bun -e` import graphics + create/revoke blob URL.
- Hasil: impor OK, `revoke ok`. Test runtime nanti memakai pola ini.

## R03 — Batas segmen ganjil (test)

- Skenario: `buildSegmentPlans` untuk total ganjil (103/4, 97/3, 61/2, …).
- Bukti kode: `segment-plan.ts:103-122` — `base + (i < remainder ? 1 : 0)`, cursor
  kontinu `[0, totalFrames)`.
- Perintah: `bun -e` 7 kombinasi (total,count).
- Hasil: semua `sum=total`, `contig=true`, `width=true`. **Bukan bug** —
  diabadikan di test suite (R20).

## R04 — Audit cancel/timeout bridge (inspect, static-only)

- Skenario: baca `export-worker-bridge.ts:239-299` — klaim komentar "Terminate the
  worker immediately" vs implementasi `cleanup()` → `releaseWarmWorker(worker,
  reuseWorker)` yang **me-pool** worker saat `reuseWorker: true`.
- Hasil: **temuan audit** — cancel single-worker menyelesaikan promise
  `cancelled` tapi worker hangat tetap hidup (by design untuk reuse). Bukan
  kebocoran tak terbatas (satu worker), tapi bertentangan dengan klaim komentar
  dan inspeksi awal saya yang salah ("terminate segera"). Tidak diubah (read-only
  + perilaku reuse disengaja). Marker: static-only, tanpa uji browser.

## R05 — Efek tak dikenal saat resolve (test)

- Skenario: `effectsRegistry.get("nonexistent-xyz")`.
- Bukti kode: `src/lib/registry.ts:33-39` — `get()` **throw**
  `Unknown effect: …`; `resolve.ts:139,580` memanggilnya tanpa guard.
- Perintah: probe test sementara (pre-fix) + probe `resolveRenderTree` graphic
  dengan efek unknown.
- Hasil: **BUG terkonfirmasi** — `THROWS: Unknown effect: nope-unknown`,
  seluruh export gagal. → **F1**.

## R06 — Regresi `isStaticScene` (test)

- Skenario: asumsi awal "textAnimator lolos deteksi statis".
- Bukti kode: `static-scene.ts:32` — `node.params.textAnimator !== undefined`
  → false.
- Perintah: probe `isStaticScene` + recheck R10/R11 (`__probe-static*`).
- Hasil: asumsi awal **salah** — probe pertama merakit node secara keliru
  (`{...img(), type:"text"}`); setelah dikoreksi `text+animator → false`.
  **Bukan bug.** Pelajaran dicatat: spread antar-tipe menipu probe.

## R07 — Kamera & filename overlay (inspect, static-only)

- Skenario: (a) apakah kamera ikut render export; (b) apakah overlay completion
  memakai format yang benar.
- Bukti kode: (a) nol kemunculan `camera|Camera` di `services/renderer/**`;
  `findActiveCamera*` hanya dipakai `camera-tab.tsx` (UI). (b)
  `export-button.tsx:142-150,252-262` memakai `DEFAULT_EXPORT_OPTIONS.format`,
  sedangkan `ExportPopover` (l.311) memakai `format` state — overlay bisa
  berlabel ekstensi default walau user memilih webm.
- Hasil: (a) by design track lain (di luar scope, tidak diubah); (b) bug
  terkonfirmasi tapi **di luar scope** (`components/editor`, bukan
  `services/renderer`) → dilaporkan sebagai honest gap, tidak diperbaiki.

## R08 — Jalur negatif codec chain (test)

- Skenario: `negotiateVideoCodec` untuk forceSoftware, webm, hevc, semua-gagal,
  tanpa `VideoEncoder`.
- Bukti kode: `export-codec.ts:235-282` (`buildCodecChain`), `:390-394`
  (last-resort VP9/WebM).
- Perintah: probe test sementara (pre-fix).
- Hasil: semua benar — `mp4-sw → avc/sw`, `hevc-hw → hevc/hw`,
  `all-fail → vp9/sw/webm`. **Bukan bug.** Celah tersisa: kegagalan
  `configure()` *setelah* negosiasi hanya tertangani via string-match (R09).

## R09 — Error matcher + audio codec (test)

- Skenario: `isEncoderConfigError`, `negotiateAudioCodec`, helper dimensi/kualitas.
- Bukti kode: `export-codec.ts:161-164` — `message.includes("not supported by
  this browser")`; dipakai konsisten di `renderer-manager.ts:330,441`.
- Perintah: probe test sementara (pre-fix).
- Hasil: matcher sempit tapi **konsisten di semua 3 jalur** (worker, retry
  worker, main-thread) — pesan mediabunny/WebCodecs memang berformat itu.
  Melebarkan matcher berisiko retry atas error fatal. **Tidak diubah.**
  `encodeSafeDimensions`/`negotiateAudioCodec` benar. Marker: tanpa uji browser
  nyata (Firefox tanpa HW encoder) — honest gap.

## R10 — First-frame vs container-vs-VP9 (test)

- Skenario: hitung timestamp lokal segmen vs global; cek container untuk
  semua format termasuk fallback VP9.
- Bukti kode: `export-worker.ts:510-513` (global render, lokal encode);
  `parallel-export.ts:276-283` + `export-worker.ts:334-337` +
  `scene-exporter.ts:176-179` — ketiganya memakai format hasil negosiasi.
- Perintah: probe first-frame per segmen + grep `negotiatedFormat`.
- Hasil: first-frame divergen ≤ setengah tick dari waktu mulai segmen
  (dalam toleransi); container selalu mengikuti negosiasi. **Bukan bug.**

## R11 — Matriks `isStaticScene` (test)

- Skenario: still/video/color/short/offset/fx/mask/anim/retime/textanim/zero.
- Bukti kode: `static-scene.ts:18-35`.
- Perintah: probe `__probe-static.test.ts` (pre-fix).
- Hasil: semua benar (`still:true`, sisanya `false` kecuali color-root `true`).
  Anomali `textanim:true` ternyata artefak probe (lihat R06). **Bukan bug.**

## R12 — Peta resolusi tiap tipe elemen (test)

- Skenario: video/image/text/sticker/graphic/effect + hidden track + muted
  video + camera + audio → `buildScene`.
- Bukti kode: `scene-builder.ts:115-232`.
- Perintah: probe `__probe-resolve.test.ts` (pre-fix).
- Hasil: semua tipe visual ter-resolve; **muted video tetap render video**
  (benar — mute hanya soal audio); hidden track diskip; camera/audio memang
  tidak punya node (by design, luar scope). **Bukan bug** — diabadikan di test.

## R13 — Round-trip serializer kaya (test)

- Skenario: elemen video kaya (transform, opacity, blendMode, graphicStyle,
  animations, effects, masks, retime) → serialize→deserialize→serialize.
- Bukti kode: `scene-serializer.ts:53-82`, `scene-deserializer.ts:40-98`.
- Perintah: probe `__probe-rt.test.ts` (pre-fix).
- Hasil: **equal `len 867`** — tidak ada field hilang. Celah nyata: blob URL
  dibuat tapi tak pernah direvoke → **F2**.

## R14 — Matriks feather (test)

- Skenario: feather 0/1/12/500/1000/5000/-5/NaN.
- Bukti kode: `mask-feather.ts` (pre-fix) meneruskan mentah;
  `param-update.ts:38-44` clamp hanya untuk handle-drag; `MAX_FEATHER=1000`.
- Perintah: probe clamp + baca `computeFeatherUpdate`.
- Hasil: **BUG terkonfirmasi** (jalur non-UI tanpa clamp) → **F5**.
  `feather=0` aman (cabang `renderMask` dilewati di frame-descriptor).

## R15 — Cache blur-backdrop (inspect, static-only)

- Skenario: `getOrCreateBlurBackdrop` (`frame-descriptor.ts:103-120`, di luar
  scope baca tapi relevan) — WeakMap keyed by source+size, redraw tiap frame.
- Hasil: resize membuat entri baru (lama di-GC via WeakMap); tidak ada bug
  ukuran basi. Static-only (tanpa render GPU nyata) — honest gap.

## R16 — Pacing timer (inspect, static-only)

- Skenario: hitung budget 60s worker-timeout vs frekuensi progress; heartbeat
  statis 10s vs timeout single-worker 30s; balapan cancel warm-reuse.
- Bukti kode: `export-worker.ts:541-546,567-574`; `parallel-export.ts:234`;
  `renderer-manager.ts:311,345`.
- Hasil: pacing valid (progress tiap ~10 frame ≪ 60s; heartbeat 10s < 30s);
  `isCancelled=false` di awal `handleExport` membuat reuse aman.
  Static-only — honest gap (tanpa worker browser nyata).

## R17 — Batas minimum frame (test)

- Skenario: `planSegmentCount`/`shouldUseParallelExport` untuk 0–600 frame.
- Bukti kode: `segment-plan.ts:24,73-78`; `parallel-export.ts:152-172`.
- Perintah: `bun -e` 10 titik + hitung gate ekuivalen 1080p/4K.
- Hasil: timeline 30-frame → plan=1, gate tolak 2 segmen → fallback
  single-worker. **Tidak ada export kosong. Bukan bug** — diabadikan di test.

## R18 — Guard disk-backed + beban impor (test)

- Skenario: `isDiskBackedExportSupported()` tanpa `navigator.storage`;
  `parallel-export.ts` load di bun; ID stiker valid (`shapes:circle`).
- Bukti kode: `export-output.ts:40-44` (pre-fix) — `"getDirectory" in
  navigator.storage` throw bila `storage` undefined.
- Perintah: `bun -e` guard + import mediabunny/parallel-export.
- Hasil: **BUG terkonfirmasi** — `guard-THROWS: TypeError` → **F6**.
  mediabunny + parallel-export load OK. Tambahan: abort path concat + sisa
  buffer kecil terkonfirmasi aman (static).

## R19 — Rantai ke browser media (inspect, static-only)

- Skenario: apakah tekstur/decoder dilepas saat cancel (kompositor
  `syncTextures`, `video-cache` `clearVideo`/`clearAll`).
- Hasil: `clearVideo`/`clearAll` ada dan dipakai; tidak ada bukti kebocoran di
  dalam scope — sisi browser-media milik track lain. Static-only (tanpa
  DevTools memory profile) — honest gap.

## R20 — Fix + regresi + validasi (test)

- Skenario: terapkan F1–F6, tulis
  `apps/web/src/services/renderer/export-bughunt-2.test.ts` (25 test, pakai
  factory `tests/factories/editor|project`, tanpa browser media), jalankan
  suite + biome + tsc.
- Perintah:
  - `bun test src/services/renderer/export-bughunt-2.test.ts` → **25 pass,
    0 fail** (224 expect). Satu kegagalan awal adalah test saya sendiri
    (ekspektasi `> 0.2` untuk 1-frame; benar `= 0.2`) — diperbaiki, bukan kode.
  - `bunx biome check --write` pada file sentuh → format saja.
  - `bun test src/services/renderer` (full) → **91 pass, 0 fail** (464 expect,
    15 file). Perhatian: suite saya sempat memecahkan
    `export-codec.test.ts` (cache negosiasi codec global + kunci 1920x1080
    yang sama) — diperbaiki dengan dimensi probe unik (1600x900) + restore
    global `VideoEncoder` di `afterAll`.
  - `bunx tsc --noEmit` → **bersih (exit 0)**.
- Detail fix per file: lihat tabel Ringkasan di atas.
