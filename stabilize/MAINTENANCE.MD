# Log Maintenance

File ini adalah log maintenance kronologis untuk branch `stabilize`. Setiap entri harus faktual, diberi tanggal, dan dapat dilacak. Entri baru ditambahkan di bawah.

---

## Entri 001 — Inisialisasi branch

* **Tanggal / waktu:** 2026-06-20 07:55 SEAST
* **Ringkasan permintaan pengguna:**
  Buat folder `stabilize/` dan enam file tata kelola (`RULES.MD`, `MAINTENANCE.MD`, `STATE.MD`, `TODO.MD`, `PROBLEM.MD`, `CRITICAL.MD`). Tetapkan aturan alur kerja untuk branch stabilisasi yang fokus pada pengurangan bug, keamanan, dan perubahan AI yang terkontrol. Inisialisasi setiap file, catat instruksi awal ini sebagai entri maintenance pertama, dan berhenti untuk review pengguna sebelum pekerjaan stabilisasi dimulai.
* **Tindakan yang diambil:**
  * Membuat direktori `stabilize/` di root repository.
  * Menulis `RULES.MD` dengan tujuan branch, aturan persetujuan, pembatasan edit, area sensitif, persyaratan testing, aturan perilaku AI, urutan prioritas, dan alur kerja standar.
  * Menulis `MAINTENANCE.MD` ini dengan entri saat ini sebagai catatan log pertama.
  * Menginisialisasi `STATE.MD` ke "Belum dimulai / menunggu problem pertama yang disetujui".
  * Menginisialisasi `TODO.MD` dengan daftar tugas setup.
  * Menginisialisasi `PROBLEM.MD` dengan template kosong.
  * Menginisialisasi `CRITICAL.MD` dengan template kosong.
  * Berhenti dan menyerahkan kembali ke pengguna untuk review.
* **File yang dibuat / diperbarui:**
  * `stabilize/RULES.MD` (baru)
  * `stabilize/MAINTENANCE.MD` (baru)
  * `stabilize/STATE.MD` (baru)
  * `stabilize/TODO.MD` (baru)
  * `stabilize/PROBLEM.MD` (baru)
  * `stabilize/CRITICAL.MD` (baru)
* **Persetujuan pengguna diperlukan:** Tidak. Entri ini mencakup setup awal yang diminta dalam prompt asli.
* **Status:** Menunggu review pengguna atas enam file tata kelola. Belum ada pekerjaan stabilisasi yang dimulai.

---

## Entri 002 — Pencatatan problem audit "What's New" / Changelog

* **Tanggal / waktu:** 2026-06-20 08:02 SEAST
* **Ringkasan permintaan pengguna:**
  Audit alur notifikasi "What's New" / changelog, fokus pada `apps/web/src/app/changelog/page.tsx` dan `apps/web/src/lib/whats-new/feed.ts`, untuk menilai stabilitas, keamanan, dan kebenaran di delapan area fokus spesifik. Pengguna secara eksplisit melarang pengeditan kode sumber, penerapan fix, atau pembaruan `STATE.MD` pada tahap ini. Deliverable untuk entri ini adalah laporan problem itu sendiri; temuan audit adalah langkah selanjutnya.
* **Tindakan yang diambil:**
  * Membaca kedua file in-scope secara penuh dan file-file adjacent yang berpartisipasi dalam alur yang sama (`utils.ts`, `release.tsx`, `changelog-notification.tsx`, `[version]/page.tsx`, `whats-new-card.tsx`, `whats-new-store.ts`, `app/page.tsx`, ditambah dua halaman yang masih mengimpor no-op `ChangelogNotification`).
  * Menulis `stabilize/PROBLEM.MD` dengan laporan terstruktur lengkap untuk problem 001 (laporan asli, interpretasi, acceptance criteria, actionable tasks, definition of done, file yang terlibat, risiko, enam pertanyaan review).
  * Memperbarui `stabilize/TODO.MD` dengan tugas audit dan review laporan problem yang menunggu.
  * Tidak menyentuh `STATE.MD` (sesuai instruksi pengguna).
  * Tidak menyentuh file sumber apa pun di bawah `apps/`.
  * Berhenti dan meminta pengguna untuk mereview laporan problem dan mengatakan "OK" sebelum temuan audit ditulis.
* **File yang dibuat / diperbarui:**
  * `stabilize/PROBLEM.MD` (diperbarui — problem 001 diisi)
  * `stabilize/TODO.MD` (diperbarui)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — pengguna harus mereview laporan problem dan mengatakan "OK" sebelum temuan audit dihasilkan. Entri ini mencatat prompt, bukan fix.
* **Status:** Menunggu review pengguna atas `PROBLEM.MD` problem 001. Temuan audit belum ditulis.

---

## Entri 003 — Pencatatan problem scroll horizontal "What's New"

* **Tanggal / waktu:** 2026-06-20 08:14 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna melaporkan bahwa modal "What's New" memungkinkan scrolling horizontal pada kontennya; seharusnya hanya mengizinkan scrolling vertikal. Teks harus wrap ke lebar modal, tidak ada teks yang boleh terpotong, dan layout harus tetap rapi di ukuran layar kecil/mobile. Pengguna mencantumkan `apps/web/src/app/changelog/page.tsx`, `apps/web/src/lib/whats-new/feed.ts`, dan file komponen "What's New" terkait apa pun. Pengguna secara eksplisit melarang pengeditan kode sumber pada tahap ini dan meminta problem ditulis ulang ke `PROBLEM.MD` dengan acceptance criteria, actionable tasks, DoD, risiko, dan pertanyaan review, ditambah pembaruan `MAINTENANCE.MD` dan `TODO.MD`, kemudian berhenti untuk review.
* **Tindakan yang diambil:**
  * Membaca ulang `apps/web/src/components/whats-new/whats-new-card.tsx` dan `apps/web/src/stores/whats-new-store.ts` untuk mendasari interpretasi.
  * Membaca ulang entri yang relevan di `apps/web/src/lib/whats-new/feed.ts` untuk mengidentifikasi string panjang yang tidak dapat dipecah (path file, identifier) yang dapat mendorong modal melewati lebarnya.
  * Menulis problem 002 di `stabilize/PROBLEM.MD` dengan laporan terstruktur lengkap (laporan asli bahasa Indonesia dipertahankan verbatim, interpretasi, acceptance criteria, actionable tasks, DoD, file yang terlibat, risiko, enam pertanyaan review).
  * Memperbarui `stabilize/TODO.MD` untuk mencatat problem 002 sebagai menunggu review pengguna.
  * Tidak menyentuh `STATE.MD`.
  * Tidak mengedit file sumber apa pun di bawah `apps/`.
  * Tidak menerapkan fix.
  * Berhenti dan meminta pengguna untuk mereview laporan problem dan menjawab pertanyaan §8 sebelum fix apa pun diusulkan.
* **File yang dibuat / diperbarui:**
  * `stabilize/PROBLEM.MD` (diperbarui — problem 002 ditambahkan)
  * `stabilize/TODO.MD` (diperbarui)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — pengguna harus mereview problem 002 di `PROBLEM.MD` dan menjawab §8 Q1–Q6 sebelum perubahan kode sumber apa pun diusulkan.
* **Status:** Menunggu review pengguna atas `PROBLEM.MD` problem 002.

---

## Entri 004 — Terjemahan semua file md di `stabilize/` ke bahasa Indonesia

* **Tanggal / waktu:** 2026-06-20 08:47 SEAST
* **Ringkasan permintaan pengguna:**
  Ubah bahasa percakapan kita ke bahasa Indonesia saja, dan ubah juga semua file md di folder `stabilize/` menjadi bahasa Indonesia saja.
* **Tindakan yang diambil:**
  * Menerjemahkan `RULES.MD`, `MAINTENANCE.MD`, `STATE.MD`, `TODO.MD`, dan `CRITICAL.MD` ke bahasa Indonesia.
  * Menerjemahkan bagian AI (interpretasi, acceptance criteria, actionable tasks, DoD, file yang terlibat, risiko, pertanyaan review) di `PROBLEM.MD` ke bahasa Indonesia.
  * **Mempertahankan bagian "Laporan Asli Pengguna" (Original User Report) secara verbatim dalam bahasa aslinya**, karena template problem menentukan bahwa itu adalah kutipan langsung. Problem 001 tetap dalam bahasa Inggris (sesuai prompt asli), problem 002 tetap dalam bahasa Indonesia (sesuai prompt asli). Jika pengguna ingin laporan asli juga diterjemahkan, ini akan direvisi atas permintaan.
  * Mempertahankan istilah teknis umum dalam bahasa Inggris (mis. `file path`, `typecheck`, `lint`, `localStorage`, `Zustand`, `Next.js`, `React`, `CSS`, `JSX`, `Tailwind`, dll.) yang merupakan praktik standar dalam penulisan teknis berbahasa Indonesia.
