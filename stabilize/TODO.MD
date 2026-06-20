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
* [ ] **Fix category chips Sound effects kepotong** (problem 006, dilaporkan 2026-06-20 09:32). Laporan problem sudah ditulis. Menunggu review pengguna dan jawaban §8.

## Menunggu Review Pengguna

_(kosong — implementasi problem 005 sudah disetujui dan diterapkan)_

* **Problem 006 di `PROBLEM.MD`** — laporan category chips Sound effects kepotong. Pengguna harus menjawab §8 Q1–Q5 sebelum fix diusulkan.

## Menunggu Tindakan Pengguna

* [ ] **Hand-test problem 005 di browser** — buka tab Overlays, pastikan console bersih dari `Style property values shouldn't contain a semicolon.`, overlay preset tetap tampil normal, dan tidak ada regresi visual.

## Tugas yang Selesai

* Setup dan terjemahan di atas.
* Problem 001 — laporan lingkup audit disetujui.
* Problem 002 — laporan fix modal disetujui, fix diterapkan, diverifikasi visual tanpa regresi.
* Problem 005 — akar penyebab dikonfirmasi dan laporan problem ditulis.
* Problem 005 — implementasi Strategi A diterapkan; lint, typecheck, dan validasi parser lulus.
* Problem 006 — akar penyebab awal dibaca secara read-only dan laporan problem ditulis.

## Tugas yang Tertunda (diantrikan)

* [ ] **Problem 001**: tulis temuan audit inline di `PROBLEM.MD` (di bawah §8 jawaban) dan sajikan kepada pengguna.
* [ ] **Problem 005**: setelah pengguna hand-test dan mengonfirmasi tidak ada regresi, tutup problem sebagai selesai di `PROBLEM.MD`, `STATE.MD`, `TODO.MD`, dan `MAINTENANCE.MD`.
* [ ] **Problem 006**: setelah pengguna review dan memilih strategi, usulkan diff kecil, tunggu approval implementasi, lalu terapkan fix.
* [ ] **Setelah audit 001 selesai**: untuk setiap temuan non-kritis, usulkan fix kecil yang terlingkup dan tunggu persetujuan per-fix.
* [ ] **Setiap temuan `critical`**: masukkan ke `CRITICAL.MD` dan langsung di-surface.

## Placeholder Problem (menunggu dimulainya pekerjaan)

* [ ] **Problem 003** — Aturan disiplin "add at the top" untuk `WHATS_NEW` (dipecah dari problem 001 Q5). Placeholder sudah dibuat di `PROBLEM.MD`.
* [ ] **Problem 004** — Pembersihan stub mati `ChangelogNotification` (dipecah dari problem 001 Q6). Placeholder sudah dibuat di `PROBLEM.MD`.

## Tugas yang Terblokir

* Tidak ada.

## Tugas yang Tidak Boleh Dimulai Dulu

* Edit apa pun pada file `apps/` di luar `whats-new-card.tsx` (sudah selesai) dan `overlays.tsx` (untuk problem 005 setelah strategi disetujui).
* Edit apa pun pada `sounds.tsx` atau `category-bar.tsx` untuk problem 006 sampai pengguna mereview problem dan menyetujui strategi.
* Edit apa pun pada file markdown `apps/web/src/lib/changelog/entries/*.md` content collection.
* Test apa pun di bawah `tests/` untuk subsistem ini sampai pengguna mengatakan "OK".
* Pekerjaan apa pun pada problem 003 atau 004 sampai pengguna siap untuk memulainya.
