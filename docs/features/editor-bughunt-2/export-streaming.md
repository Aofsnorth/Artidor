# Streaming Export — Part 1 (worker + output)

Scope: **hanya** `apps/web/src/services/renderer/export-worker.ts` +
`export-output.ts` + `export-streaming.test.ts` + ledger ini. Bridge
(`export-worker-bridge.ts`), manager, dan UI **tidak disentuh** — itu Part 2.
Tidak ada dependensi baru, tidak ada commit.

## Ringkasan perubahan

| # | File | Perubahan |
|---|------|-----------|
| S1 | `export-output.ts` | `exportTempExtensionForFormat()` (webm→webm, mp4-family→mp4); `createExportTempFile(extension?)` mengembalikan `{ handle, stream, name, remove }`; `tryCreateExportTempFile()` (never-throw → `null`, fallback `BufferTarget`); `discardExportTempFile()` (never-throw cleanup); adapter `WritableStream` dapat handler `abort` (tutup file saat `StreamTarget` abort) |
| S2 | `export-worker.ts` | Init terima `streamToDisk?: boolean`; file OPFS dibuat **setelah** negosiasi codec (ekstensi = format hasil negosiasi) dan **sebelum** `new Output`; target = `new StreamTarget(stream, { chunked: true })`; sukses → `complete-streamed { byteLength, fileName }` (tanpa transfer buffer); temp dihapus di semua jalur cancel (×3) + error (`discardActiveStreamTempFile` di outer catch untuk throw awal); `output.target as BufferTarget` di jalur buffer |
| S3 | `export-streaming.test.ts` | 8 test: paritas byte, ekstensi/naming, fallback OPFS, cleanup cancel+error, kontrak pesan worker, keamanan bridge |
| S4 | Ledger ini | R01–R10 |

Kontrak pesan baru (worker → main):

```ts
{ type: "complete-streamed"; byteLength: number; fileName: string }
```

## Verifikasi bridge untuk Part 2

`export-worker-bridge.ts:315` adalah `switch (data.type)` **tanpa cabang
`default`**. Pesan bertipe tak dikenal (termasuk `complete-streamed` sebelum
Part 2 memasang handler) jatuh lewat secara diam-diam — tidak throw, tidak
resolve. Aman untuk Part 1 mendarat duluan; Part 2 menambahkan case
`complete-streamed` (baca file OPFS → download → hapus temp).

## R01 — Baseline suite renderer (test)

- Skenario: pastikan tidak ada yang merah sebelum menyentuh worker.
- Bukti kode: `ls apps/web/src/services/renderer/*.test.ts` (scope, termasuk
  `export-output.test.ts`, `export-worker.test.ts`,
  `export-worker-bridge.test.ts`).
- Perintah: `bun test --isolate
  src/services/renderer/export-output.test.ts
  src/services/renderer/export-worker.test.ts
  src/services/renderer/export-worker-bridge.test.ts` (dari `apps/web`).
- Hasil: **6 pass, 0 fail** (10 expect, 3 file).

## R02 — API `StreamTarget` mediabunny (inspect)

- Skenario: konfirmasi `StreamTarget` menerima `WritableStream<StreamTargetChunk>`
  + `{ chunked: true }` tanpa dep baru (klaim task).
- Bukti kode: `mediabunny@1.49.0/src/target.ts:287-345` —
  `constructor(writable, options?)`, `chunked?: boolean` (default chunk 16 MiB),
  chunk `{ type: "write", data: Uint8Array, position: number }`.
- Perintah: `bun -e` konstruksi `new StreamTarget(new WritableStream(),
  { chunked: true })`.
- Hasil: konstruksi OK. **Bukan bug** — API sesuai klaim, tidak perlu dep baru.

## R03 — Desain ekstensi temp file (inspect)

- Skenario: ekstensi harus diputuskan **setelah** negosiasi codec karena format
  bisa flip mp4→webm (fallback VP9 di `export-codec.ts:390-394`).