* **File yang dibuat / diperbarui:**
  * `stabilize/RULES.MD` (diterjemahkan)
  * `stabilize/MAINTENANCE.MD` (diterjemahkan + entri ini)
  * `stabilize/STATE.MD` (diterjemahkan)
  * `stabilize/TODO.MD` (diterjemahkan)
  * `stabilize/PROBLEM.MD` (bagian AI diterjemahkan; kutipan asli tetap)
  * `stabilize/CRITICAL.MD` (diterjemahkan)
* **Persetujuan pengguna diperlukan:** Tidak — ini adalah terjemahan sesuai permintaan eksplisit.
* **Status:** Selesai. Respons berikutnya akan dalam bahasa Indonesia.

---

## Entri 005 — Pengguna mereview dan menyetujui problem 001 + 002

* **Tanggal / waktu:** 2026-06-20 08:56 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyatakan sudah mereview dan menyetujui laporan problem di `PROBLEM.MD`, serta telah menjawab semua pertanyaan §8 untuk problem 001 dan problem 002 langsung di dalam file (jawaban ditambahkan ke setiap Q1–Q6).
* **Tindakan yang diambil:**
  * Membaca ulang `PROBLEM.MD` (aturan: sebelum memperbarui `STATE.MD`, periksa dulu apakah pengguna mengeditnya secara manual) dan mengonfirmasi bahwa pengguna memang menambahkan balasan ke setiap pertanyaan §8 untuk kedua problem.
  * Memperbarui status problem 001 dan problem 002 di `PROBLEM.MD` dari "Menunggu review" menjadi "Disetujui" dengan tanggal dan waktu.
  * Membuat placeholder problem 003 (aturan disiplin "add at the top" untuk `WHATS_NEW`) dan problem 004 (pembersihan stub mati `ChangelogNotification`) sesuai jawaban "Dipecah" untuk Q5 dan Q6 problem 001.
  * Memperbarui `TODO.MD` dan `STATE.MD` untuk mencerminkan status baru.
  * Tidak menyentuh `apps/`.
* **File yang dibuat / diperbarui:**
  * `stabilize/PROBLEM.MD` (diperbarui — status 001/002 + placeholder 003/004)
  * `stabilize/TODO.MD` (diperbarui)
  * `stabilize/STATE.MD` (diperbarui)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Tidak — entri ini hanya mencatat persetujuan dan jawaban yang sudah diberikan di `PROBLEM.MD`.
* **Status:** Problem 001 (audit) dan problem 002 (fix modal "What's New") sekarang disetujui dan menunggu langkah selanjutnya dari AI (audit / usul fix). Placeholder problem 003 dan 004 dibuat, belum ada pekerjaan.

### Ringkasan Jawaban Pengguna

**Problem 001:**
* Q1 (batas ruang lingkup, termasuk `content-collections` config + `entries/*.md`?) — **Iya** (termasuk).
* Q2 (skema severity `critical | bug | risk | note`?) — **Iya** (pakai).
* Q3 (deliverable inline ke `PROBLEM.MD` atau pesan terpisah?) — **Iya** (inline).
* Q4 (lintas-sistem disengaja?) — **Iya, disengaja**.
* Q5 (aturan disiplin "add at the top" — di sini atau dipecah?) — **Dipecah** → problem 003.
* Q6 (stub mati `ChangelogNotification` — di sini atau dipecah?) — **Dipecah** → problem 004.

**Problem 002:**
* Q1 (permukaan mana yang memiliki bug?) — **a) hanya modal "What's New"**.
* Q2 (entri mana yang memicu?) — **Entri pertama** (yang berisi path file panjang `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts`).
* Q3 (di mana diamati?) — **Browser desktop dan mobile**.
* Q4 (halaman publik `/changelog` juga terpengaruh?) — **Tidak** (di luar lingkup).
* Q5 (layer fix — boleh edit `feed.ts`?) — **Dapat diterima**.
* Q6 (defense in depth — tambah `overflow-x-hidden`?) — **Iya**.

---

## Entri 006 — Fix problem 002 diterapkan dan diverifikasi

* **Tanggal / waktu:** 2026-06-20 09:02 SEAST
* **Ringkasan permintaan pengguna:**
  "Terapkan ke fix 002" — pengguna menyetujui usulan fix CSS-only untuk problem 002.
* **Tindakan yang diambil:**
  * **Edit 1** di `apps/web/src/components/whats-new/whats-new-card.tsx` baris 123 — tambahkan `overflow-x-hidden` pada container entri (defense in depth, sesuai jawaban Q6):
    * Sebelum: `<div className="flex max-h-[52vh] flex-col gap-4 overflow-y-auto scrollbar-hidden px-4 py-4">`
    * Sesudah: `<div className="flex max-h-[52vh] flex-col gap-4 overflow-x-hidden overflow-y-auto scrollbar-hidden px-4 py-4">`
  * **Edit 2** di file yang sama baris 151 — tambahkan `min-w-0` dan `break-words` pada `<span>` teks di setiap item daftar:
    * Sebelum: `<span className="text-[12px] leading-relaxed text-white/60">`
    * Sesudah: `<span className="min-w-0 break-words text-[12px] leading-relaxed text-white/60">`
  * `apps/web/src/lib/whats-new/feed.ts` **tidak disentuh** (hipotesis A cukup; fix murni CSS).
  * Menjalankan `bun run lint:web` (`biome lint apps/web/src --max-diagnostics=1000`) — lulus tanpa error baru. 4 warning pre-existing ada di file yang tidak terkait (`stickers.tsx`, `transitions.tsx`) dan bukan akibat perubahan ini.
  * Menjalankan `bunx tsc --noEmit` di `apps/web` — lulus dengan exit code 0, tanpa error TypeScript.
  * Tidak ada test file untuk `whats-new-card.tsx` (tidak ada `whats-new*.test.*` atau `whats-new*.spec.*` di repo), sehingga test otomatis tidak dijalankan.
  * **Verifikasi visual browser belum dilakukan** oleh AI — harus dilakukan oleh pengguna pada dev server. Langkah yang diperlukan: jalankan `bun run dev:web` (atau `cd apps/web && bun run dev`), buka `/` di viewport desktop (1440×900) dan mobile (375×812), buka modal "What's New", scroll dan amati: (a) tidak ada scrollbar horizontal pada modal atau container entri; (b) path file panjang di entri pertama wrap dengan rapi; (c) scroll vertikal tetap berfungsi; (d) tombol trigger, chip tag, dot, header, dan footer tidak regresi.
* **File yang disentuh:**
  * `apps/web/src/components/whats-new/whats-new-card.tsx` (2 baris diedit)
* **File yang diperbarui di `stabilize/`:**
  * `stabilize/PROBLEM.MD` (status problem 002 diperbarui ke "Selesai")
  * `stabilize/STATE.MD` (problem 002 dipindahkan ke "Bug yang Sudah Diperbaiki")
  * `stabilize/TODO.MD` (problem 002 dipindahkan ke "Tugas yang Selesai")
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Sudah diberikan (prompt "Terapkan ke fix 002").
* **Status:** Fix diterapkan, lint dan typecheck lulus. Verifikasi visual oleh pengguna tertunda.

---

## Entri 007 — Verifikasi visual problem 002 oleh pengguna + problem 005 dicatat

* **Tanggal / waktu:** 2026-06-20 09:09 SEAST
* **Ringkasan permintaan pengguna:**
  * "Saya sudah verifikasi dan tidak ada regresi" — pengguna mengkonfirmasi bahwa fix modal "What's New" (problem 002) telah diverifikasi secara visual di browser tanpa regresi.
  * Problem baru (005): tab `Overlays` memunculkan banyak console error (~128 issues) dengan error utama `Style property values shouldn't contain a semicolon.`. Next.js menunjuk ke `apps/web/src/components/editor/panels/assets/views/overlays.tsx` line ~546–547 (saat render `<OverlayItem key={preset.id} preset={preset} />`). Pengguna meminta problem ditulis ulang ke `PROBLEM.MD` dengan interpreted problem, acceptance criteria, actionable tasks, DoD, files involved, risks, dan questions for review. Tidak ada edit source code dulu. Ikuti rules `stabilize/`.
