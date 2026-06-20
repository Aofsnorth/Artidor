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
* [ ] **Fix console error tab Overlays** (problem 005, dilaporkan 2026-06-20 09:09). Akar penyebab terkonfirmasi: `apps/web/src/components/editor/panels/assets/views/overlays.tsx` baris 509 menggunakan `overlay.css` (string deklarasi penuh) sebagai nilai `background` di React inline style. Menunggu review laporan problem dan keputusan strategi fix (Q1–Q5 di §8).

## Menunggu Review Pengguna

* **Problem 005 di `PROBLEM.MD`** — laporan console error Overlays. Pengguna harus menjawab §8 Q1 (strategi fix: A/B/C), Q2 (lokasi helper), Q3 (unit test), Q4 (verifikasi headless), dan Q5 (sudah cukup untuk menutup problem 002).

## Tugas yang Selesai

* Setup dan terjemahan di atas.
* Problem 001 — laporan lingkup audit disetujui.
* Problem 002 — laporan fix modal disetujui, fix diterapkan, diverifikasi visual tanpa regresi.
* Problem 005 — akar penyebab dikonfirmasi dan laporan problem ditulis.

## Tugas yang Tertunda (diantrikan)

* [ ] **Problem 001**: tulis temuan audit inline di `PROBLEM.MD` (di bawah §8 jawaban) dan sajikan kepada pengguna.
* [ ] **Problem 005**: setelah strategi disetujui, terapkan fix (kemungkinan besar di `overlays.tsx` saja dengan helper parser), jalankan lint + typecheck, verifikasi visual.
* [ ] **Setelah audit 001 selesai**: untuk setiap temuan non-kritis, usulkan fix kecil yang terlingkup dan tunggu persetujuan per-fix.
* [ ] **Setiap temuan `critical`**: masukkan ke `CRITICAL.MD` dan langsung di-surface.

## Placeholder Problem (menunggu dimulainya pekerjaan)

* [ ] **Problem 003** — Aturan disiplin "add at the top" untuk `WHATS_NEW` (dipecah dari problem 001 Q5). Placeholder sudah dibuat di `PROBLEM.MD`.
* [ ] **Problem 004** — Pembersihan stub mati `ChangelogNotification` (dipecah dari problem 001 Q6). Placeholder sudah dibuat di `PROBLEM.MD`.

## Tugas yang Terblokir

* Tidak ada.

## Tugas yang Tidak Boleh Dimulai Dulu

* Edit apa pun pada file `apps/` di luar `whats-new-card.tsx` (sudah selesai) dan `overlays.tsx` (untuk problem 005 setelah strategi disetujui).
* Edit apa pun pada file markdown `apps/web/src/lib/changelog/entries/*.md` content collection.
* Test apa pun di bawah `tests/` untuk subsistem ini sampai pengguna mengatakan "OK".
* Pekerjaan apa pun pada problem 003 atau 004 sampai pengguna siap untuk memulainya.