- Bukti kode: `export-worker.ts` (pre-change) — `effectiveFormat` dihitung di
  `:324-342`, `new Output` di `:349`. Tidak ada pemakaian ekstensi di worker
  sebelumnya.
- Hasil: `createExportTempFile(extension)` dipanggil dengan
  `exportTempExtensionForFormat(effectiveFormat)` di antara keduanya; file OPFS
  bernama `export-<uuid>.mp4|.webm`.HEVC/AV1 tetap `.mp4` (container MP4).

## R04 — Guard OPFS di worker (test)

- Skenario: `navigator.storage.getDirectory` bisa tidak ada di worker
  Firefox/Safari → fallback diam-diam ke `BufferTarget`, tidak pernah gagal.
- Bukti kode: `export-output.ts` — `tryCreateExportTempFile` membungkus
  `createExportTempFile` dengan try/catch → `null`.
- Perintah: `bun test export-streaming.test.ts` → "tryCreate falls back to null
  when getDirectory throws".
- Hasil: **pass** — `tryCreateExportTempFile("mp4")` resolve `null` saat
  `getDirectory` throw. Jalur buffer lama tidak tersentuh.

## R05 — Paritas byte stream vs buffer (test)

- Skenario: byte yang ditulis lewat adapter positioned-writes harus sama dengan
  model referensi untuk urutan paket yang sama (out-of-order + overwrite).
- Bukti kode: `export-output.ts:10-22` (`seek(position)` lalu `write(data)`);
  `mediabunny/src/target.ts:200-208` (`BufferTarget._write` = `bytes.set(data,
  pos)` — semantik posisi identik).
- Perintah: `bun test export-streaming.test.ts` → "streamed bytes equal
  reference-model bytes for the same packet sequence".
- Hasil: **pass**. Catatan jujur: model referensi adalah sparse-Map, **bukan**
  `BufferTarget` asli — `new BufferTarget()._write()` pertama stall ±detik di
  bawah bun (backing store 64 KiB bersama, perilaku mediabunny/bun yang sudah
  ada, bukan dari perubahan ini). Semantik posisi yang diuji identik
  (`set(data, pos)`), jadi paritas tetap valid. Upaya awal memakai
  `BufferTarget` asli membuat test timeout 5 s ×2 — diganti model (bukan kode
  produksi yang diubah).

## R06 — Cleanup temp saat cancel (test + inspect)

- Skenario: worker menghapus file temp miliknya di semua jalur cancel sebelum
  post `cancelled` (tanpa orphan).
- Bukti kode: `export-worker.ts` — `discardExportTempFile(streamTempFile)` +
  clear `streamTempFile`/`activeStreamTempFile` di 3 titik cancel (pre-start,
  render-loop, post-drain). `discard` never-throw agar cleanup tak menutupi
  status cancel.
- Perintah: `bun test export-streaming.test.ts` → "discard removes the temp
  file (cancel path)".
- Hasil: **pass**. Jalur `progress`/`revokeBlobUrls`/terminal `1.0` identik.

## R07 — Cleanup temp saat error (test + inspect)

- Skenario: throw kapan pun setelah file dibuat (termasuk sebelum cleanup
  jalur-settle) tidak meninggalkan orphan; error tak-terbaca (`getFile()`
  gagal setelah finalize) menjadi pesan error eksplisit + hapus temp.
- Bukti kode: `export-worker.ts` — `activeStreamTempFile` module-scoped,
  dipublish setelah `tryCreate`, di-clear di setiap settle; outer catch
  memanggil `discardActiveStreamTempFile()` sebelum post error/cancelled.
- Perintah: `bun test export-streaming.test.ts` → "discard removes the temp
  file (error path) and never throws".
- Hasil: **pass**. Unreadable-file memakai pesan eksplisit "Streamed export
  file is unreadable" (bukan silent fail — sesuai larangan silent catch di
  RULES.md).

## R08 — Kontrak pesan worker (test, static)

