# Performance Stabilization

> Daftar opportunity peningkatan performa yang **bisa dilakukan di kode** (bukan wishlist kosong).
> Setiap item grounded ke file yang ada, dengan estimasi dampak, biaya, dan risiko.
> Ikuti `RULES.MD`: edit harus kecil, terlingkup, dapat di-review, dan dapat dibalik.

---

## Cara Baca

| Field | Arti |
| --- | --- |
| **Dampak** | High / Medium / Low — efek ke user yang terasa |
| **Risiko** | High / Medium / Low — peluang regresi |
| **Bidang** | Web / Rust / WASM / Shared |
| **Status** | 🟡 Open / 🟢 Applied / ⚪ Rejected |

Status boleh diubah langsung di file ini ketika fix diterapkan; tidak perlu approval terpisah
untuk pencatatan (per RULES.MD §3 catatan TODO).

---

## 1. Save Manager — Re-entrancy Guard yang Hilang

- **Bidang:** Web
- **File:** `apps/web/src/core/managers/save-manager.ts`
- **Dampak:** Medium
- **Risiko:** Low

**Temuan:**
Method `markDirty({ force })` mengabaikan `force=false` ketika `isPaused`, dan `pause()`
tidak memanggil `clearTimer()`. Kombinasi ini: jika `pause()` dipanggil saat `saveTimer`
sedang aktif, timer akan tetap fire setelah `resume()` dan memicu `saveNow()` padahal
bisa jadi pemanggil tidak mengharapkan itu. Selain itu, `queueSave()` membatalkan timer
lalu `setTimeout` baru — itu OK, tapi `isSaving` short-circuit menyebabkan `saveNow()`
yang dipanggil oleh `flush()` melewati `queueSave` (lihat baris `if (this.isSaving) return`),
sehingga panggilan `flush()` kedua saat `isSaving === true` diam-diam no-op tanpa Promise
resolution. Caller bisa menggantung.

**Actionable Fix (kecil, terlingkup):**

1. Di `pause()`: tambahkan `this.clearTimer()` agar timer tidak fire saat paused.
2. Di `flush()`: tunggu `isSaving` selesai, atau queue permintaan dan jalankan setelah
   save yang sedang berjalan selesai. Return `Promise<void>` yang baru yang resolve
   ketika benar-benar selesai.
3. Tambah test di `apps/web/src/core/managers/__tests__/save-manager.test.ts` (sesuai
   pola test yang sudah ada di folder `__tests__/`) untuk skenario:
   - `pause()` + `markDirty()` → tidak fire selama paused
   - `flush()` kedua saat sedang save → tidak no-op diam-diam

**Verifikasi:** `bun run test`, `bunx tsc --noEmit`, smoke test editor.

---

## 2. Playback Timer — Drift pada Long Playback

- **Bidang:** Web
- **File:** `apps/web/src/core/managers/playback-manager.ts`
- **Dampak:** Medium
- **Risiko:** Low

**Temuan:**
Kelas memakai `setTimeout(this.tick, this.computeInterval())` dan menyimpan
`playbackStartWallTime` (baris 16). Pola timer ini rentan drift pada playback panjang
karena setiap `setTimeout` memperkenalkan delay minimum browser (~4ms di modern, tapi
dapat lebih besar di tab background). Hasil: setelah 60 detik playback, playhead
bisa tertinggal 0.5–2 detik. Audio/video sync bisa terputus-putus.

**Actionable Fix (sedang, terlingkup):**

1. Ganti pola timer dengan `requestAnimationFrame` yang di-pause ketika document
   `visibilityState === "hidden"`.
2. Pada setiap frame, hitung `currentTime = playbackStartTime + (now - playbackStartWallTime) * 1000`
   dan reconcile dengan timeline.
3. Pastikan `pause()`/`seek()` meng-update anchor dengan benar.
4. Tambah test untuk: pause/resume cycle tidak menambah drift; seek saat playing
   mengupdate anchor; tab visibility pause tidak menambah drift besar.

**Verifikasi:** buka project 5 menit, play, amati playhead tetap sinkron dengan audio
peak waveform.

---

## 3. `useStorageEstimate` — Polling 30s Berlebihan

- **Bidang:** Web
- **File:** `apps/web/src/hooks/use-storage-estimate.ts`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
Hook melakukan `setInterval(read, 30_000)` tanpa mempertimbangkan tab visibility.
Pada tab background, polling tetap berjalan dan bisa trigger storage warning di
browser. Storage estimate tidak berubah drastis dalam 30 detik kecuali ada operasi
write besar, sehingga polling 30s adalah pemborosan CPU/IO.

**Actionable Fix (kecil, terlingkup):**

1. Hentikan interval ketika `document.visibilityState === "hidden"`.
2. Re-poll segera saat tab menjadi visible (gunakan `visibilitychange` event).
3. Tambah event listener untuk storage mutation (jika didukung — tidak universal;
   fallback ke interval yang lebih panjang 2–5 menit sebagai safety net).
