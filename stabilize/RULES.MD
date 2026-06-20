# Aturan Branch Stabilize

File ini mendefinisikan aturan untuk semua pekerjaan yang dilakukan di dalam branch `stabilize`. Ini adalah kontrak antara pengguna dan AI untuk pekerjaan stabilisasi.

## 1. Tujuan Branch

Branch `stabilize` ada untuk:

* Menstabilkan aplikasi dan membuatnya aman untuk dirilis.
* Mengurangi bug dan mencegah regresi.
* Meningkatkan keamanan, penanganan error, dan perilaku yang dapat diprediksi.
* Mencegah perubahan yang tidak terkontrol, besar, atau belum direview dari AI.

Branch `stabilize` **bukan** untuk:

* Fitur baru.
* Rewrite besar.
* Refactor spekulatif.
* Redesain UI.
* Upgrade dependency yang mengubah perilaku.

## 2. Aturan Persetujuan

* Setiap perubahan kode yang berarti harus direview oleh pengguna sebelum diterapkan.
* AI harus menjelaskan, sebelum mengedit, apa yang dipahami, file mana yang relevan, apa yang akan diubah, risiko apa yang ada, dan bagaimana perubahannya akan diuji.
* Pengguna harus secara eksplisit mengatakan "OK" atau menyetujui perubahan yang diusulkan sebelum AI melanjutkan.
* Setelah disetujui, AI membaca ulang file yang relevan (mis. `PROBLEM.MD`) sebelum melanjutkan, untuk jaga-jaga jika pengguna mengeditnya secara manual.
* Diam bukan berarti setuju.
* Jumlah pertanyaan review tidak harus tetap. AI boleh mengajukan kurang atau lebih dari enam pertanyaan sesuai kebutuhan problem.
* Pertanyaan review harus dikirim juga di chat agar mudah dijawab pengguna. Setelah pengguna menjawab di chat, AI harus langsung mencatat jawaban tersebut ke `PROBLEM.MD` sebelum melanjutkan langkah berikutnya.

## 3. Pembatasan Edit

* Jangan menambah fitur baru kecuali disetujui secara eksplisit.
* Jangan me-rewrite sebagian besar aplikasi kecuali disetujui secara eksplisit.
* Lebih suka perubahan kecil, dapat di-review, dapat dibalik.
* Satu perubahan logis per langkah. Jangan menggabungkan edit yang tidak berhubungan.
* Jangan bypass hook, type check, linter, atau test untuk "membuatnya lulus".
* Jangan commit kecuali pengguna secara eksplisit memintanya.

## 4. Area Sensitif

Area berikut memerlukan pemeriksaan ekstra dan persetujuan eksplisit per perubahan:

* Autentikasi dan otorisasi
* API key, secret, dan kredensial
* Environment variable dan pemuatan konfigurasi
* Migrasi database dan perubahan schema
* Pemanggilan tool AI dan konstruksi prompt
* Pipeline export dan render
* Rust / WASM core
* WebGPU / WGSL shader
* Kode terkait payment, billing, dan sponsor

Sebelum menyentuh salah satu dari ini, AI harus:

1. Menyebutkan area sensitif mana yang terpengaruh.
2. Menjelaskan mengapa perubahan diperlukan.
3. Mendaftar risikonya.
4. Menunggu persetujuan eksplisit.

## 5. Persyaratan Testing

* Setiap fix harus dapat diuji. Jika tidak dapat diuji, AI harus mengatakannya dan mengusulkan cara verifikasi.
* Test yang sudah ada harus tetap lulus.
* Perilaku baru harus ditutupi oleh test jika memungkinkan.
* Langkah verifikasi manual harus didaftar ketika test otomatis tidak memungkinkan.
* AI harus menjalankan lint, typecheck, dan perintah test yang relevan sebelum melaporkan perubahan sebagai selesai.

## 6. Aturan Perilaku AI

* Jika instruksi tidak jelas atau bertentangan dengan instruksi lain, berhenti dan tanya.
* Jangan menebak niat. Tanya.
* Jangan melakukan pekerjaan tersembunyi. Nyatakan apa yang akan dilakukan, lalu lakukan.
* Jangan memodifikasi file yang bukan bagian dari perubahan yang disepakati.
* Jangan mengarang isi file; jika file tidak diketahui, baca dulu.
* Jaga respons tetap fokus. Tanpa pengisi, tanpa preamble, tanpa permohonan maaf.
* Kalau ragu, perubahan terkecil yang benar yang menang.