- Skenario: `streamToDisk?: boolean` di init; file dibuat setelah negosiasi +
  sebelum `new Output`; sukses streamed post `complete-streamed` (bukan
  `complete` + buffer).
- Bukti kode: `export-worker.ts` — `tryCreateExportTempFile` di antara
  `negotiateVideoCodec` dan `new Output`; cabang `if (streamTempFile)` baca
  `handle.getFile().size` → post `{ type: "complete-streamed", byteLength,
  fileName }` + `return` (kepemilikan file pindah ke Part 2).
- Perintah: `bun test export-streaming.test.ts` → "init accepts streamToDisk
  and worker emits complete-streamed".
- Hasil: **pass** (assert urutan indeks sumber + string kontrak). Kegagalan
  awal adalah test saya sendiri (indeks `negotiateVideoCodec` pertama
  menunjuk import type, bukan call-site) — diperbaiki dengan scope
  `handleExport`, bukan kode produksi.

## R09 — Keamanan bridge pra-Part 2 (test, static)

- Skenario: bridge **mengabaikan** tipe pesan tak dikenal dengan aman (tugas
  meminta verifikasi eksplisit).
- Bukti kode: `export-worker-bridge.ts:301-355` — `switch (data.type)` dengan
  case `ready/init-progress/progress/complete/error/cancelled`, **tanpa
  `default`**.
- Perintah: `bun test export-streaming.test.ts` → "bridge switch ignores
  unknown message types (safe for part 2)".
- Hasil: **pass** — `complete-streamed` yang tiba sebelum Part 2 di-wire akan
  diabaikan diam-diam (tidak throw/resolve). Catatan: itu berarti export
  streamed akan menggantung di timeout bridge sampai Part 2 mendarat — alasan
  `streamToDisk` belum dikirim siapa pun di Part 1 (flag opt-in, default off).

## R10 — Fix + regresi + validasi (test)

- Skenario: terapkan S1–S2, tulis `export-streaming.test.ts` (8 test), jalankan
  suite + biome + tsc.
- Perintah:
  - `bun test --isolate src/services/renderer/export-streaming.test.ts` →
    **8 pass, 0 fail** (38 expect).
  - `bun test --isolate src/services/renderer/export-output.test.ts
    src/services/renderer/export-worker.test.ts
    src/services/renderer/export-worker-bridge.test.ts` (regresi file sentuh
    + bridge) → **6 pass, 0 fail**.
  - `bunx biome check --write` pada file sentuh.
  - `bunx tsc --noEmit` (dari `apps/web`, test di-exclude oleh tsconfig).
- Hasil: **pass** semua. Detail fix per file: lihat tabel Ringkasan di atas.

## Part 2 — Ringkasan perubahan (bridge/manager/UI/lifecycle)

| # | File | Perubahan |
|---|------|-----------|
| P1 | `export-output.ts` | `openStreamedExportFile(fileName)` (buka `File` tanpa copy, tolak traversal); `deleteExportTempFileByName(fileName)` (never-throw, aman traversal); `sweepStaleExportTempFiles()` (bounded 200, cutoff 24 jam, never-throw, tak hapus file baru); helper `getExportsDirectory` + guard `isSafeExportTempName` |
| P2 | `export-worker-bridge.ts` | Case `complete-streamed` → verifikasi readability (size match) lalu resolve `{ success: true, streamed }` **tanpa** `arrayBuffer()`; param `streamToDisk` (default `false`); `pendingStreamedFileName` + hapus main-thread di cancel/timeout/error/onmessageerror/onerror |
| P3 | `renderer-manager.ts` | Opt-in otomatis `streamToDisk = isDiskBackedExportSupported()` (single-worker + retry software); fallback `BufferTarget` tetap (worker fallback sendiri); `toExportResult()` petakan streamed→`ExportResult.streamed`; parallel path tak tersentuh |
| P4 | `lib/export/index.ts` | `StreamedExportRef`, `ExportResult.streamed` (tak pernah bareng `buffer`), `hasExportContent`, `exportResultByteLength`, `streamedExportFileExtension` (allow-list mp4/webm), `filenameForExportResult` (ekstensi dari file temp) |
| P5 | `project-manager.ts` | Hapus streamed saat export baru dimulai, saat `clearExportState` (dialog tutup tanpa download), saat hasil non-sukses; streamed **tidak** di-cache (file bisa dangle); cache hit terima dua backing |
| P6 | `export-button.tsx` | `isPlayableExportResult` gates; `createExportPreviewUrl` (satu `File` → object URL, stream dari disk); download pakai ulang preview URL (tanpa Blob kedua); `ExportResultCard` + `ExportCompletionOverlay` dukung streamed + revoke saat unmount dipertahankan (tambah guard race async) |
| P7 | `editor-provider.tsx` | Boot sweep `sweepStaleExportTempFiles()` saat mount (fire-and-forget) |
| P8 | `parallel-export.ts` | **Trivial saja**: guard `!result.buffer` (tipe baru membuat `buffer` opsional); segmen tetap buffer — ubah ke streamed = refactor besar, follow-up terdokumentasi |
| P9 | `export-streaming-part2.test.ts` | 15 test baru |
| P10 | Ledger ini | R11–R20 |