4. Test: tab hide → interval tidak trigger; tab visible → poll immediate.

**Verifikasi:** DevTools Performance tab, idle CPU saat tab background.

---

## 4. IndexedDB Adapter — Transaction Tidak Di-close

- **Bidang:** Web
- **File:** `apps/web/src/services/storage/indexeddb-adapter.ts`
- **Dampak:** Medium
- **Risiko:** Medium

**Temuan:**
Setiap method (`get`, `set`, `remove`) membuka `IDBDatabase` via `getDB()` tanpa
menutupnya. Pattern ini leak koneksi IDB yang bisa memicu `QuotaExceededError`
atau `VersionError` setelah ratusan operasi. Di editor yang sering save (debounce
800ms × 13 subscribe), ratusan transaksi per menit adalah normal.

**Actionable Fix (sedang, terlingkup):**

1. Tambah private field `dbPromise: Promise<IDBDatabase> | null = null` (lazy cache).
2. `getDB()` reuse `dbPromise` jika sudah ada, jika belum buka dan cache.
3. Tambah method `close()` yang di-call saat `SaveManager.stop()` atau di
   `beforeunload` listener.
4. Tambah unit test untuk reuse koneksi (tidak ada leak setelah 1000 operasi).

**Verifikasi:** `bun run test`, stress test editor dengan 1000+ save trigger.

---

## 5. Export MIME Type — HEVC Salah Label

- **Bidang:** Web
- **File:** `apps/web/src/lib/export/mime-types.ts`
- **Dampak:** Low (UX, bukan data loss)
- **Risiko:** Low

**Temuan:**
`EXPORT_MIME_TYPES.hevc = "video/mp4"` benar secara container (HEVC memang dikirim
dalam kontainer MP4), tetapi browser download dialog akan memberi ekstensi `.mp4`
padahal codec-nya HEVC. Beberapa player yang strict terhadap header (mis. older
QuickTime, ffmpeg versi lama dengan flag strict) akan menolak file. Format lain
(label `mp4` → `"video/mp4"`) sudah benar, hanya HEVC yang ambiguous.

**Actionable Fix (kecil, terlingkup):**

1. Tambah codec hint di ekstensi saat user export HEVC, mis. `.hevc.mp4` atau
   `project-2026-06-20-h265.mp4` (lebih portable).
2. Update `EXPORT_FORMAT_EXTENSIONS` menjadi `Record<ExportFormat, string[]>` (array,
   bukan string) untuk akomodasi multi-extension, atau buat helper
   `getExportFilename(format, baseName)`.
3. Update `apps/web/src/components/editor/dialogs/export-dialog.tsx` (jika file
   ini ada) untuk menggunakan helper baru.

**Verifikasi:** Export HEVC, cek nama file di download, coba play di VLC.

---

## 6. Effects/Transitions Registry — Runtime Iteration Tanpa Cache

- **Bidang:** Web
- **File:** `apps/web/src/lib/effects/definitions/index.ts`,
  `apps/web/src/lib/transitions/index.ts`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
58 efek dan 50 transisi di-load sebagai array literal dan di-filter pada setiap
render panel (Effects/Transitions tab). Filter dengan `.filter()` O(n) di setiap
render dengan text input berubah → bisa 50×N iterasi per keystroke. Belum di-memoize.

**Actionable Fix (kecil, terlingkup):**

1. Bungkus logic filter+sort di `useMemo` di komponen `EffectsPanel` /
   `TransitionsPanel`. Dependency: `[searchQuery, categoryFilter]`.
2. Pertimbangkan Map<id, definition> untuk lookup per-render.
3. Tambah test untuk panel yang me-render dengan query panjang tanpa jank.

**Verifikasi:** Buka Effects tab, type cepat di search, amati DevTools Performance
— render time harus < 16ms per keystroke.

---

## 7. WASM pkg — Refresh Setelah Rust Edit

- **Bidang:** WASM
- **File:** `rust/wasm/pkg/`, `rust/wasm/Cargo.toml`
- **Dampak:** High (jika lupa rebuild, build Vercel ship WASM basi)
- **Risiko:** Low (workflow, bukan runtime)

**Temuan:**
README workflow sudah benar: `bun run build:wasm` lalu commit. Tapi tidak ada CI
check yang memverifikasi `rust/wasm/pkg/` sesuai dengan `rust/wasm/src/` saat ini.
Kontributor bisa commit perubahan Rust tanpa rebuild WASM, sehingga Vercel ship
WASM basi yang tidak match dengan source Rust.

**Actionable Fix (sedang, governance):**

1. Tambah CI job di `.github/workflows/ci.yml` yang:
   - Build WASM ke directory temp
   - Diff dengan `rust/wasm/pkg/` yang ter-commit
   - Fail jika berbeda, dengan pesan "Run `bun run build:wasm` and commit"