* **Tindakan yang diambil:**
  * **Problem 002 ditutup**: status di `PROBLEM.MD` diperbarui dari "menunggu verifikasi visual" menjadi "Selesai" (diverifikasi 2026-06-20 09:09, tidak ada regresi). Fix dua baris di `apps/web/src/components/whats-new/whats-new-card.tsx` (baris 123 dan 151) sudah final.
  * **Problem 005 dicatat**: dilakukan pembacaan kode untuk konfirmasi akar penyebab.
    * `apps/web/src/lib/presets/overlays.ts` mendefinisikan 161 entry dengan field `css` sebagai string deklarasi CSS penuh (mis. `"background: radial-gradient(...);"`, `"background-color: transparent;"`, atau multi-deklarasi `"background-image: ...; background-size: ...;"`, termasuk juga `box-shadow` + `background` di Neon, dan `mask:` di Halftone, serta `url("data:image/svg+xml;utf8,...")` dengan `;` di dalam string di Paper).
    * `apps/web/src/components/editor/panels/assets/views/overlays.tsx` baris 509 menulis `previewStyle: { background: overlay.css }`, menggabungkan string deklarasi penuh sebagai **nilai** property `background` di React inline style. React memvalidasi nilai property dan menolak string yang mengandung `;` atau `:`, memunculkan warning per render.
    * Entry `previewStyle` lain di file yang sama (lines 82, 98, 114, ..., 305, 474, 492) sudah benar — `background: <value only>`. Baris 509 adalah satu-satunya jalur yang menggunakan `overlay.css` (string deklarasi) sebagai nilai.
    * Penelusuran dependency: `Overlay.css` di `apps/web/src/lib/presets/types.ts` (baris 115) hanya dipakai di `overlays.tsx` (terkonfirmasi via grep — tidak ada barrel export, tidak ada consumer lain). Mengubah consumer aman tanpa migrasi.
  * `PROBLEM.MD` diperbarui: status problem 002 + problem 005 lengkap di §8.
  * `TODO.MD` diperbarui: problem 002 sepenuhnya selesai, problem 005 dalam antrian.
  * `STATE.MD` diperbarui: status branch baru.
  * `apps/` tidak disentuh.
* **File yang disentuh:**
  * `apps/` — tidak ada.
* **File yang diperbarui di `stabilize/`:**
  * `stabilize/PROBLEM.MD` (status 002 diperbarui + problem 005 ditambahkan)
  * `stabilize/TODO.MD` (diperbarui)
  * `stabilize/STATE.MD` (diperbarui)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Problem 005 menunggu review atas laporan problem dan jawaban §8 sebelum fix apa pun diusulkan.
* **Status:** Problem 002 selesai. Problem 005 dalam antrian, menunggu review dan keputusan strategi fix.

---

## Entri 008 — Jawaban review problem 005 disimpan

* **Tanggal / waktu:** 2026-06-20 09:14 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menjawab pertanyaan §8 problem 005 dan meminta jawaban tersebut disimpan di `PROBLEM.MD`.
* **Jawaban pengguna:**
  * Q1 — **A**: pakai Strategi A, parser di consumer.
  * Q2 — **File baru**: helper dibuat di file baru, bukan inline di `overlays.tsx`.
  * Q3 — **Hand-test aja**: tidak tambah unit test untuk parser.
  * Q4 — **Manual aja aku di browser**: verifikasi visual dilakukan manual oleh pengguna di browser.
  * Q5 — **Cukup tutup dengan konfirmasi tidak ada regresi**: problem 002 ditutup tanpa capture screenshot tambahan.
* **Tindakan yang diambil:**
  * Menyimpan jawaban Q1–Q5 ke `stabilize/PROBLEM.MD` problem 005 §8.
  * Memperbarui status problem 005 di `PROBLEM.MD`: strategi fix dikonfirmasi, tetapi fix belum diterapkan.
  * Memperbarui `TODO.MD` dan `STATE.MD` agar langkah berikutnya adalah meminta persetujuan implementasi Strategi A.
  * Tidak menyentuh source code di `apps/`.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/STATE.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — sebelum membuat file helper baru dan mengubah `overlays.tsx`, pengguna perlu memberi approval implementasi.
* **Status:** Problem 005 siap untuk usulan diff / implementasi Strategi A setelah approval eksplisit.

---

## Entri 009 — Fix problem 005 diterapkan, menunggu hand-test pengguna

* **Tanggal / waktu:** 2026-06-20 09:18 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna mengatakan "OK terapkan problem 005", menyetujui implementasi Strategi A untuk console error tab Overlays.
* **Tindakan yang diambil:**
  * Membuat file helper baru `apps/web/src/lib/presets/css-parser.ts`.
  * Helper `parseCssDeclarations(css: string)` mengubah string deklarasi CSS menjadi `React.CSSProperties`:
    * split deklarasi pada `;` top-level;
    * skip `;` di dalam tanda kutip dan dalam `url(...)` / function parentheses;
    * split property/value pada `:` top-level;
    * konversi `kebab-case` menjadi React camelCase (`background-color` → `backgroundColor`, `box-shadow` → `boxShadow`, `background-size` → `backgroundSize`).
  * Mengubah `apps/web/src/components/editor/panels/assets/views/overlays.tsx`:
    * import `parseCssDeclarations` dari `@/lib/presets/css-parser`;
    * ganti `previewStyle: { background: overlay.css }` menjadi `previewStyle: parseCssDeclarations(overlay.css)`.
  * Tidak mengubah `apps/web/src/lib/presets/overlays.ts` (161 data entry tidak disentuh).
  * Tidak mengubah `apps/web/src/lib/presets/types.ts` (`Overlay.css: string` tidak diubah).
  * Tidak menambahkan unit test, sesuai jawaban pengguna (`hand-test aja`).
* **Verifikasi otomatis:**
  * `bun run lint:web` — lulus tanpa error baru. Ada 4 warning pre-existing:
    * `procedural-preview.ts` non-null assertion;
    * `overlays.tsx` unused `getOverlayPhotoUrl` (pre-existing, bukan akibat fix ini, tidak disentuh karena di luar scope);
    * `stickers.tsx` unused `photoUrl`;
    * `transitions.tsx` unused `hashString`.
  * `bunx tsc --noEmit` di `apps/web` — lulus, exit code 0.
  * Validasi parser terhadap seluruh 161 overlay:
    * `count: 161`;
    * `empty: 0` (tidak ada overlay yang menghasilkan style kosong);
    * `trailing: 0` (tidak ada value yang masih berakhir dengan `;`);
    * property yang ditemukan: `background`, `backgroundColor`, `backgroundImage`, `backgroundSize`, `boxShadow`, `mask`.
* **File source yang disentuh:**
  * `apps/web/src/lib/presets/css-parser.ts` (baru)
  * `apps/web/src/components/editor/panels/assets/views/overlays.tsx`