Model peak-RAM (export 500 MB, angka model — bukan pengukuran):

- Sebelum: worker `BufferTarget` ≈ 500 MB + transfer terpisah ke main ≈ 500 MB
  + segmen paralel N×ukuran-segmen → **≈2× file + segmen (±1 GB+)**.
- Sesudah (streamed): mux chunk 16 MiB (`StreamTarget chunked`) + preview /
  download stream dari disk via object URL → **≈chunk 16 MiB + preview stream
  (≈tens of MB, bukan ×file)**.
- Honest marker: angka di atas adalah **model/estimasi dari desain**
  (chunked 16 MiB mediabunny, nol-copy OPFS File URL), **bukan hasil ukur** —
  tidak ada uji browser nyata dengan file >RAM (lihat R20).

## R11 — Baseline Part 2 (test)

- Skenario: pastikan Part 1 hijau sebelum menyentuh bridge/manager/UI.
- Perintah: `bun test --isolate
  src/services/renderer/export-streaming.test.ts` (dari `apps/web`).
- Hasil: **8 pass, 0 fail** (38 expect). `bunx tsc --noEmit` baseline
  **bersih** (0 error — diverifikasi via `git stash`; semua error tsc nanti
  berasal dari perubahan Part 2 dan diperbaiki, bukan pre-existing).

## R12 — Opt-in streaming di manager (inspect + test, static-only)

- Skenario: putuskan kapan `streamToDisk` dikirim. Opsi (a) hanya export
  besar/panjang vs (b) otomatis saat OPFS didukung. Dipilih (b): worker
  Part 1 sudah fallback sendiri ke `BufferTarget` bila `tryCreate` gagal
  (Firefox/Safari), jadi opt-in otomatis aman — fallback BufferTarget tetap
  ada di dua lapis (worker + deteksi `isDiskBackedExportSupported`).
- Bukti kode: `renderer-manager.ts` — `const streamToDisk =
  isDiskBackedExportSupported()` dipakai di single-worker + retry software;
  segmen paralel **tanpa** `streamToDisk` (buffer, deliberate).
- Perintah: `bun test export-streaming-part2.test.ts` → "manager opts in
  via isDiskBackedExportSupported and threads streamed results".
- Hasil: **pass** (assert kontrak statis — honest marker: bukan uji runtime
  worker sungguhan).

## R13 — Bridge `complete-streamed` tanpa copy RAM (test + inspect)

- Skenario: bridge menerima `{ type: "complete-streamed", byteLength,
  fileName }`, memverifikasi file OPFS terbaca (size cocok) lalu resolve
  `{ success: true, streamed }`. **Sengaja TIDAK** `arrayBuffer()` — itu
  membatalkan tujuan streaming (peak RAM ≈ file lagi). Koreksi dari catatan
  Part 1 lama ("baca → ArrayBuffer → resolve buffer"): desain itu ditolak
  di Part 2 karena mengembalikan peak 2× file.
