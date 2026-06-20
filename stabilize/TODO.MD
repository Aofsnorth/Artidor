# TODO

> Memperbarui file ini tidak memerlukan persetujuan pengguna.
> Item baru ditambahkan saat pekerjaan ditemukan. Item yang selesai disimpan untuk ketertelusuran.

## Setup

* [x] Buat folder `stabilize/`.
* [x] Buat `RULES.MD` dengan aturan alur kerja branch.
* [x] Buat `MAINTENANCE.MD` dan tambahkan entri pertama yang mencakup prompt awal ini.
* [x] Buat `STATE.MD` yang diinisialisasi ke "Belum dimulai / menunggu problem pertama yang disetujui".
* [x] Buat `TODO.MD` yang diinisialisasi dengan daftar tugas setup.
* [x] Buat `PROBLEM.MD` dengan template kosong.
* [x] Buat `CRITICAL.MD` dengan template kosong.
* [x] Menunggu review pengguna atas enam file tata kelola.
* [x] Terjemahkan semua file md di `stabilize/` ke bahasa Indonesia.
* [x] Review dan persetujuan problem 001 + 002 diproses.
* [x] **Problem 002 selesai**: fix scroll horizontal modal "What's New" diterapkan, lint + typecheck lulus, diverifikasi visual oleh pengguna pada 2026-06-20 09:09 (tidak ada regresi).

## Sedang Dikerjakan

* [ ] **Audit alur "What's New" / Changelog** (problem 001, disetujui 2026-06-20 08:56). Lingkup dikonfirmasi: baca konfigurasi `content-collections` dan `entries/*.md`, gunakan severity `critical | bug | risk | note`, hasil inline di `PROBLEM.MD`. Q5 dan Q6 dipecah ke problem 003 dan 004. Temuan belum ditulis.
* [ ] **Fix console error tab Overlays** (problem 005, dilaporkan 2026-06-20 09:09). Fix diterapkan dengan Strategi A: helper parser di file baru + `overlays.tsx` memakai parser. Lint, typecheck, dan validasi parser terhadap 161 overlay lulus. Menunggu hand-test manual pengguna di browser.
* [ ] **Fix category chips Sound effects kepotong** (problem 006, dilaporkan 2026-06-20 09:32). Fix sound-only sudah diterapkan dengan horizontal scroll + fade kanan. Lint, typecheck, dan UI anti-slop detector lulus. Menunggu hand-test manual pengguna di browser.
* [ ] **Audit menyeluruh website/app Artidor** (problem 008, dilaporkan 2026-06-20 11:50). Audit selesai: lint, typecheck, build, test runner, runtime browser check. 7 temuan tercatat (1 critical, 2 high, 2 medium, 2 low). **§4.1 Fisheye shader fix sudah diterapkan dan diverifikasi user (2026-06-20 12:10).** Temuan lain menunggu approval.
* [ ] **Fix WGSL fisheye shader** (problem 008 §4.1, disetujui 2026-06-20 12:05). Shader fix diterapkan di `rust/crates/effects/src/shaders/fisheye.wgsl`: `textureSample` dipindahkan sebelum conditional block dengan UV clamp. WASM rebuild selesai. Lint, typecheck, build lulus. **Diverifikasi user pada 2026-06-20 12:10 — efek terlihat benar. ✅ Selesai.**
* [ ] **Preview controls hover + Inspector tabs horizontal scroll** (problem 009, dilaporkan 2026-06-20 12:10). 2 masalah UI di editor: (A) kontrol preview muncul terlalu agresif saat hover, (B) inspector tab row perlu horizontal scroll dengan mouse wheel. Audit source awal selesai. Menunggu review pengguna dan jawaban §8 Q1–Q3.
* [x] **Mobile home AI chat mockup overflow** (problem 010, dilaporkan 2026-06-20 12:10). Fix diterapkan: tool call cards container diubah dari `max-w-[95%]` ke `w-full min-w-0`, parent `motion.div` ditambahkan `w-full`, individual cards ditambahkan `min-w-0` dan `shrink-0` pada elemen fixed-width. Lint dan typecheck lulus. **Diverifikasi aman oleh pengguna pada 2026-06-20 12:20. ✅ Selesai.**
* [x] **Performance audit: Transitions, Motion, Templates tabs** (problem 011, dilaporkan 2026-06-20 12:20). Implementasi awal Motion selesai dan disetujui pengguna: `AnimationPresetItem`/`PresetIcon` dimemoisasi, hook apply dipindah ke parent, preview style/keyframes dimemoisasi, What's New ditambahkan. Lint/typecheck/build lulus dengan warning lama. ✅ Selesai untuk scope Motion awal.
* [x] **Keyframe curve editor button locked saat playhead berada di segment valid** (problem 012, dilaporkan 2026-06-20 13:20). Fix diterapkan dan disetujui pengguna: Graph Editor fallback berbasis selected element + playhead segment, timeline lane segment affordance, larger/centered keyframe icons, What's New entries. Lint/typecheck/feed-test/build lulus dengan warning lama. ✅ Selesai.

## Menunggu Review Pengguna