## 7. Urutan Prioritas

Saat memutuskan apa yang harus dilakukan selanjutnya, gunakan urutan ini:

1. Menunggu persetujuan atau review dari pengguna.
2. Prompt eksplisit saat ini dari pengguna.
3. Prompt atau tugas yang sebelumnya sudah disetujui.
4. Isu kritis yang dikonfirmasi dan didokumentasikan di `CRITICAL.MD`.
5. Tugas dari file yang ditempatkan pengguna di dalam `stabilize/` (mis. `TODO_FROM_ME.MD`), hanya ketika disetujui atau diminta secara eksplisit.
6. Pembersihan umum atau perbaikan opsional (hanya ketika tidak ada yang lain yang menunggu).

## 8. Alur Kerja untuk Tugas Umum

1. Pengguna melaporkan masalah, bug, atau user story.
2. AI menulis ulangnya ke dalam `PROBLEM.MD` menggunakan struktur yang diperlukan.
3. AI berhenti dan meminta pengguna untuk mereview pemahaman. Jika ada pertanyaan review, AI mengirim pertanyaan tersebut di chat; jumlahnya fleksibel sesuai kebutuhan problem.
4. Pengguna mereview dan mengatakan "OK" (atau mengoreksi).
5. Jika pengguna menjawab pertanyaan di chat, AI langsung mencatat jawaban ke `PROBLEM.MD`, lalu membaca ulang `PROBLEM.MD` sebelum mengusulkan perubahan kecil yang terlingkup.
6. Pengguna menyetujui.
7. AI melakukan perubahan, menjalankan test, mencatat di `MAINTENANCE.MD`, memperbarui `TODO.MD`.
8. **AI menambahkan entri "What's New"** ke `apps/web/src/lib/whats-new/feed.ts` (lihat §10 untuk detail format dan aturan).
9. Hanya setelah itu AI memperbarui `STATE.MD` untuk mencerminkan perubahan yang disetujui.

## 9. Alur Kerja untuk Isu Kritis

Hanya tulis ke `CRITICAL.MD` setelah AI dengan hati-hati memeriksa file yang terpengaruh dan mengonfirmasi bahwa isu tersebut kemungkinan kritis. Sebelum memperbaiki, AI harus:

1. Menyatakan apa isu kritisnya.
2. Mendaftar file yang terpengaruh.
3. Menjelaskan mengapa itu kritis.
4. Meminta persetujuan eksplisit.
5. Tidak memperbaikinya sampai persetujuan diberikan.

## 10. Pembaruan "What's New"

Setelah AI menerapkan fix atau perbaikan (bukan audit saja), AI **wajib** menambahkan entri ke file `apps/web/src/lib/whats-new/feed.ts` di bagian atas array `WHATS_NEW`.

* **Tag yang digunakan:**
  * `"fix"` — untuk perbaikan bug (mis. modal scroll horizontal, category chips kepotong, storage badge misleading).
  * `"improvement"` — untuk peningkatan UX/copy/formatting yang bukan bug.
  * `"performance"` — untuk perbaikan performa (render lag, unnecessary re-render, dll).
* **Format entri:**
  * `id`: string unik dengan format `YYYY-MM-DD-slug-singkat` (mis. `"2026-06-20-fisheye-shader-fix"`).
  * `date`: tanggal hari ini dalam format `YYYY-MM-DD`.
  * `title`: judul singkat yang jelas (bahasa Inggris, mengikuti konvensi yang sudah ada).
  * `items`: array string yang menjelaskan perubahan secara detail dan teknis (bahasa Inggris, mengikuti gaya entri yang sudah ada).
* **Posisi:** entri baru selalu ditambahkan di **paling atas** array `WHATS_NEW` (sebelum entri pertama yang sudah ada).
* **Tidak perlu persetujuan terpisah** untuk menambah entri What's New — ini adalah bagian dari langkah implementasi yang sudah disetujui.
* **Pengecualian:** perubahan governance (update `RULES.MD`, `MAINTENANCE.MD`, `TODO.MD`, `PROBLEM.MD`, `STATE.MD`) tidak memerlukan entri What's New.