- Bukti kode: `export-worker-bridge.ts` case `complete-streamed` —
  `openStreamedExportFile(fileName)` → bandingkan `file.size` → resolve
  metadata; mismatch → hapus + error eksplisit (bukan silent).
- Perintah: `bun test export-streaming-part2.test.ts` → "bridge handles
  complete-streamed and forwards streamToDisk in init" (+ assert sumber
  **tidak** mengandung `arrayBuffer()` di bridge).
- Hasil: **pass**.

## R14 — Lifecycle anti-orphan (test, fake OPFS)

- Skenario: tiap file serah-terima punya tepat satu pemilik di tiap waktu:
  (a) dialog ditutup tanpa download → `clearExportState` hapus; (b) export
  baru dimulai → hapus hasil sebelumnya; (c) cancel → bridge hapus via
  `pendingStreamedFileName` (worker sudah terminate, tak bisa hapus
  sendiri); (d) error/timeout bridge → hapus best-effort yang sama.
  Boot sweep hapus `export-*` >24 jam, bounded 200 entri, tak sentuh file
  baru (milik tab lain yang masih preview).
- Bukti kode: `project-manager.ts` (`discardStreamedExportFile` di 3 titik +
  evict history), `export-worker-bridge.ts` (`discardPendingStreamedFile`
  di cancel/timeout/error/onmessageerror/onerror + error/cancelled pasca-
  handover), `editor-provider.tsx` (sweep saat mount).
- Perintah: `bun test export-streaming-part2.test.ts` → 4 test lifecycle
  (delete removes handover; delete never throws; sweep batas 24 jam; sweep
  never-throw tanpa OPFS) + 1 test kontrak manager lifecycle.
- Hasil: **pass** (OPFS palsu — honest marker: race terminate-vs-hapus
  antar-tab tak diuji).

## R15 — Streamed tidak di-cache (inspect)

- Skenario: `exportHistory` replay hasil untuk opsi identik. Replay streamed
  berbahaya: file OPFS-nya mungkin sudah dihapus (lifecycle) → `fileName`
  dangle. Keputusan: hanya `result.buffer` yang di-cache; streamed selalu
  render ulang. Cache hit (`hasExportContent`) tetap terima dua backing
  untuk hasil aktif.
- Bukti kode: `project-manager.ts` — `if (result.buffer)` guard di tulis
  history; baca hit pakai `hasExportContent`.
- Hasil: tanpa test khusus (jalur ini tercakup test kontrak lifecycle R14
  yang mengassert guard tersebut). Honest marker: eviction streamed tak
  punya test runtime — tak ada streamed di history secara konstruksi.

## R16 — UI streamed: preview + download tanpa salinan (inspect + test,
  static-only)

- Skenario: `ExportResultCard`/`ExportCompletionOverlay` dulu `new Blob([
  result.buffer ])` — dengan streamed tak ada buffer. `createExportPreviewUrl`
  buka `File` OPFS sekali; `URL.createObjectURL(file)` tidak menyalin isi
  ke RAM JS (browser stream dari disk) — satu URL dipakai untuk `<video>`
  preview DAN download (tanpa Blob kedua). Nama download ambil ekstensi
  dari `fileName` temp (container hasil negosiasi, bisa flip mp4→webm).
  Revoke saat unmount dipertahankan + guard race async (URL yang tiba
  setelah unmount langsung di-revoke).
- Bukti kode: `export-button.tsx` — `createExportPreviewUrl`,
  `downloadExportResult`, `isPlayableExportResult`, `filenameForExportResult`.
- Perintah: `bun test export-streaming-part2.test.ts` → "UI supports
  streamed preview/download without buffer copies" (assert kontrak statis).
- Hasil: **pass**. Honest marker: tak ada render React/DOM di test — perilaku
  `<video>` + object URL hanya diverifikasi baca kode.