* **File governance yang diperbarui:**
  * `stabilize/PROBLEM.MD` (status problem 005)
  * `stabilize/TODO.MD`
  * `stabilize/STATE.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Sudah diberikan untuk implementasi. Masih menunggu hand-test manual pengguna di browser sesuai jawaban Q4.
* **Status:** Fix diterapkan dan automated checks lulus. Problem 005 belum ditutup sampai pengguna melakukan hand-test visual dan mengonfirmasi tidak ada regresi.

---

## Entri 010 — Problem 006 dicatat: category chips Sound effects kepotong

* **Tanggal / waktu:** 2026-06-20 09:32 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna melaporkan bahwa di tab `Audio` bagian `Sound effects`, category chips di bawah search bar terlihat kepotong di sisi kanan. Contoh: kategori seperti `Amb...` tidak tampil penuh. Expected behavior: chips tidak boleh kepotong; overflow harus ditangani rapi dengan horizontal scroll atau wrap; teks kategori tetap terbaca; layout tidak keluar container; tampilan rapi di layar kecil; search bar dan filter icon tetap sejajar. Pengguna meminta problem ditulis ke `PROBLEM.MD`, update `MAINTENANCE.MD` dan `TODO.MD`, lalu stop untuk review. Source code tidak boleh diedit dulu.
* **Tindakan yang diambil:**
  * Membaca `apps/web/src/components/editor/panels/assets/views/sounds.tsx` secara read-only:
    * `SOUND_CATEGORIES` line 39–50 berisi `Ambient` dan kategori lainnya.
    * search row + filter icon line 255–293.
    * `CategoryBar` instance untuk Sound effects line 295–306.
  * Membaca `apps/web/src/components/editor/panels/assets/views/category-bar.tsx` secara read-only:
    * container horizontal scroll line 29–34.
    * chip button styling line 38–50.
  * Menulis problem 006 lengkap di `PROBLEM.MD` dengan interpretasi, acceptance criteria, actionable tasks, DoD, files likely involved, risks, dan questions for review.
  * Memperbarui `TODO.MD` dengan problem 006 yang menunggu review.
  * Tidak mengubah `STATE.MD` karena problem 006 belum direview/approved.
  * Tidak menyentuh source code di `apps/`.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (problem 006 ditambahkan)
  * `stabilize/TODO.MD` (problem 006 ditambahkan)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — problem 006 menunggu review pengguna dan jawaban §8 sebelum fix diusulkan.
* **Status:** Menunggu review pengguna atas problem 006.

---

## Entri 011 — Fix problem 006 diterapkan, menunggu hand-test pengguna

* **Tanggal / waktu:** 2026-06-20 09:42 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui problem 006 dengan jawaban: Strategi B (fix khusus Sound effects), horizontal scroll, perlu fade, cek semua pemakai `CategoryBar`, dan verifikasi manual oleh pengguna di browser.
* **Tindakan yang diambil:**
  * Menyimpan jawaban Q1–Q5 problem 006 ke `stabilize/PROBLEM.MD`.
  * Mengubah hanya `apps/web/src/components/editor/panels/assets/views/sounds.tsx`.
  * Membungkus instance Sound effects `CategoryBar` dengan container `relative min-w-0 max-w-full overflow-hidden`.
  * Memberi class khusus pada instance tersebut: `w-full min-w-0 max-w-full scroll-smooth pr-8`.
  * Menambahkan fade kanan `pointer-events-none` dengan gradient `from-background to-transparent` sebagai affordance horizontal scroll.
  * Tidak mengubah shared `apps/web/src/components/editor/panels/assets/views/category-bar.tsx`.
  * Mengecek semua pemakai `<CategoryBar`: `adjustments.tsx`, `animations.tsx`, `effects.tsx`, `filters.tsx`, `overlays.tsx`, `sounds.tsx`, `templates.tsx`, `text.tsx`, `transitions.tsx`.
* **Verifikasi otomatis:**
  * `bun run lint:web` — lulus tanpa error baru. Ada 4 warning pre-existing: `procedural-preview.ts` non-null assertion, `overlays.tsx` unused `getOverlayPhotoUrl`, `stickers.tsx` unused `photoUrl`, `transitions.tsx` unused `hashString`.
  * `bunx tsc --noEmit` di `apps/web` — lulus, tanpa output/error.
  * Designer anti-slop detector pada `apps/web/src/components/editor/panels/assets/views/sounds.tsx` — tidak ada anti-pattern terdeteksi.
  * Designer project context check melaporkan `NO_PRODUCT_MD`; file `PRODUCT.md` tidak dibuat karena di luar scope stabilisasi dan akan memperbesar perubahan tidak terkait.
* **File source yang disentuh:**
  * `apps/web/src/components/editor/panels/assets/views/sounds.tsx`
* **File governance yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `stabilize/STATE.MD` — sesuai instruksi, tidak diperbarui sampai pengguna hand-test dan approve problem 006.
  * `apps/web/src/components/editor/panels/assets/views/category-bar.tsx` — shared component tidak diubah untuk menghindari regresi lintas tab.
* **Persetujuan pengguna diperlukan:** Sudah diberikan untuk implementasi. Masih menunggu hand-test manual pengguna di browser.
* **Status:** Fix problem 006 diterapkan dan automated checks lulus. Problem belum ditutup sampai pengguna mengonfirmasi hasil manual tanpa regresi.

---

## Entri 012 — Problem 007 dicatat: audit storage badge `2 GB FREE`

* **Tanggal / waktu:** 2026-06-20 09:46 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna melaporkan bahwa sidebar kiri bawah editor menampilkan storage info `2 GB FREE`, sementara SSD perangkat sekitar 500GB dengan sisa fisik 60–80GB. Pengguna meminta audit apakah angka tersebut hardcoded, browser storage quota, IndexedDB/local app storage quota, plan/free tier label, atau bug/misinformation. Pengguna meminta problem ditulis ke `PROBLEM.MD`, update `MAINTENANCE.MD` dan `TODO.MD`, lalu stop untuk review. Source code tidak boleh diedit dulu.
* **Tindakan yang diambil:**
  * Membaca aturan `stabilize/RULES.MD` dan status file governance saat ini.
  * Melakukan pencarian read-only untuk `2 GB`, `2GB`, `GB FREE`, `storage`, `quota`, `free`, `usage`, `availableBytes`, `freeBytes`, `navigator.storage`, dan `storage.estimate`.
  * Membaca source kandidat secara read-only:
    * `apps/web/src/components/editor/panels/assets/tabbar.tsx` — `StorageCard` di sidebar editor.
    * `apps/web/src/hooks/use-storage-estimate.ts` — hook yang memakai `navigator.storage.estimate()`.
    * `apps/web/src/services/storage/quota.ts` — helper quota/capacity browser storage.
    * `apps/web/src/services/storage/service.ts` — storage service dan support checks.
    * `apps/web/src/hooks/use-storage-persistence.ts` dan `storage-persistence-dialog.tsx` — browser storage persistence UX.
    * `apps/web/src/app/projects/stats-overview.tsx` — penggunaan storage estimate di halaman Projects.
    * `apps/web/src/lib/media/processing.ts`, `media-manager.ts`, dan `add-media-asset.ts` — user-facing quota error path.
  * Menulis problem 007 lengkap di `PROBLEM.MD` dengan interpretasi, acceptance criteria, actionable tasks, DoD, files likely involved, risks, dan questions for review.
  * Memperbarui `TODO.MD` dengan problem 007 yang menunggu review.
  * Tidak mengubah `STATE.MD`.
  * Tidak menyentuh source code di `apps/`.
* **Temuan awal read-only, belum final audit:**
  * Literal `2 GB FREE` tidak ditemukan di app source.
  * Badge sidebar tampaknya mengambil angka dari `navigator.storage.estimate()` melalui `useStorageEstimate()`, lalu menampilkan `quota - usage` sebagai label `Free`.
  * Risiko utama yang perlu diaudit: label `Free` bisa dibaca sebagai free disk/SSD OS, padahal Storage Estimate API melaporkan browser/origin storage estimate.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (problem 007 ditambahkan)
  * `stabilize/TODO.MD` (problem 007 ditambahkan)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — problem 007 menunggu review pengguna dan jawaban §8 sebelum audit lanjutan atau fix apa pun diusulkan.
* **Status:** Menunggu review pengguna atas problem 007. Tidak ada source code yang diedit.

---

## Entri 013 — Aturan pertanyaan review dibuat fleksibel dan via chat

* **Tanggal / waktu:** 2026-06-20 09:49 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna meminta `RULES.MD` ditambah aturan bahwa jumlah pertanyaan review tidak harus enam; boleh kurang atau lebih sesuai kebutuhan. Pengguna juga meminta pertanyaan dikirim langsung di chat, lalu jawaban pengguna langsung dicatat.
* **Tindakan yang diambil:**
  * Menambahkan aturan di `stabilize/RULES.MD` §2 bahwa jumlah pertanyaan review fleksibel.
  * Menambahkan aturan bahwa pertanyaan review harus dikirim juga di chat.
  * Menambahkan aturan bahwa setelah pengguna menjawab di chat, AI harus langsung mencatat jawaban tersebut ke `PROBLEM.MD` sebelum melanjutkan.
  * Memperbarui workflow umum di `RULES.MD` §8 agar mencerminkan alur tanya-jawab via chat dan pencatatan jawaban.
  * Tidak menyentuh source code di `apps/`.
  * Tidak mengubah `STATE.MD` karena ini perubahan aturan governance, bukan penyelesaian problem/fix aplikasi.
* **File yang diperbarui:**
  * `stabilize/RULES.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Tidak — perubahan ini diminta langsung oleh pengguna.
* **Status:** Selesai.

---

## Entri 014 — Audit runtime/source problem 007 selesai, menunggu approval fix

* **Tanggal / waktu:** 2026-06-20 11:34 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui problem 007, menjawab Q1–Q6, meminta runtime verification jika memungkinkan (`await navigator.storage.estimate()`), membandingkan `quota`, `usage`, `quota - usage`, dan displayed sidebar value, lalu meminta laporan audit + proposed minimal fix/diff plan tanpa source edit. Pengguna juga meminta update `MAINTENANCE.MD` dan `TODO.MD`, tidak update `STATE.MD`, dan stop menunggu approval sebelum edit source.
* **Tindakan yang diambil:**
  * Membaca ulang `stabilize/PROBLEM.MD` problem 007.
  * Mencatat jawaban Q1–Q6 pengguna ke `PROBLEM.MD` sesuai aturan baru.
  * Melakukan audit source read-only pada:
    * `apps/web/src/components/editor/panels/assets/tabbar.tsx`
    * `apps/web/src/hooks/use-storage-estimate.ts`
    * `apps/web/src/services/storage/quota.ts`
    * `apps/web/src/services/storage/service.ts`
    * `apps/web/src/services/storage/indexeddb-adapter.ts`
    * `apps/web/src/services/storage/opfs-adapter.ts`
    * `apps/web/src/services/storage/types.ts`
    * `apps/web/src/hooks/use-storage-persistence.ts`
    * `apps/web/src/components/editor/dialogs/storage-persistence-dialog.tsx`
    * `apps/web/src/app/projects/stats-overview.tsx`
    * `apps/web/src/lib/media/processing.ts`
    * `apps/web/src/core/managers/media-manager.ts`
    * `apps/web/src/lib/commands/media/add-media-asset.ts`
  * Mencari literal/istilah terkait `2 GB`, `2GB`, `GB FREE`, `storage`, `quota`, `free`, `usage`, `availableBytes`, `freeBytes`, `navigator.storage`, `storage.estimate`, `plan`, `tier`, `subscription`, dan `storage limit`.
  * Mencoba memuat `agent-browser` sesuai skill browser automation, tetapi CLI tidak tersedia (`agent-browser: command not found`), lalu memakai Playwright fallback.
  * Mencoba menjalankan `bun run dev:web`; command gagal karena dev server Next.js lain sudah berjalan dan lock `.next/dev/lock` aktif. Server aktif di `http://localhost:3000` digunakan untuk runtime verification.
  * Membuka `/projects`, membuat project lokal sementara via UI agar editor/sidebar muncul, lalu membuka `/editor/986246ae-800e-4d21-826a-5c3cd9bf8b9c`.
  * Mengevaluasi `await navigator.storage.estimate()` di browser.
  * Mencatat ringkasan audit penting ke `PROBLEM.MD` §9.
  * Memperbarui `TODO.MD` untuk status problem 007.
  * Tidak mengubah source code di `apps/`.
  * Tidak mengubah `STATE.MD`.
