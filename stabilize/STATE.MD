# Status Branch

> Perbarui file ini hanya setelah pengguna menyetujui review atau mengatakan "OK".
> Saat pengguna mengatakan "OK", periksa ulang `PROBLEM.MD` dulu (pengguna mungkin telah mengeditnya secara manual) sebelum memperbarui file ini.

## Status Saat Ini

Audit problem 001 dalam antrian. Problem 005 sudah diimplementasikan dan menunggu hand-test manual pengguna di browser. Placeholder problem 003 dan 004 belum ada pekerjaan. Problem 002 selesai penuh.

## Bug yang Sudah Diperbaiki

* **Problem 002** — Fix scroll horizontal modal "What's New" (entri maintenance 006). Dua baris diedit di `apps/web/src/components/whats-new/whats-new-card.tsx` (baris 123 dan 151). Lint dan typecheck lulus. Diverifikasi visual oleh pengguna pada 2026-06-20 09:09 (tidak ada regresi, entri maintenance 007).

## Bug yang Sedang Dikerjakan

* **Problem 001** — Audit alur "What's New" / Changelog. Disetujui 2026-06-20 08:56. Belum ada kode sumber yang disentuh.
* **Problem 005** — Fix console error tab Overlays ("Style property values shouldn't contain a semicolon."). Fix diterapkan pada 2026-06-20 09:18 dengan Strategi A: helper parser di file baru + `overlays.tsx` memakai parser. Lint, typecheck, dan validasi parser lulus. Menunggu hand-test manual pengguna.

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

## Placeholder Problem (belum ada pekerjaan)

* **Problem 003** — Aturan disiplin "add at the top" untuk `WHATS_NEW` (dipecah dari problem 001 Q5).
* **Problem 004** — Pembersihan stub mati `ChangelogNotification` (dipecah dari problem 001 Q6).

## Langkah Berikutnya yang Direkomendasikan

1. **Pengguna hand-test problem 005** — buka tab Overlays di browser dan cek console + tampilan preset.
2. Setelah pengguna mengonfirmasi problem 005 tidak ada regresi, tutup problem 005 sebagai selesai di file governance.
3. **Setelah fix 005 selesai**: mulai audit problem 001 — baca konfigurasi `content-collections` dan `entries/*.md`, tulis temuan inline di `PROBLEM.MD`.
4. Setelah audit 001 selesai, pindah ke placeholder 003/004 sesuai prioritas pengguna.