## R17 — Parallel path tak diubah kecuali trivial (inspect)

- Skenario: segmen worker tetap buffer. Alasan: segmen streamed butuh
  concatenator baca N file OPFS + topology kepemilikan baru (refactor besar
  risiko). Concat **sudah** stream ke OPFS bila didukung
  (`concatenateSegments` → `StreamTarget(tempOutput.stream)`, lalu baca
  balik sekali) — diverifikasi tetap jalan via assert sumber.
- Perubahan trivial yang terpaksa: guard `!result.buffer` di loop segmen
  (`parallel-export.ts`) karena tipe baru membuat `buffer` opsional — tanpa
  ini tsc error (baseline bersih → error dari perubahan tipe Part 2).
- Follow-up terdokumentasi: streamed segmen + concat tanpa baca-balik
  (peak concat saat ini masih ≈1× file sesaat).
- Perintah: `bun test export-streaming-part2.test.ts` → "concat still
  streams to OPFS when supported (no regression)".
- Hasil: **pass**.

## R18 — Keamanan nama file (test, fake OPFS)

- Skenario: `fileName` dari pesan worker mengalir ke `getFileHandle` /
  `removeEntry` — traversal (`../`, `\\`) atau nama asing bisa menyentuh
  file OPFS lain. Guard `isSafeExportTempName` (prefix `export-`, tolak
  `/\\..`, <128 char) di `open` (throw eksplisit) dan `delete`/sweep
  (silent no-op — cleanup tak boleh menutupi hasil export). Ekstensi download
  di-allow-list (`streamedExportFileExtension`: hanya `.webm`, sisanya
  `.mp4`).
- Perintah: `bun test export-streaming-part2.test.ts` → traversal test +
  allow-list test.
- Hasil: **pass**.

## R19 — Fix tsc + regresi (test)

- Skenario: baseline tsc bersih; perubahan Part 2 memunculkan 6 error:
  predikat `isPlayableExportResult` (binding-pattern tak boleh jadi type
  predicate), 3× `ExportResult | null` di props card, 1× possibly-null,
  1× `ArrayBuffer | undefined` di loop segmen. Fix: predikat positional +
  narrow via gate, guard `!result.buffer` paralel. Tak ada `any`, tak ada
  pelemahan test.
- Perintah:
  - `bun test --isolate` 5 file renderer tersentuh → **29 pass, 0 fail**
    (98 expect).
  - `bun run test` (full, repo root) → **829 pass, 0 fail** (2625 expect,
    163 file).
  - `bunx biome check --write` 9 file tersentuh (8 file auto-fix format/
    import-order, logika tak berubah — diverifikasi via `git diff`).
  - `bunx tsc --noEmit` (dari `apps/web`) → **bersih**.
- Hasil: **pass** semua.

## R20 — Honest gaps (tanpa klaim lebih)

1. **Tanpa uji browser nyata** (OPFS worker sungguhan, file >RAM,
   `<video>` preview, download antar-tab): suite memakai OPFS palsu +
   assert kontrak statis. Angka peak-RAM di atas adalah model desain, bukan
   pengukuran.
2. **Race antar-tab**: sweep menyimpan file <24 jam, tapi dua tab yang
   export bersamaan + satu crash sebelum handover bisa orphans <24 jam
   sampai sweep berikutnya — bounded, self-healing, diterima.
3. **Concat masih baca-balik** `arrayBuffer()` sekali (peak sesaat ≈1×
   file) — follow-up terdokumentasi di R17.
4. **Streamed tak di-cache** (R15): export berulang opsi sama selalu render
   ulang — tradeoff anti-dangle yang disengaja.
5. **Drive tak terdampak**: `ExportToDriveButton` di card mengupload
   *project* (artpr + media), bukan video hasil export — tak menyentuh
   `result.buffer`/`streamed`, jadi tak perlu wiring streamed. Diverifikasi
   via baca `exportProjectToDrive` (project-only).
6. No deps baru, no commit — sesuai scope.