* [ ] **Problem 008 di `PROBLEM.MD`** — laporan audit menyeluruh website/app. Pengguna harus menjawab §8 Q1–Q5 sebelum fix apa pun diusulkan.

## Menunggu Tindakan Pengguna

* [ ] **Hand-test problem 005 di browser** — buka tab Overlays, pastikan console bersih dari `Style property values shouldn't contain a semicolon.`, overlay preset tetap tampil normal, dan tidak ada regresi visual.
* [ ] **Hand-test problem 006 di browser** — buka Audio → Sound effects, pastikan category chips tidak kepotong, bisa horizontal scroll, fade kanan terlihat rapi, search bar + filter icon tetap sejajar, dan sound list tetap scroll normal.

## Tugas yang Selesai

* Setup dan terjemahan di atas.
* Problem 001 — laporan lingkup audit disetujui.
* Problem 002 — laporan fix modal disetujui, fix diterapkan, diverifikasi visual tanpa regresi.
* Problem 005 — akar penyebab dikonfirmasi dan laporan problem ditulis.
* Problem 005 — implementasi Strategi A diterapkan; lint, typecheck, dan validasi parser lulus.
* Problem 006 — akar penyebab awal dibaca secara read-only dan laporan problem ditulis.
* Problem 006 — jawaban review disimpan: Strategi B, horizontal scroll, perlu fade, cek semua pemakai `CategoryBar`, verifikasi manual.
* Problem 006 — implementasi sound-only diterapkan di `sounds.tsx`; shared `CategoryBar` tidak diubah; lint, typecheck, dan UI anti-slop detector lulus.
* Problem 007 — source awal dibaca secara read-only dan laporan problem audit storage badge ditulis.
* Problem 007 — jawaban review Q1–Q6 dicatat; audit source + runtime dilakukan; hasil penting dicatat di `PROBLEM.MD`.
* Problem 007 — fix UI copy/formatting diterapkan hanya di `tabbar.tsx`; lint, typecheck, runtime check, dan UI anti-slop detector lulus.
* Problem 007 — diverifikasi aman oleh pengguna pada 2026-06-20 11:47 dan ditutup.
* Problem 011 — implementasi awal Motion diterapkan dan disetujui pengguna; lint/typecheck/build lulus dengan warning lama.
* Problem 012 — Graph Editor keyframe segment fallback + timeline segment affordance + keyframe visual alignment diterapkan dan disetujui pengguna; lint/typecheck/feed-test/build lulus dengan warning lama.

## Tugas yang Tertunda (diantrikan)

* [ ] **Problem 001**: tulis temuan audit inline di `PROBLEM.MD` (di bawah §8 jawaban) dan sajikan kepada pengguna.
* [ ] **Problem 005**: setelah pengguna hand-test dan mengonfirmasi tidak ada regresi, tutup problem sebagai selesai di `PROBLEM.MD`, `STATE.MD`, `TODO.MD`, dan `MAINTENANCE.MD`.
* [ ] **Problem 006**: setelah pengguna hand-test dan mengonfirmasi tidak ada regresi, tutup problem sebagai selesai di `PROBLEM.MD`, `STATE.MD`, `TODO.MD`, dan `MAINTENANCE.MD`.
* [ ] **Setelah audit 001 selesai**: untuk setiap temuan non-kritis, usulkan fix kecil yang terlingkup dan tunggu persetujuan per-fix.
* [ ] **Setiap temuan `critical`**: masukkan ke `CRITICAL.MD` dan langsung di-surface.

## Placeholder Problem (menunggu dimulainya pekerjaan)

* [ ] **Problem 003** — Aturan disiplin "add at the top" untuk `WHATS_NEW` (dipecah dari problem 001 Q5). Placeholder sudah dibuat di `PROBLEM.MD`.
* [ ] **Problem 004** — Pembersihan stub mati `ChangelogNotification` (dipecah dari problem 001 Q6). Placeholder sudah dibuat di `PROBLEM.MD`.

## Tugas yang Terblokir

* Tidak ada.

## Tugas yang Tidak Boleh Dimulai Dulu

* Edit apa pun pada file `apps/` di luar `whats-new-card.tsx` (sudah selesai), `overlays.tsx` (problem 005 sudah diterapkan), `sounds.tsx` (problem 006 sudah diterapkan), dan `tabbar.tsx` (problem 007 sudah diterapkan).
* Edit lanjutan pada `sounds.tsx` atau `category-bar.tsx` untuk problem 006 sampai pengguna hand-test dan melaporkan hasil.
* Edit lanjutan pada `apps/web/src/components/editor/panels/assets/tabbar.tsx`, `apps/web/src/hooks/use-storage-estimate.ts`, atau storage/quota files untuk problem 007 sampai pengguna hand-test dan melaporkan hasil.
* Edit apa pun pada file markdown `apps/web/src/lib/changelog/entries/*.md` content collection.
* Test apa pun di bawah `tests/` untuk subsistem ini sampai pengguna mengatakan "OK".
* Pekerjaan apa pun pada problem 003 atau 004 sampai pengguna siap untuk memulainya.
