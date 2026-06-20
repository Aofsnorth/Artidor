# Status Branch

> Perbarui file ini hanya setelah pengguna menyetujui review atau mengatakan "OK".
> Saat pengguna mengatakan "OK", periksa ulang `PROBLEM.MD` dulu (pengguna mungkin telah mengeditnya secara manual) sebelum memperbarui file ini.

## Status Saat Ini

Audit problem 001 dalam antrian. Problem 005 sudah diimplementasikan dan menunggu hand-test manual pengguna di browser. Problem 006 sudah diimplementasikan dan menunggu hand-test manual pengguna. Problem 007 selesai penuh. Problem 008 audit selesai — §4.1 fisheye shader fix sudah diterapkan dan diverifikasi user; temuan lain menunggu approval. Problem 009 (preview controls + inspector tabs) menunggu review pengguna. Problem 010 selesai penuh. Problem 011 selesai untuk scope Motion awal. Problem 012 selesai penuh. Placeholder problem 003 dan 004 belum ada pekerjaan. Problem 002 selesai penuh.

## Bug yang Sudah Diperbaiki

* **Problem 002** — Fix scroll horizontal modal "What's New" (entri maintenance 006). Dua baris diedit di `apps/web/src/components/whats-new/whats-new-card.tsx` (baris 123 dan 151). Lint dan typecheck lulus. Diverifikasi visual oleh pengguna pada 2026-06-20 09:09 (tidak ada regresi, entri maintenance 007).
* **Problem 007** — Fix storage badge misleading di sidebar editor (entri maintenance 015). Satu file source diedit: `apps/web/src/components/editor/panels/assets/tabbar.tsx`. Label `Free` diubah menjadi `Storage`, tooltip menjelaskan browser storage untuk Artidor bukan SSD/OS free disk, dan formatter sidebar memakai satu desimal untuk GB. Lint, typecheck, runtime DOM check, dan UI anti-slop detector lulus. Diverifikasi aman oleh pengguna pada 2026-06-20 11:47.
* **Problem 008 §4.1** — Fix WGSL fisheye shader (entri maintenance 019). Shader `fisheye.wgsl` di-refactor: UV di-clamp ke `[0, 1]` sebelum `textureSample`, out-of-bounds check dilakukan setelah sampling. WASM rebuilt. Lint, typecheck, build lulus. Diverifikasi oleh pengguna pada 2026-06-20 12:10 — efek terlihat benar.
* **Problem 010** — Fix mobile home AI chat mockup overflow (entri maintenance 021). Tool call cards container diubah dari `max-w-[95%]` ke `w-full min-w-0`, parent `motion.div` ditambahkan `w-full`, individual cards ditambahkan `min-w-0` dan `shrink-0`. Lint dan typecheck lulus. Diverifikasi aman oleh pengguna pada 2026-06-20 12:20.
* **Problem 011** — Performance Motion tab initial optimization (entri maintenance 024). `AnimationPresetItem` dan `PresetIcon` dimemoisasi, apply hook dipindah ke parent `AnimationsView`, preview style/keyframes dimemoisasi, dan What's New entry ditambahkan. Lint/typecheck/build lulus dengan warning lama. Disetujui pengguna pada 2026-06-20.
* **Problem 012** — Keyframe curve editor segment targeting (entri maintenance 027-028). Graph Editor button bisa resolve selected element + playhead segment, expanded keyframe lanes punya segment affordance, keyframe diamond/toggle diperbesar, dan extra margin di keyframe diamond dihapus agar playhead line berada di tengah keyframe. Lint/typecheck/feed-test/build lulus dengan warning lama. Disetujui pengguna pada 2026-06-20.

## Bug yang Sedang Dikerjakan

* **Problem 001** — Audit alur "What's New" / Changelog. Disetujui 2026-06-20 08:56. Belum ada kode sumber yang disentuh.
* **Problem 005** — Fix console error tab Overlays ("Style property values shouldn't contain a semicolon."). Fix diterapkan pada 2026-06-20 09:18 dengan Strategi A: helper parser di file baru + `overlays.tsx` memakai parser. Lint, typecheck, dan validasi parser lulus. Menunggu hand-test manual pengguna.
* **Problem 006** — Fix category chips Sound effects kepotong. Fix sound-only sudah diterapkan dengan horizontal scroll + fade kanan. Lint, typecheck, dan UI anti-slop detector lulus. Menunggu hand-test manual pengguna.
* **Problem 009** — 2 masalah UI di editor: (A) preview controls hover terlalu agresif, (B) inspector tabs perlu horizontal scroll dengan mouse wheel. Menunggu review pengguna dan jawaban §8 Q1–Q3.