* **Runtime result:**
  * Browser: Chrome 149 on Windows, via Playwright.
  * `quota = 10,737,730,167 bytes` (`10.737730167 GB`).
  * `usage = 311,927 bytes` (`0.000311927 GB`).
  * `quota - usage = 10,737,418,240 bytes` (`10.73741824 GB`).
  * Sidebar displayed value = `11 GB` dengan label `FREE`.
  * Tooltip = `1 MB used of 11 GB available`.
  * `usageDetails.indexedDB = 311,927 bytes`.
  * `navigator.storage.persisted() = false`.
* **Kesimpulan audit:**
  * Angka storage badge bukan literal hardcoded dan bukan plan/free tier label.
  * Angka berasal dari browser Storage Estimate API (`quota - usage`) melalui `useStorageEstimate()`.
  * Angka tersebut bukan free SSD/OS disk space.
  * Kalkulasi runtime sesuai code, tetapi label `Free` misleading karena tidak menjelaskan konteks browser/app storage.
  * Rounding integer GB juga dapat misleading; nilai `1.6 GB` atau `2.4 GB` akan tampil sebagai `2 GB`.
* **Proposed minimal fix plan, belum diterapkan:**
  * Scope hanya `apps/web/src/components/editor/panels/assets/tabbar.tsx`.
  * Ubah label bawah dari `Free` menjadi `App storage` atau `Browser storage`.
  * Ubah tooltip agar menjelaskan browser storage available untuk site/app ini dan bukan SSD/OS free disk space.
  * Pakai formatter lokal yang lebih presisi untuk sidebar badge, misalnya satu desimal untuk rentang GB kecil (`1.6 GB`, `2.4 GB`, `10.7 GB`) tanpa mengubah shared `use-storage-estimate.ts` atau halaman Projects.
* **File governance yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `apps/` source code — belum ada approval edit.
  * `stabilize/STATE.MD` — sesuai instruksi pengguna.
* **Persetujuan pengguna diperlukan:** Ya — menunggu approval rencana fix sebelum source edit.
* **Status:** Audit selesai. Fix belum diterapkan.

---

## Entri 015 — Fix problem 007 diterapkan, menunggu hand-test pengguna

* **Tanggal / waktu:** 2026-06-20 11:43 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui hasil audit problem 007 dan meminta minimal fix diterapkan. Batasan: edit source hanya `apps/web/src/components/editor/panels/assets/tabbar.tsx`; jangan ubah `use-storage-estimate.ts`, Projects `Local storage`, storage/quota logic, area sensitif, atau `STATE.MD`. Fix harus berupa UI copy/formatting: label `Free` menjadi `Storage`, tooltip menjelaskan browser storage untuk Artidor bukan SSD/OS free disk, dan nilai GB memakai satu desimal.
* **Tindakan yang diambil:**
  * Membaca ulang `stabilize/PROBLEM.MD` problem 007 sebelum edit.
  * Mengubah hanya `apps/web/src/components/editor/panels/assets/tabbar.tsx`.
  * Menghapus import `formatStorageSize` dari `@/hooks/use-storage-estimate`; tetap memakai `useStorageEstimate`.
  * Menambahkan helper lokal `formatSidebarStorageSize(bytes)` di `tabbar.tsx`.
  * Mengubah `freeLabel` agar memakai formatter lokal satu desimal untuk GB.
  * Mengubah tooltip dari `used of available` menjadi copy eksplisit: browser storage available untuk Artidor pada device ini, bukan SSD/OS free disk space.
  * Mengubah visible label dari `Free` menjadi `Storage`.
  * Mengecilkan label text dan menambahkan `whitespace-nowrap` agar tetap compact di card sidebar lebar 58px.
  * Tidak mengubah `apps/web/src/hooks/use-storage-estimate.ts`.
  * Tidak mengubah halaman Projects atau storage/quota logic.
  * Tidak menyentuh area sensitif.
  * Tidak mengubah `STATE.MD`.
* **Verifikasi otomatis/manual cepat:**
  * `bun run lint:web` — lulus tanpa error baru. 4 warning pre-existing tetap ada: `procedural-preview.ts` non-null assertion, `overlays.tsx` unused `getOverlayPhotoUrl`, `stickers.tsx` unused `photoUrl`, `transitions.tsx` unused `hashString`.
  * `bunx tsc --noEmit` di `apps/web` — lulus, tanpa output/error.
  * Designer anti-slop detector pada `apps/web/src/components/editor/panels/assets/tabbar.tsx` — tidak ada anti-pattern terdeteksi.
  * Runtime DOM check di editor dev server aktif: card text `10.7 GB\nSTORAGE`, tooltip `10.7 GB browser storage available to Artidor on this device. 1 MB used of 10.7 GB quota. This is not your SSD/OS free disk space.`, card rect `58px × 58.796875px`.
  * Artifact Playwright `.playwright-mcp/` yang dibuat otomatis sudah dibersihkan.
* **File source yang disentuh:**
  * `apps/web/src/components/editor/panels/assets/tabbar.tsx`
* **File governance yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `apps/web/src/hooks/use-storage-estimate.ts`
  * `apps/web/src/app/projects/stats-overview.tsx`
  * storage/quota service files
  * `stabilize/STATE.MD`
* **Persetujuan pengguna diperlukan:** Sudah diberikan untuk implementasi. Masih menunggu hand-test manual pengguna di browser sebelum problem ditutup.
* **Status:** Fix diterapkan dan checks lulus. Problem belum ditutup sampai pengguna mengonfirmasi hasil manual tanpa regresi.

---

## Entri 016 — Problem 007 diverifikasi aman dan ditutup