2. Opsional: tambah pre-commit hook (Husky/lefthook) yang menjalankan script
   `scripts/verify-wasm-fresh.sh`.
3. Tambah dokumentasi di `rust/wasm/README.md` (jika ada) atau `PUBLISH.md`.

**Verifikasi:** PR dengan perubahan Rust tapi tanpa rebuild → CI merah.

---

## 8. Storage Card Refresh — Tidak Real-time

- **Bidang:** Web
- **File:** `apps/web/src/components/editor/panels/assets/tabbar.tsx`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
Storage card di sidebar editor me-render nilai `freeBytes` dari `useStorageEstimate`
yang polling tiap 30 detik. User bisa import file besar 500MB dan tidak melihat
perubahan angka sampai 30 detik kemudian. Missleading: user mengira import gagal
atau ada bug.

**Actionable Fix (kecil, terlingkup):**

1. Panggil `read()` dari `useStorageEstimate` setelah operasi write besar (import
   media, export, save project). Ekspos `refresh` dari hook.
2. Di `MediaManager.importFile` setelah commit, panggil `refresh()`.
3. Tambah test: mock storage estimate, panggil import, expect refresh dipanggil.

**Verifikasi:** Import file 200MB, amati storage card update dalam 1 detik.

---

## 9. Frame Interpolation — Tab Uncommitted

- **Bidang:** Web
- **File:** `apps/web/src/lib/frame-interpolation/`,
  `apps/web/src/components/editor/panels/properties/tabs/frame-interpolation-tab.tsx`
- **Dampak:** High (fitur yang sudah selesai tapi belum di-commit)
- **Risiko:** Medium

**Temuan:**
Per PROGRESS_SUMMARY.md §"Sedang Dikerjakan", frame interpolation (slow-mo: blend /
optical-flow / AI RIFE) sudah ada di working tree tapi belum di-commit dan belum ada
entri What's New. Sebelumnya ada syntax error di `types.ts:145` yang sudah diperbaiki
(linter/kamu perbaiki), tapi **belum ada build verification akhir**.

**Actionable Fix (di-commit, bukan rewrite):**

1. `cd "C:\Users\Arthe\Documents\MyProject\Artidor" && bunx biome check --write apps/web/src/lib/frame-interpolation/ apps/web/src/components/editor/panels/properties/`
2. `bunx tsc --noEmit` di `apps/web` → harus bersih
3. `bun run build` → harus "Compiled successfully"
4. Tambah entri "What's New" di `apps/web/src/lib/whats-new/feed.ts` (per RULES.MD §10)
5. Commit + push (per workflow di memory)

**Verifikasi:** build sukses, What's New feed valid, slow-mo preview di editor work.

---

## 10. Pre-existing Biome Warnings — Cleanup

- **Bidang:** Web
- **File:** `procedural-preview.ts`, `overlays.tsx`, `stickers.tsx`, `transitions.tsx`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
4 warning pre-existing yang sudah tercatat di MAINTENANCE.MD dan PROBLEM.MD:

- `procedural-preview.ts` non-null assertion
- `overlays.tsx` unused `getOverlayPhotoUrl` (pre-existing, BUKAN dari fix problem 005)
- `stickers.tsx` unused `photoUrl`
- `transitions.tsx` unused `hashString`

**Actionable Fix (kecil, terlingkup):**

1. `procedural-preview.ts`: ganti `!` non-null dengan optional chaining + early return
   atau explicit error.
2. Tiga unused: jika memang tidak terpakai, hapus. Jika akan terpakai nanti, prefix
   dengan `_` (konvensi Biome) atau `// biome-ignore: ...`.
3. Re-run `bun run lint:web` harus 0 warning.

**Verifikasi:** lint clean, typecheck clean, no regression.

---

## Out of Scope (Tercatat Tapi Tidak Bisa Diubah di Kode)

| Item | Alasan |
| --- | --- |
| Add FFmpeg pipeline | Perubahan arsitektur besar, bukan stabilization (lihat FFmpeg-OPTIONS.md) |
| Replace wgpu dengan WebGPU native | Rust core change, governance protected |
| Switch dari IndexedDB ke OPFS | Migrasi storage, governance protected |
| Hapus better-auth | Auth sensitive, governance protected |
| Native mobile shell | Platform baru, bukan stabilization |
| Brand redesign | ROADMAP.md melarang major UI redesign |

---

## Cara Menambah Item Baru

1. Tambahkan entry di bawah "Open" section dengan field yang sudah ditentukan.
2. Jangan implementasikan sebelum ada approval (per RULES.MD §2).
3. Setelah disetujui dan diterapkan, ubah status ke 🟢 Applied dan link ke commit.
4. Update `MAINTENANCE.MD` dengan entri kronologis.