## Bug yang Mungkin Perlu Diperiksa Ulang di Masa Depan

* Verifikasi visual problem 005 (jika pengguna menemukan regresi visual saat memeriksa di browser).

## Risiko yang Diketahui

* Per problem 001: audit mungkin menemukan isu `critical` (id entri duplikat, tabrakan localStorage key, atau bug lain). Jika demikian, harus dimasukkan ke `CRITICAL.MD` sebelum fix lain.
* Per problem 005: parser untuk `overlay.css` harus handle multi-deklarasi, `kebab-case` ke `camelCase`, dan `;` di dalam string data URL SVG. Mitigasi: helper kecil + unit test, atau hand-test yang cermat.

## Perubahan Terbaru yang Disetujui

* 2026-06-20 08:47 SEAST — Terjemahan semua file md di `stabilize/` ke bahasa Indonesia (entri maintenance 004).
* 2026-06-20 08:56 SEAST — Problem 001 (audit) dan problem 002 (fix modal) disetujui. Placeholder problem 003 dan 004 dibuat (entri maintenance 005).
* 2026-06-20 09:02 SEAST — Fix problem 002 diterapkan: `overflow-x-hidden` pada container entri dan `min-w-0 break-words` pada span teks (entri maintenance 006).
* 2026-06-20 09:09 SEAST — Problem 002 diverifikasi visual tanpa regresi. Problem 005 (console error Overlays) dicatat (entri maintenance 007).
* 2026-06-20 09:14 SEAST — Jawaban review problem 005 disimpan: Strategi A, helper di file baru, hand-test manual, problem 002 tetap ditutup tanpa screenshot tambahan (entri maintenance 008).
* 2026-06-20 09:18 SEAST — Fix problem 005 diterapkan: `css-parser.ts` baru + `overlays.tsx` memakai `parseCssDeclarations`. Lint, typecheck, dan validasi parser lulus. Menunggu hand-test pengguna (entri maintenance 009).
* 2026-06-20 11:47 SEAST — Problem 007 diverifikasi aman oleh pengguna dan ditutup.
* 2026-06-20 12:05 SEAST — Fix Problem 008 §4.1 (fisheye WGSL shader) diterapkan: UV clamp sebelum `textureSample`, WASM rebuilt. Lint, typecheck, build lulus (entri maintenance 019).
* 2026-06-20 12:10 SEAST — Problem 008 §4.1 diverifikasi oleh pengguna — efek fisheye terlihat benar. Problem 009 (preview controls + inspector tabs) dan Problem 010 (mobile AI chat mockup) dicatat (entri maintenance 020).
* 2026-06-20 12:15 SEAST — Fix Problem 010 (mobile AI chat mockup overflow) diterapkan: tool call cards container `w-full min-w-0`, `shrink-0` pada fixed-width elements. Lint dan typecheck lulus (entri maintenance 021).
* 2026-06-20 12:20 SEAST — Problem 010 diverifikasi aman oleh pengguna dan ditutup. Problem 011 (performance audit Transitions/Motion/Templates) dicatat (entri maintenance 022).
* 2026-06-20 13:05 SEAST — Problem 011 Motion initial optimization diterapkan dan disetujui pengguna (entri maintenance 024–025).
* 2026-06-20 13:35 SEAST — Problem 012 keyframe curve segment targeting + keyframe visual alignment diterapkan dan disetujui pengguna (entri maintenance 027–028).

## Placeholder Problem (belum ada pekerjaan)

* **Problem 003** — Aturan disiplin "add at the top" untuk `WHATS_NEW` (dipecah dari problem 001 Q5).
* **Problem 004** — Pembersihan stub mati `ChangelogNotification` (dipecah dari problem 001 Q6).

## Langkah Berikutnya yang Direkomendasikan

1. **Pengguna review Problem 009** — jawab §8 questions, lalu approve fix yang diusulkan.
2. **Pengguna hand-test problem 005** — buka tab Overlays di browser dan cek console + tampilan preset.
3. **Pengguna hand-test problem 006** — buka Audio → Sound effects dan cek category chips.
4. Lanjutkan remaining Problem 008 findings sesuai prioritas approval pengguna.
5. Setelah itu mulai audit problem 001 atau placeholder 003/004 sesuai prioritas pengguna.