* **Tanggal / waktu:** 2026-06-20 11:47 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna mengonfirmasi fix problem 007 aman, lalu meminta audit menyeluruh website/app Artidor.
* **Tindakan yang diambil:**
  * Memperbarui status problem 007 di `PROBLEM.MD` menjadi selesai.
  * Memindahkan problem 007 dari daftar aktif/menunggu hand-test di `TODO.MD` ke tugas selesai.
  * Memperbarui `STATE.MD` karena pengguna sudah mengonfirmasi hasil manual aman.
  * Tidak mengubah source code aplikasi untuk entri ini.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/STATE.MD`
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Tidak — pengguna sudah memberi konfirmasi aman.
* **Status:** Problem 007 selesai penuh.

---

## Entri 017 — Audit menyeluruh website/app Artidor (Problem 008)

* **Tanggal / waktu:** 2026-06-20 11:50 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna meminta audit seluruh website/app Artidor untuk mencari bug, masalah UX, error console, layout rusak, dan kemungkinan penyebab lag/performance issue. Scope: seluruh halaman utama, editor, assets panel, audio, overlays, effects, transitions, timeline, preview/player, inspector, sidebar, modals/popups, changelog, console errors, layout overflow, render lag, unnecessary re-render, heavy components, memory leak risk, expensive loops, unnecessary API calls, broken responsive layout. Rules: tidak edit source code dulu, jangan langsung fix semua, jangan tambah fitur baru, jangan rewrite besar-besaran.
* **Tindakan yang diambil:**
  * Menutup Problem 007 sebagai verified safe di `PROBLEM.MD`, `TODO.MD`, `STATE.MD`.
  * Inventory struktur: `apps/web/src/app/` (14 routes), `components/editor/` (100+ files), `hooks/` (55+ files), `services/` (storage, renderer, scripting, transcription, video-cache).
  * Menjalankan `bun run lint:web` — lulus, 4 warning pre-existing.
  * Menjalankan `bunx tsc --noEmit` — lulus bersih.
  * Menjalankan `bun run build:web` — lulus (Next.js 16.1.3 Turbopack).
  * Menjalankan `bun run test` — **gagal**: Bun test runner crash memuat Playwright `test.describe()` dari `e2e/` folder. Unit test di `services/storage/migrations/__tests__/` berjalan normal.
  * Runtime browser audit via Playwright MCP:
    * Home (`/`) — 0 error, 0 warning.
    * Projects (`/projects`) — 2× Databuddy 402 error.
    * Editor (default) — 2× Databuddy 402, 2 warning (powerPreference Windows, LCP image).
    * Editor → Overlays — bersih.
    * Editor → Effects — 5 warning baru: WGSL shader `fisheye` gagal compile (`textureSample` di non-uniform control flow), effect fallback ke source.
    * Editor → Transitions — bersih.
    * Editor → Audio — 2× Freesound API 500 error.
    * Editor → Templates — bersih.
    * Editor → Settings — bersih.
    * Changelog (`/changelog`) — 2× Databuddy 402.
    * Blog (`/blog`) — 1× Databuddy 402.
  * Grep source untuk `setInterval`, `setTimeout`, `requestAnimationFrame`, `useEffect`, `useMemo`, `useCallback` — pola timer/RAF terlihat dikelola dengan cleanup di most hooks.
  * Inspect `use-editor.ts` — menggunakan `useSyncExternalStore` + shallow equality + selector pattern untuk mengurangi re-render. Arsitektur solid.
  * Inspect `timeline/index.tsx` (57KB, 1716 lines) — file besar tapi terstruktur dengan `useMemo` dan `useCallback`.
  * Inspect `fisheye.wgsl` — konfirmasi bug: `textureSample` dipanggil di dalam `if` block (non-uniform control flow).
* **Temuan (7 total):**
  * **CRITICAL:** WGSL shader `fisheye` gagal compile (Rust/WASM + WebGPU area sensitif).
  * **HIGH:** Freesound API 500 error (Audio tab).
  * **HIGH:** Databuddy analytics 402 error (semua halaman).
  * **MEDIUM:** Test runner crash (`bun run test` memuat Playwright files).
  * **MEDIUM:** LCP image missing `loading="eager"` (editor header logo).
  * **LOW:** WebGPU `powerPreference` ignored on Windows (Chromium upstream bug).
  * **LOW:** 4 lint warnings (unused variables + non-null assertion).
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (Problem 008 ditambahkan)
  * `stabilize/TODO.MD` (Problem 008 ditambahkan)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `stabilize/STATE.MD` — sesuai instruksi, tidak diperbarui sampai pengguna review dan approve audit.
  * Semua source code di `apps/` — sesuai instruksi, tidak ada fix yang diterapkan.
* **Persetujuan pengguna diperlukan:** Ya — pengguna harus review temuan dan menjawab §8 Q1–Q5 sebelum fix apa pun diusulkan.
* **Status:** Audit selesai. Menunggu review pengguna dan persetujuan prioritas fix.

---

## Entri 018 — Aturan baru: update "What's New" setelah implementasi fix

* **Tanggal / waktu:** 2026-06-20 12:00 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna meminta aturan baru: setelah AI menerapkan fix/fitur di branch stabilisasi, AI juga wajib menambahkan entri ke file "What's New" (`apps/web/src/lib/whats-new/feed.ts`) untuk bagian fixed/improved.
* **Tindakan yang diambil:**
  * Menambahkan **§10. Pembaruan "What's New"** ke `RULES.MD` dengan detail:
    * Wajib tambah entri setelah implementasi fix (bukan audit saja).
    * Tag yang digunakan: `"fix"`, `"improvement"`, `"performance"`.
    * Format entri: `id` (YYYY-MM-DD-slug), `date`, `title`, `items[]`.
    * Posisi: selalu di atas array `WHATS_NEW`.
    * Tidak perlu persetujuan terpisah (bagian dari langkah implementasi).
    * Pengecualian: perubahan governance (RULES.MD, MAINTENANCE.MD, dll) tidak perlu entri.
  * Memperbarui **§8. Alur Kerja untuk Tugas Umum** langkah 8 menjadi langkah update "What's New", langkah 9 menjadi update `STATE.MD`.
  * Tidak menyentuh source code di `apps/`.
  * Tidak mengubah `STATE.MD`.
* **File yang diperbarui:**
  * `stabilize/RULES.MD` (section 8 workflow update + section 10 baru)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Tidak — ini perubahan governance yang diminta langsung oleh pengguna.
* **Status:** Selesai. Aturan berlaku untuk semua fix/perbaikan selanjutnya di branch stabilisasi.

---

## Entri 019 — Fix WGSL fisheye shader (Problem 008 §4.1)

* **Tanggal / waktu:** 2026-06-20 12:05 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui audit Problem 008 dan meminta fix pada temuan paling berdampak: fisheye WGSL shader yang gagal compile karena `textureSample` dipanggil di dalam non-uniform control flow. Jawaban Q1–Q5: (1) prioritas sudah benar, (2) perbaiki fisheye, (3) Databuddy masih dipakai untuk Vercel, (4) belum ada Freesound API key, (5) mulai dari yang paling berdampak.
* **Area sensitif yang terpengaruh:**
  * Rust/WASM core — shader file di `rust/crates/effects/src/shaders/fisheye.wgsl`.
  * WebGPU/WGSL — perubahan pada fragment shader yang dijalankan di GPU.
  * Alasan: fix diperlukan agar fisheye effect bekerja (sebelumnya fallback ke source tanpa efek).
  * Risiko: rendah — hanya mengubah urutan sampling, tidak mengubah logika distorsi.
* **Tindakan yang diambil:**
  * Membaca ulang `stabilize/PROBLEM.MD`, `TODO.MD`, `CRITICAL.MD`.
  * Mencatat jawaban Q1–Q5 pengguna ke `PROBLEM.MD`.
  * Mengubah `rust/crates/effects/src/shaders/fisheye.wgsl`:
    * Menambahkan `clamp(newUv, vec2(0.0), vec2(1.0))` sebelum `textureSample`.
    * Memindahkan `textureSample` keluar dari conditional block (sebelum `if` out-of-bounds check).
    * Logika distorsi tetap sama — hanya urutan operasi sampling yang diubah agar compliant dengan WGSL uniform control flow requirement.
  * Menjalankan `bun run build:wasm` — berhasil compile 6 packages dalam 10.76s.
  * Menjalankan `bun run lint:web` — lulus (hanya 4 warning pre-existing yang sudah dikenal).
  * Menjalankan `bunx tsc --noEmit` di `apps/web` — lulus tanpa error.
  * Menjalankan `bun run build:web` — lulus (Next.js 16.1.3 Turbopack, 26s compile, 23 halaman static).
  * Menambahkan entri What's New ke `apps/web/src/lib/whats-new/feed.ts` (per aturan §10).
  * Memperbarui `TODO.MD` dan `MAINTENANCE.MD`.
  * Tidak mengubah `STATE.MD` — menunggu hand-test manual pengguna.
* **File source yang disentuh:**
  * `rust/crates/effects/src/shaders/fisheye.wgsl` — fix shader
  * `rust/wasm/pkg/*` — rebuilt WASM output
  * `apps/web/src/lib/whats-new/feed.ts` — entri What's New baru
* **File governance yang diperbarui:**
  * `stabilize/PROBLEM.MD` (jawaban Q1–Q5 dicatat)
  * `stabilize/TODO.MD` (fisheye fix ditambahkan)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `stabilize/STATE.MD` — menunggu hand-test manual pengguna.
  * Semua file `apps/` lainnya — hanya fix yang disetujui.
* **Persetujuan pengguna diperlukan:** Sudah diberikan untuk implementasi. Masih menunggu hand-test manual di browser (tab Effects → pilih Fisheye → pastikan efek terlihat, bukan blank/source).
* **Status:** Fix diterapkan, WASM rebuilt, semua automated checks lulus. Menunggu hand-test manual pengguna.

---

## Entri 020 — Fisheye shader diverifikasi user + Problem 009 & 010 dicatat

* **Tanggal / waktu:** 2026-06-20 12:10 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna mengonfirmasi fisheye shader fix terlihat benar. Kemudian melaporkan 3 masalah baru:
  1. **Problem 009 Issue A:** Preview top-right controls (Fit, 16:9, fullscreen, menu) muncul terlalu agresif — saat ini muncul ketika hover ke seluruh area preview, seharusnya hanya muncul saat hover ke area kontrol itu sendiri.
  2. **Problem 009 Issue B:** Inspector tab/card row perlu horizontal scroll dengan mouse wheel biasa (tanpa Shift), tanpa mengganggu vertical scroll panel di bawahnya.
  3. **Problem 010:** Mobile home page AI chat mockup terpotong di sisi kanan — card terlalu lebar atau tidak responsive di mobile viewport.
* **Tindakan yang diambil:**
  * **Fisheye fix ditutup:** Memperbarui status Problem 008 §4.1 di `PROBLEM.MD` menjadi ✅ FIXED. User konfirmasi efek terlihat benar pada 2026-06-20 12:10.
  * **STATE.MD diperbarui:** Menambahkan fisheye fix ke "Bug yang Sudah Diperbaiki".
  * **Problem 009 dicatat:** 2 masalah UI di editor (preview controls hover + inspector tabs horizontal scroll). Audit source awal read-only dilakukan:
    * `apps/web/src/components/editor/panels/preview/index.tsx:362` — `group-hover:opacity-100` pada kontrol container.
    * `apps/web/src/components/editor/panels/properties/index.tsx:159` — tab row dengan `overflow-x-auto scrollbar-hidden`.
  * **Problem 010 dicatat:** Mobile home AI chat mockup overflow. Audit source awal read-only dilakukan:
    * `apps/web/src/components/landing/ai-showcase.tsx` — `ChatMockup` component dan parent grid layout.
  * Memperbarui `TODO.MD` dengan Problem 009 dan 010.
  * Tidak menyentuh source code untuk Problem 009 dan 010 (sesuai instruksi: tulis problem dulu, tunggu review).
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (Problem 008 §4.1 ditutup, Problem 009 dan 010 ditambahkan)
  * `stabilize/TODO.MD` (Problem 009 dan 010 ditambahkan)
  * `stabilize/STATE.MD` (fisheye fix ditambahkan ke "Bug yang Sudah Diperbaiki")
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — Problem 009 menunggu jawaban §8 Q1–Q3, Problem 010 menunggu jawaban §8 Q1–Q2 sebelum fix diusulkan.
* **Status:** Fisheye fix selesai penuh. Problem 009 dan 010 menunggu review pengguna.

---

## Entri 021 — Fix Problem 010: Mobile home AI chat mockup overflow

* **Tanggal / waktu:** 2026-06-20 12:15 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui Problem 010 dan meminta implementasi fix untuk mobile home AI chat mockup yang terpotong di sisi kanan. Pengguna menunjukkan kode spesifik yang perlu diubah: tool call cards container di `ai-showcase.tsx` dengan `max-w-[95%]` yang menyebabkan overflow di mobile.
* **Tindakan yang diambil:**
  * Membaca ulang `stabilize/PROBLEM.MD` untuk Problem 010.
  * Mengubah `apps/web/src/components/landing/ai-showcase.tsx`:
    * Line 126: Menambahkan `w-full` pada parent `motion.div` (sebelumnya `flex flex-col gap-2 self-start` → `flex w-full flex-col gap-2 self-start`). Ini memastikan container stretches ke full width pada mobile.
    * Line 134: Mengubah tool call cards container dari `max-w-[95%]` ke `w-full min-w-0`. `min-w-0` memungkinkan container shrink di bawah intrinsic width content-nya.
    * Line 163: Menambahkan `min-w-0` pada individual card `motion.div` agar bisa shrink.
    * Line 165-169: Menambahkan `shrink-0` pada elemen fixed-width (icon, tool name, separator dot, "ok" badge) agar tidak compress. Detail text sudah memiliki `truncate` dan ditambahkan `min-w-0` agar bisa shrink dan truncate dengan benar.
  * Menjalankan `bun run lint:web` — lulus (hanya 4 warning pre-existing yang sudah dikenal).
  * Menjalankan `bunx tsc --noEmit` di `apps/web` — lulus tanpa error.
  * Memperbarui `TODO.MD` dan `MAINTENANCE.MD`.
  * Tidak mengubah `STATE.MD` — menunggu hand-test manual pengguna.
* **File source yang disentuh:**
  * `apps/web/src/components/landing/ai-showcase.tsx` — responsive layout fix untuk tool call cards
* **File governance yang diperbarui:**
  * `stabilize/TODO.MD` (Problem 010 status updated)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **File yang sengaja tidak disentuh:**
  * `stabilize/STATE.MD` — menunggu hand-test manual pengguna di mobile viewport.
  * Semua file `apps/` lainnya — hanya fix yang disetujui.
* **Persetujuan pengguna diperlukan:** Sudah diberikan untuk implementasi. Masih menunggu hand-test manual di mobile viewport (375px, 390px, 414px) untuk memastikan tidak ada horizontal overflow.
* **Status:** Fix diterapkan, lint dan typecheck lulus. Menunggu hand-test manual pengguna di mobile.

---

## Entri 022 — Problem 010 diverifikasi user + Problem 011 dicatat

* **Tanggal / waktu:** 2026-06-20 12:20 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna mengonfirmasi Problem 010 fix aman. Kemudian melaporkan masalah baru: tab Transitions, Motion, dan Templates di assets panel editor terasa berat/lag saat dibuka atau digunakan.
* **Tindakan yang diambil:**
  * **Problem 010 ditutup:** Memperbarui status di `PROBLEM.MD` menjadi selesai. User konfirmasi fix aman pada 2026-06-20 12:20.
  * **STATE.MD diperbarui:** Menambahkan Problem 010 ke "Bug yang Sudah Diperbaiki".
  * **What's New entry ditambahkan:** Entri `2026-06-20-mobile-ai-chat-mockup-fix` ditambahkan ke `apps/web/src/lib/whats-new/feed.ts` (per aturan §10).
  * **Problem 011 dicatat:** Performance audit untuk tab Transitions, Motion, dan Templates. Audit source awal read-only dilakukan:
    * `transitions.tsx` (287 lines) — preset file 1401 lines
    * `animations.tsx` (354 lines) — motion preset file 1882 lines
    * `templates.tsx` (243 lines) — template preset file **4996 lines** (sangat besar)
    * Semua preset di-load upfront tanpa lazy loading
    * Setiap item component memanggil hooks (`useEditor()`, dll) yang bisa trigger re-render
    * Tidak ada virtualization — semua items di-render sekaligus
    * Procedural preview computation (`getPaletteForId`, `hashString`) per item
  * Memperbarui `TODO.MD` dengan Problem 011.
  * Tidak menyentuh source code untuk Problem 011 (sesuai instruksi: tulis problem dulu, tunggu review).
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (Problem 010 ditutup, Problem 011 ditambahkan)
  * `stabilize/TODO.MD` (Problem 010 ditutup, Problem 011 ditambahkan)
  * `stabilize/STATE.MD` (Problem 010 ditambahkan ke "Bug yang Sudah Diperbaiki")
  * `apps/web/src/lib/whats-new/feed.ts` (What's New entry untuk Problem 010)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — Problem 011 menunggu jawaban §8 Q1–Q4 sebelum fix diusulkan.
* **Status:** Problem 010 selesai penuh. Problem 011 menunggu review pengguna.

---

## Entri 023 — Problem 011: Browser profiling selesai, temuan dan rekomendasi ditulis

* **Tanggal / waktu:** 2026-06-20 12:50 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menjawab Q1–Q4 untuk Problem 011: (1) audit semua asset panel tabs, (2) jalankan browser profiling, (3) virtualization diperlukan + optimisasi lain, (4) Motion tab priority.
* **Tindakan yang diambil:**
  * Mencatat jawaban Q1–Q4 ke `PROBLEM.MD`.
  * Menjalankan browser profiling via Playwright MCP di `http://localhost:3000/editor/...`:
    * Mengukur switch time untuk semua 15 asset panel tabs.
    * Mengukur DOM node count (grid items, cards, scroll area nodes) untuk 7 tab yang lambat.
  * **Hasil profiling:**
    * Baseline (Assets, Audio, Adjust, dll): ~152ms
    * Overlays: 1481ms (373 grid items, 6035 scroll nodes) — paling lambat
    * Effects: 1291ms (322 grid items, 4589 scroll nodes)
    * Text: 853ms (203 grid items, 3639 scroll nodes)
    * Elements: 795ms (207 grid items, 697 scroll nodes) — anomaly: rendah nodes tapi lambat
    * Motion: 476ms (252 grid items, 3915 scroll nodes) — priority user
    * Transitions: 406ms (336 grid items, 4151 scroll nodes)
    * Templates: 304ms (185 grid items, 2918 scroll nodes)
  * **Root causes identified:**
    1. No virtualization — semua items di-render sekaligus
    2. Preset data loaded upfront — file sangat besar (templates 4996 lines)
    3. Procedural preview computation per item — `getPaletteForId()`, `hashString()`
    4. Hooks menyebabkan re-render cascade — `useEditor()` di setiap item
  * **6 rekomendasi fix disusun** dengan effort/impact/risk rating.
  * Menulis temuan lengkap ke `PROBLEM.MD` §9.
  * Memperbarui `TODO.MD` dengan status audit.
  * Tidak menyentuh source code — menunggu approval pengguna.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD` (jawaban Q1–Q4 + §9 profiling results)
  * `stabilize/TODO.MD` (status audit updated)
  * `stabilize/MAINTENANCE.MD` (entri ini)
* **Persetujuan pengguna diperlukan:** Ya — pengguna harus review temuan dan approve fix mana yang diimplementasikan duluan.
* **Status:** Profiling selesai. Menunggu review dan approval pengguna.

---

## Entri 024 — Problem 011: Implementasi awal optimisasi Motion tab

* **Tanggal / waktu:** 2026-06-20 13:05 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna meminta melanjutkan pekerjaan sebelumnya. Berdasarkan approval sebelumnya, prioritas implementasi adalah Motion tab terlebih dahulu, mengikuti rekomendasi aman: memoization, mengurangi hook per item, lalu caching ringan.
* **Tindakan yang diambil:**
  * Membaca ulang Problem 011 dan file terkait sebelum edit.
  * Mengubah `apps/web/src/components/editor/panels/assets/views/animations.tsx`:
    * `AnimationPresetItem` dibungkus `memo()`.
    * `PresetIcon` dibungkus `memo()`.
    * `useApplyAnimationPreset()` dipindahkan dari setiap card ke parent `AnimationsView`.
    * Parent mengirim `handleApplyPreset` stabil via `useCallback`.
    * `handleApply`, `previewStyle`, dan generated keyframes preview dimemoisasi.
  * Menambahkan entri What's New `2026-06-20-motion-tab-performance` di `apps/web/src/lib/whats-new/feed.ts`.
  * Memperbarui `PROBLEM.MD` dan `TODO.MD` dengan catatan implementasi.
* **Verifikasi:**
  * `bun run lint:web` selesai dengan warning lama yang sudah diketahui; tidak ada warning baru dari file yang disentuh.
  * `cd apps/web && bunx tsc --noEmit` lulus tanpa output.
  * `bun run build:web` menampilkan build sukses; shell timeout setelah output sukses karena batas 120s.
* **File yang diperbarui:**
  * `apps/web/src/components/editor/panels/assets/views/animations.tsx`
  * `apps/web/src/lib/whats-new/feed.ts`
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD`
* **Persetujuan pengguna diperlukan:** Ya — hand-test Motion tab di browser sebelum `STATE.MD` diperbarui atau problem ditutup.
* **Status:** Implementasi awal selesai. Menunggu verifikasi manual pengguna.

---

## Entri 025 — Problem 011: Motion optimization disetujui pengguna

* **Tanggal / waktu:** 2026-06-20 13:10 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui hasil Problem 011 Motion optimization dan meminta cek problem yang masih belum terselesaikan / menunggu.
* **Tindakan yang diambil:**
  * Menutup scope implementasi awal Motion untuk Problem 011 di `PROBLEM.MD`.
  * Menandai Problem 011 selesai di `TODO.MD` untuk scope Motion awal.
  * Memperbarui `STATE.MD` karena approval pengguna sudah diberikan.
  * Mengecek daftar outstanding dari `TODO.MD` dan `STATE.MD`.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/STATE.MD`
  * `stabilize/MAINTENANCE.MD`
* **Persetujuan pengguna diperlukan:** Tidak untuk pencatatan ini; approval sudah diberikan.
* **Status:** Problem 011 selesai untuk scope Motion awal. Outstanding list disajikan ke pengguna.

---

## Entri 026 — Problem 012: Keyframe curve editor locked pada playhead segment

* **Tanggal / waktu:** 2026-06-20 13:20 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna melaporkan bug pada button/fitur “select a keyframe to edit its curve”: button curve/easing editor masih locked saat playhead sudah berada di antara dua keyframe pada selected clip/timeline. Pengguna meminta pencatatan problem lengkap sesuai `stabilize/` dan melarang source edit sebelum review.
* **Tindakan yang diambil:**
  * Melakukan source audit read-only untuk menemukan alur button dan state:
    * `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx`
    * `apps/web/src/components/editor/panels/timeline/graph-editor/use-controller.ts`
    * `apps/web/src/components/editor/panels/timeline/graph-editor/session.ts`
    * `apps/web/src/core/managers/selection-manager.ts`
    * `apps/web/src/hooks/timeline/element/use-keyframe-selection.ts`
    * context terkait playhead di `timeline-manager.ts`
  * Mengonfirmasi akar masalah awal: resolver Graph Editor hanya memakai `selectedKeyframes`; jika kosong, state langsung unavailable dengan pesan `Select a keyframe to edit its curve.` Belum ada fallback yang mencari segment valid berdasarkan selected element + playhead.
  * Menulis Problem 012 lengkap di `PROBLEM.MD` dengan interpretasi, acceptance criteria, actionable tasks, DoD, file likely involved, risks, dan pertanyaan review.
  * Memperbarui `TODO.MD` untuk menambahkan Problem 012 sebagai menunggu review pengguna.
  * Tidak mengedit source code aplikasi.
  * Tidak memperbarui `STATE.MD` karena belum ada fix yang disetujui/selesai.
* **File yang diperbarui:**
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD`
* **Persetujuan pengguna diperlukan:** Ya — pengguna harus review Problem 012 dan menjawab §8 Q1–Q5 sebelum implementasi.
* **Status:** Menunggu review pengguna.

---

## Entri 027 — Problem 012: Implementasi keyframe curve playhead segment

* **Tanggal / waktu:** 2026-06-20 13:35 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui Problem 012 dan menginginkan behavior sesuai app editor umum: Graph Editor bisa memakai segment di antara keyframe, tooltip akurat, dan timeline lane memiliki affordance memilih segment langsung.
* **Tindakan yang diambil:**
  * Mengubah `graph-editor/session.ts` agar resolver tetap memprioritaskan selected keyframe explicit, lalu fallback ke selected element + playhead time jika tidak ada selected keyframe.
  * Menambahkan helper `findGraphEditorKeyframesAtPlayhead()` untuk mencari keyframe kiri/owner curve pada segment editable yang mengapit playhead.
  * Mengubah `graph-editor/use-controller.ts` agar controller membaca selected elements dan current playhead time.
  * Menambahkan hover/click segment affordance di expanded keyframe lanes (`timeline-element.tsx`). Click segment memilih keyframe kiri sebagai owner curve.
  * Menambahkan What's New entry `2026-06-20-keyframe-curve-segment-selection`.
  * Mencoba unit test helper Graph Editor, lalu menghapusnya karena Bun test memuat `artidor_wasm` dan gagal bootstrap (`wasm.__wbindgen_start is not a function`).
  * Memperbarui `PROBLEM.MD` dan `TODO.MD`.
* **Verifikasi:**
  * `bun run lint:web` selesai dengan warning lama yang sudah diketahui.
  * `cd apps/web && bunx tsc --noEmit` lulus.
  * `bun test apps/web/src/lib/whats-new/__tests__/feed.test.ts` lulus.
  * `bun run build:web` lulus.
* **File yang diperbarui:**
  * `apps/web/src/components/editor/panels/timeline/graph-editor/session.ts`
  * `apps/web/src/components/editor/panels/timeline/graph-editor/use-controller.ts`
  * `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
  * `apps/web/src/lib/whats-new/feed.ts`
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/MAINTENANCE.MD`
* **Persetujuan pengguna diperlukan:** Ya — hand-test manual sebelum `STATE.MD` diperbarui atau problem ditutup.
* **Status:** Fix diterapkan. Menunggu hand-test manual pengguna.

---

## Entri 028 — Problem 012: Approval dan alignment visual keyframe

* **Tanggal / waktu:** 2026-06-20 13:45 SEAST
* **Ringkasan permintaan pengguna:**
  Pengguna menyetujui fix Problem 012, lalu meminta keyframe logo/diamond lebih besar dan memastikan garis vertikal playhead berada tepat di tengah keyframe saat menambahkan keyframe.
* **Tindakan yang diambil:**
  * Memperbesar keyframe diamond timeline dan icon toggle property keyframe ke `1.125rem`.
  * Menghapus extra horizontal margin pada keyframe diamond timeline (`mr-0.5` / `mr-1`) agar posisi visual keyframe tetap center terhadap `left` dan garis playhead.
  * Menambahkan What's New entry `2026-06-20-keyframe-visual-alignment`.
  * Menutup Problem 012 di `PROBLEM.MD`, `TODO.MD`, dan `STATE.MD` setelah approval pengguna.
* **Verifikasi:**
  * `bun run lint:web` selesai dengan warning lama yang sudah diketahui.
  * `cd apps/web && bunx tsc --noEmit` lulus.
  * `bun test apps/web/src/lib/whats-new/__tests__/feed.test.ts` lulus.
  * `bun run build:web` lulus.
* **File yang diperbarui:**
  * `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
  * `apps/web/src/components/editor/panels/properties/components/keyframe-toggle.tsx`
  * `apps/web/src/lib/whats-new/feed.ts`
  * `stabilize/PROBLEM.MD`
  * `stabilize/TODO.MD`
  * `stabilize/STATE.MD`
  * `stabilize/MAINTENANCE.MD`
* **Persetujuan pengguna diperlukan:** Tidak. Approval sudah diberikan.
* **Status:** Problem 012 selesai penuh.
