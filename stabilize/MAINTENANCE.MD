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
