# Laporan Problem

> Saat pengguna menggambarkan masalah, bug, atau user story, tulis ulang ke dalam struktur di bawah ini.
> Setelah menulis atau memperbarui file ini, berhenti dan minta pengguna untuk mereview pemahaman AI.
> Jangan mulai implementasi sampai pengguna mereview dan mengatakan "OK".
> Setelah "OK", baca ulang file ini sebelum melanjutkan.

## Template

### 1. Laporan Asli Pengguna

> Kutipan verbatim atau mendekati verbatim dari apa yang dikatakan pengguna. Pertahankan kata-kata asli jika memungkinkan.

### 2. Interpretasi Problem

> Pernyataan ulang AI dalam bahasa biasa tentang problem tersebut. Nyatakan apa yang rusak, apa perilaku yang diharapkan, dan apa perilaku aktualnya.

### 3. Acceptance Criteria

> Daftar pendek, dapat diuji, kondisi yang ketika semua benar berarti problem telah diperbaiki.
> Setiap kriteria harus dapat diperiksa secara objektif.

### 4. Actionable Tasks

> Set terkecil dari langkah konkret yang diperlukan untuk memenuhi acceptance criteria.
> Satu perubahan logis per tugas. Setiap tugas harus cukup kecil untuk di-review secara terpisah.

### 5. Definition of Done

> Apa arti "selesai" untuk problem ini. Termasuk: perubahan kode di-merge ke `stabilize`, test ditambahkan atau diperbarui, lint dan typecheck lulus, verifikasi manual dilakukan, entri ditambahkan ke `MAINTENANCE.MD`, dan `STATE.MD` diperbarui.

### 6. File yang Kemungkinan Terlibat

> File yang diyakini AI perlu diubah. Ini adalah hipotesis sampai dikonfirmasi dengan membaca kode.

### 7. Risiko

> Apa yang bisa salah, apa yang bisa regresi, dan area sensitif mana (per `RULES.MD`) yang tersentuh.

### 8. Pertanyaan untuk Review

> Pertanyaan terbuka yang harus dijawab pengguna sebelum AI melanjutkan. Jika tidak ada, tulis "Tidak ada — siap untuk review."

---

## Log

### Problem 001 — Audit alur "What's New" / Changelog

* **Tanggal / waktu:** 2026-06-20 08:02 SEAST
* **Status:** Disetujui oleh pengguna pada 2026-06-20 08:56 SEAST. Lingkup dikonfirmasi (lihat jawaban §8 di bawah). Audit belum dimulai. Tidak ada kode sumber yang disentuh.

#### 1. Laporan Asli Pengguna

> Audit the codebase related to the "What's New" notification, specifically these files:
>
> * `apps/web/src/app/changelog/page.tsx`
> * `apps/web/src/lib/whats-new/feed.ts`
>
> Goal: I want to understand whether the current "What's New" notification/changelog flow is stable, safe, and correctly implemented.
>
> Rules: do not edit source code yet, do not implement fixes yet, do not update `STATE.MD` yet. First, inspect the related files. Rewrite this problem into `PROBLEM.MD` using the required structure. Add this action to `MAINTENANCE.MD` as a log entry. Update `TODO.MD` with the audit task. After updating `PROBLEM.MD`, stop and ask me to review your understanding. Do not continue until I say "OK".
>
> Focus areas for the audit:
> 1. How the "What's New" notification is triggered.
> 2. How changelog/feed data is loaded.
> 3. Whether the notification can show incorrectly.
> 4. Whether there are duplicate or stale notifications.
> 5. Whether local storage / state handling is safe.
> 6. Whether there are TypeScript or runtime risks.
> 7. Whether the user experience is clear.
> 8. Whether the implementation is maintainable.

#### 2. Interpretasi Problem

Pengguna menginginkan **audit read-only** dari permukaan "What's New" / changelog untuk menentukan apakah implementasi saat ini **stabil, aman, dan benar** sebelum fix apa pun diterapkan. Dua file in-scope adalah titik masuk, tetapi tidak satu pun dapat diinterpretasikan secara terpisah — `page.tsx` adalah server component tipis yang mengambil data dari `apps/web/src/lib/changelog/utils.ts` dan me-render `apps/web/src/lib/changelog/components/release.tsx`, dan `feed.ts` digunakan oleh `apps/web/src/components/whats-new/whats-new-card.tsx` dan `apps/web/src/stores/whats-new-store.ts`. Sebuah stub no-op terpisah, `apps/web/src/lib/changelog/components/changelog-notification.tsx`, masih diimpor oleh dua halaman meskipun me-render apa-apa. Audit harus menjawab delapan area fokus eksplisit; deliverable adalah laporan temuan tertulis yang akan digunakan pengguna untuk membatasi ruang lingkup fix. Tidak ada perubahan kode yang merupakan bagian dari problem ini.

#### 3. Acceptance Criteria

1. Kedua file in-scope dibaca secara penuh dan perilaku setiap import yang mereka andalkan dideskripsikan.
2. Untuk masing-masing dari delapan area fokus, audit menyatakan temuan konkret (bukan tebakan) dan mengutip file + baris di mana kode relevan berada.
3. Setiap temuan diberi label severity: `critical` (kehilangan data / keamanan / crash) | `bug` (perilaku salah yang terlihat pengguna) | `risk` (bahaya laten) | `note` (informatif / tidak dapat ditindaklanjuti sekarang).
4. Audit secara eksplisit memetakan coupling lintas-file: file adjacent mana yang berpartisipasi dalam alur "What's New" dan alur halaman changelog, dan di mana mereka tumpang tindih.
5. Jika temuan `critical` ditemukan, itu dimasukkan ke `CRITICAL.MD` dan langsung di-surface ke pengguna, secara terpisah dari problem ini.
6. Tidak ada file di `apps/` yang diedit. Tidak ada fix yang diterapkan. Tidak ada test yang ditulis.
7. `STATE.MD` tidak diperbarui sebagai bagian dari problem ini.

#### 4. Actionable Tasks

1. Baca `apps/web/src/app/changelog/page.tsx` secara penuh. Enumerasi setiap import, dependensi data, batas server vs. client, dan cabang rendering.
2. Baca `apps/web/src/lib/whats-new/feed.ts` secara penuh. Enumerasi: total jumlah entri, format id, format date, distribusi tag, id yang tidak sesuai konvensi, konvensi ordering, dan perilaku `getLatestWhatsNewId()`.
3. Baca file adjacent yang berpartisipasi dalam alur yang sama:
   * `apps/web/src/lib/changelog/utils.ts`
   * `apps/web/src/lib/changelog/components/release.tsx`
   * `apps/web/src/lib/changelog/components/changelog-notification.tsx`
   * `apps/web/src/app/changelog/[version]/page.tsx`
   * `apps/web/src/components/whats-new/whats-new-card.tsx`
   * `apps/web/src/stores/whats-new-store.ts`
   * `apps/web/src/app/page.tsx` (untuk mengonfirmasi di mana card di-mount)
   * `apps/web/src/app/editor/[project_id]/page.tsx` dan `apps/web/src/app/projects/page.tsx` (dua file yang masih me-mount no-op `ChangelogNotification`).
4. Untuk masing-masing dari delapan area fokus, tulis satu atau lebih temuan dengan label severity dan kutipan `file:line`.
5. Sajikan temuan kepada pengguna. Berhenti dan tunggu konfirmasi sebelum ada fix yang dibatasi.
6. Hanya setelah pengguna mengatakan "OK" pada temuan: baca ulang `PROBLEM.MD` ini, usulkan fix kecil yang terlingkup per temuan, dan tunggu persetujuan per-fix.

#### 5. Definition of Done

* Temuan audit disajikan kepada pengguna dalam satu pesan yang dapat di-review.
* Pengguna telah menerima temuan (dengan rencana fix yang akan diikuti) atau meminta re-scoping.
* Jika ada temuan `critical` yang dibuat, itu dicatat di `CRITICAL.MD` dengan field yang diperlukan, dan di-surface ke pengguna sebelum yang lain.
* Entri maintenance telah ditambahkan ke `MAINTENANCE.MD` yang mencatat tindakan audit.
* `TODO.MD` mendaftar tugas audit dan review laporan problem yang menunggu.
* `STATE.MD` TIDAK diperbarui sebagai bagian dari problem ini (sesuai instruksi pengguna).
* Tidak ada file sumber di bawah `apps/` yang telah diedit.
* Tidak ada fix yang diterapkan.

#### 6. File yang Kemungkinan Terlibat

**In scope (dibaca penuh):**

* `apps/web/src/app/changelog/page.tsx` — 83 baris. Server component, tanpa `"use client"`. Mengambil `getSortedReleases()` dan memetakan setiap release ke `ReleaseEntry`.
* `apps/web/src/lib/whats-new/feed.ts` — 768 baris. Mengekspor tipe `WhatsNewEntry` / `WhatsNewTag`, array literal `WHATS_NEW`, dan `getLatestWhatsNewId()`.

**Adjacent — dibaca agar dua file in-scope dapat diinterpretasikan dengan benar:**

* `apps/web/src/lib/changelog/utils.ts` — `getSortedReleases`, `getReleaseByVersion`, tipe `Release`, konfigurasi section yang digunakan oleh `ReleaseChanges`.
* `apps/web/src/lib/changelog/components/release.tsx` — `ReleaseArticle`, `ReleaseMeta`, `ReleaseTitle`, `ReleaseDescription`, `ReleaseChanges` yang digunakan oleh halaman changelog.
* `apps/web/src/lib/changelog/components/copy-markdown-button.tsx` — modul yang sama, tidak digunakan oleh halaman in-scope; disertakan untuk kelengkapan saja.
* `apps/web/src/lib/changelog/components/changelog-notification.tsx` — sekarang stub no-op. **Masih diimpor** oleh `apps/web/src/app/editor/[project_id]/page.tsx` (baris 59–61, 110) dan `apps/web/src/app/projects/page.tsx` (baris 93, 303).
* `apps/web/src/app/changelog/[version]/page.tsx` — halaman per-release yang di-link dari `ReleaseTitle` di daftar changelog.
* `apps/web/src/components/whats-new/whats-new-card.tsx` — satu-satunya konsumen langsung `WHATS_NEW`. Me-render card floating kiri bawah dan tombol trigger.
* `apps/web/src/stores/whats-new-store.ts` — Zustand store yang dipersist di bawah localStorage key `whats-new`. Menyimpan `lastSeenId` dan logika `hasUnseen()`.
* `apps/web/src/app/page.tsx` — halaman home yang me-mount `WhatsNewCard`.

**Konfigurasi / sumber data (jangan dibuka kecuali audit membutuhkannya):**

* Konfigurasi `content-collections` (path akan ditemukan).
* `apps/web/src/lib/changelog/entries/0.0.1-beta.md` hingga `0.4.0.md`.

#### 7. Risiko

* Audit mungkin menemukan isu `critical` (misalnya: id entri duplikat di `WHATS_NEW` yang menyebabkan indikator unseen tidak pernah hilang, atau tabrakan localStorage key antara store dan no-op `ChangelogNotification`). Jika demikian, temuan harus dimasukkan ke `CRITICAL.MD` dan di-surface ke pengguna **sebelum** fix lain dibatasi.
* Membaca `feed.ts` dan `whats-new-store.ts` mungkin mengungkap localStorage key yang ada yang bertabrakan dengan key fitur lain. No-op `ChangelogNotification` menulis ke `last-seen-version`, dan store menulis ke `whats-new`. Audit harus memeriksa apakah key ini dibaca oleh subsistem lain.
* Pengguna secara eksplisit meminta audit read-only. AI tidak boleh "memperbaiki hal-hal kecil sambil jalan" — bahkan edit satu baris di `apps/` akan melanggar aturan.
* Memperbarui `STATE.MD` dilarang untuk tugas ini. AI tidak boleh menyentuh `STATE.MD` bahkan setelah audit disajikan.
* Audit bersifat deskriptif, bukan exhaustive. Temuan mungkin tidak lengkap. Pengguna harus membatasi fix secara terpisah, satu temuan pada satu waktu, per `RULES.MD`.
* Tidak ada area sensitif (per `RULES.MD` §4) yang disentuh oleh audit itu sendiri. Fix yang muncul mungkin menyentuh localStorage (masalah state, bukan area sensitif) tetapi tidak akan menyentuh auth, API key, env var, migrasi, pemanggilan tool AI, export/render, Rust/WASM, WebGPU/WGSL, atau payment.

#### 8. Pertanyaan untuk Review

* **Q1. Batas ruang lingkup.** File adjacent yang terdaftar di §6 adalah minimum yang diperlukan untuk menginterpretasikan dua file in-scope. Apakah Anda ingin audit juga membuka konfigurasi `content-collections` dan file `entries/*.md`, atau tetap fokus pada dua file? 
* **Answer = Iya**
* **Q2. Skema severity.** Label yang diusulkan adalah `critical | bug | risk | note`. Apakah Anda ingin skema berbeda (mis. `P0/P1/P2`)?
* **Answer = Iya**
* **Q3. Bentuk deliverable.** Apakah Anda ingin temuan ditambahkan inline ke `PROBLEM.MD` di bawah problem ini, atau dikembalikan sebagai pesan laporan markdown terpisah?
* **Answer = Iya**
* **Q4. Kekhawatiran lintas-sistem.** Ada dua feed "apa yang berubah" paralel: array `WHATS_NEW` per-perubahan di `feed.ts` dan markdown content collection per-release `changelog/`. Mereka tidak berbagi schema, tipe, atau storage. Satu-satunya link antara mereka adalah link "Full changelog" di footer `WhatsNewCard` yang mengarah ke `/changelog`. Apakah ini disengaja, atau ini adalah bug yang diketahui akan ditangani di bawah problem terpisah?
* **Answer = Iya, Disengaja**
* **Q5. Aturan disiplin-saja.** Komentar doc di `feed.ts` menginstruksikan kontributor untuk "add a new entry at the TOP of WHATS_NEW for every shipped change". Ini ditegakkan oleh disiplin reviewer saja — tidak ada test yang menangkap "ditambahkan di bawah" atau "id duplikat". Apakah Anda ingin ini ditangani dalam problem ini, atau dipecah?
* **Answer = Dipecah**
* **Q6. Stub mati.** `ChangelogNotification` dipertahankan sebagai komponen no-op `return null` tetapi masih diimpor dan di-render oleh dua halaman. Itu juga menulis ke localStorage key `last-seen-version` yang tidak ada dalam codebase yang membacanya. Apakah Anda ingin ini ditangani dalam problem ini, atau dipecah?
* **Answer = Dipecah**

---

### Problem 002 — Modal "What's New" scroll horizontal, seharusnya hanya vertikal

* **Tanggal / waktu:** 2026-06-20 08:14 SEAST
* **Status:** Disetujui pada 2026-06-20 08:56, fix diterapkan pada 2026-06-20 09:02, diverifikasi secara visual oleh pengguna pada 2026-06-20 09:09 (tidak ada regresi). **Selesai** (lihat entri maintenance 006 dan 007).

#### 1. Laporan Asli Pengguna

> Pada modal "What's New", konten bisa di-scroll/geser ke kanan secara horizontal. Seharusnya modal hanya boleh scroll ke bawah secara vertikal, bukan ke samping.
>
> File terkait:
> * `apps/web/src/app/changelog/page.tsx`
> * `apps/web/src/lib/whats-new/feed.ts`
> * komponen/modal "What's New" jika ada file terkait lain
>
> Expected behavior:
> * Modal "What's New" tidak memiliki horizontal scroll.
> * Konten teks harus wrap sesuai lebar modal.
> * Konten panjang hanya boleh scroll vertikal.
> * Tidak ada teks yang kepotong di sisi kiri/kanan.
> * Layout tetap rapi di ukuran layar kecil/mobile.
>
> Ikuti rules di folder `stabilize/`. Jangan edit source code dulu. Tulis ulang problem ini ke `stabilize/PROBLEM.MD` dengan acceptance criteria, actionable tasks, DoD, risks, dan questions for review. Update `MAINTENANCE.MD` dan `TODO.MD`, lalu stop untuk aku review.

#### 2. Interpretasi Problem

Card floating "What's New" (di-render oleh `apps/web/src/components/whats-new/whats-new-card.tsx` dan di-mount di halaman home `apps/web/src/app/page.tsx`) memungkinkan pengguna men-scroll kontennya **secara horizontal** ketika seharusnya hanya scroll vertikal yang dimungkinkan. Pengguna ingin modal:

* Tidak memiliki sumbu scroll horizontal sama sekali.
* Wrap teks ke lebar modal.
* Hanya izinkan scroll vertikal.
* Jaga semua teks dalam batas kiri/kanan (tanpa pemotongan).
* Tetap rapi di viewport kecil/mobile.

**Hipotesis awal (dibaca dari kode, bukan dari fix):** container entri adalah `flex max-h-[52vh] flex-col gap-4 overflow-y-auto scrollbar-hidden px-4 py-4` — perhatikan `overflow-y-auto` saja, tanpa `overflow-x` yang diset. Item daftar adalah `flex gap-2.5` yang berisi `<span>` dot lebar tetap dan `<span>` teks `text-[12px] leading-relaxed text-white/60`. Span teks adalah flex child tanpa `min-w-0` dan tanpa `break-words`. Item `feed.ts` berisi string panjang yang tidak dapat dipecah di dalam backtick (mis. `` `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts` ``, `` `apps/web/src/components/whats-new/whats-new-card.tsx` ``). Dengan flex child yang menolak menyusut di bawah lebar minimum intrinsik konten dan container yang tidak menekan overflow horizontal, satu path panjang dapat mendorong lebar alami container entri melewati lebar modal, mengekspos scroll horizontal pada container itu. `overflow-hidden` luar card hanya memotong container entri itu sendiri, bukan konteks scroll bagian dalam.

Hipotesis ini harus **diverifikasi** di DOM yang di-render sebenarnya sebelum fix apa pun diusulkan. Ini adalah salah satu dari beberapa kemungkinan penyebab (lihat §7 Risiko).

**Catatan tentang file yang terdaftar pengguna:**

* `apps/web/src/lib/whats-new/feed.ts` adalah in-scope — itu adalah sumber data untuk modal.
* `apps/web/src/app/changelog/page.tsx` adalah **halaman daftar publik /changelog**, bukan modal "What's New". Pengguna mungkin menyertakannya sebagai konteks (berada di domain yang sama), atau mungkin membingungkan kedua permukaan, atau mungkin ingin keduanya di-audit. Ini perlu klarifikasi — lihat §8 Q1.

#### 3. Acceptance Criteria

1. Di modal "What's New", pengguna tidak dapat men-scroll konten secara horizontal melalui trackpad, mouse wheel, Shift+wheel, swipe sentuh, atau keyboard (tombol Arrow, tombol Page).
2. Browser tidak merender scrollbar horizontal pada modal atau pada descendant-nya.
3. Setiap teks di dalam modal wrap dalam area konten modal, termasuk string panjang yang tidak dapat dipecah seperti path file dan identifier.
4. Konten panjang masih scroll secara vertikal; perilaku scroll vertikal yang ada dipertahankan.
5. Padding kiri/kanan modal konsisten di viewport kecil/mobile; tidak ada teks yang terpotong di kedua sisi.
6. Layout modal tidak regresi pada:
   * Tombol trigger dan dot indikator unseen.
   * Header (judul + subjudul + tombol dismiss).
   * Chip `WhatsNewTag` ("NEW" / "IMPROVED" / "FIX" / "FASTER") dan label tanggal.
   * Footer (link "Full changelog" + tombol "Got it").
7. Fix yang sama (atau guard yang setara) berlaku untuk permukaan lain yang me-render data `WHATS_NEW` yang sama, jika ada permukaan seperti itu. (Saat ini tidak ada yang diketahui selain halaman home.)
8. Fix hanya CSS atau layout, tanpa perubahan konten `feed.ts` kecuali pengguna secara eksplisit menyetujui edit konten.

#### 4. Actionable Tasks

1. **Baca** `apps/web/src/components/whats-new/whats-new-card.tsx` dan `apps/web/src/stores/whats-new-store.ts` secara penuh untuk mengonfirmasi rantai layout yang menghasilkan overflow horizontal.
2. **Baca** konten `feed.ts` yang di-render dan **identifikasi** entri mana yang berisi string panjang yang tidak dapat dipecah (path file, identifier, URL) yang dapat mendorong container mereka melewati lebar modal.
3. **Buka halaman home di browser** (atau jalankan dev server Next.js) dan **verifikasi** bug end-to-end:
   * Konfirmasi modal saat ini scroll secara horizontal.
   * Identifikasi elemen tepat yang memiliki scroll horizontal (card, container entri, item daftar, atau span teks).
   * Tangkap lebar viewport dan lebar terkomputasi dari elemen yang melanggar jika memungkinkan.
4. **Tentukan akar penyebab** dengan kutipan `file:line`:
   * Hipotesis A (primer): `<span>` teks di `whats-new-card.tsx` adalah flex child tanpa `min-w-0` dan kurang `break-words`, dikombinasikan dengan `overflow-y-auto` container entri yang tidak memiliki `overflow-x-hidden`. Kutip baris persisnya.
   * Hipotesis B (sekunder): string yang tidak dapat dipecah di `feed.ts` lebih panjang dari lebar modal bahkan setelah wrapping diaktifkan (mis. token yang tidak dapat dipecah di atas 320 px di card 336 px). Jika benar, tambahan `word-break: break-all` atau `overflow-wrap: anywhere` diperlukan pada span daun.
   * Hipotesis C (tersier): modal itu sendiri sedang didorong lebih lebar dari `max-w-[calc(100vw-2rem)]` oleh beberapa descendant, sehingga card secara visual tumbuh keluar dari layar di viewport kecil. Verifikasi dengan computed style.
5. **Usulkan fix minimal yang terlingkup** sebagai diff kecil. Fix harus:
   * Hanya menyentuh layout / className dari `whats-new-card.tsx` (CSS-only), kecuali hipotesis B atau C dikonfirmasi dan memerlukan menyentuh konten `feed.ts` atau file lain.
   * Mempertahankan desain visual tombol trigger, chip tag, dot, dan affordance dismiss.
   * Mempertahankan scroll vertikal dan perilaku auto-open / "Got it" / dismiss.
6. **Tunggu persetujuan per-fix dari pengguna** sebelum mengedit file sumber apa pun.
7. Setelah disetujui, **terapkan fix**, **jalankan lint + typecheck**, dan **verifikasi** pada:
   * Viewport desktop (1440×900) — konfirmasi tidak ada scroll horizontal.
   * Viewport mobile (375×812) — konfirmasi layout tetap rapi.
   * Keduanya dengan modal tertutup dan terbuka.
8. **Tambahkan entri maintenance** ke `MAINTENANCE.MD` yang menjelaskan fix, file yang disentuh, dan verifikasi manual yang dilakukan.
9. **Perbarui `STATE.MD`** untuk mencatat perubahan yang disetujui (per `RULES.MD` §2 / aturan tulis `STATE.MD`).

#### 5. Definition of Done

* Pengguna tidak dapat men-scroll modal "What's New" secara horizontal dalam modalitas input apa pun (mouse, trackpad, sentuh, keyboard).
* Scroll vertikal untuk entri feed panjang masih berfungsi.
* Tombol trigger, header, chip, footer, dan affordance dismiss terlihat identik dengan sebelum fix pada ukuran viewport umum.
* Lint lulus (`biome check` per `biome.json` repo) dan typecheck TypeScript lulus.
* Verifikasi manual pada viewport desktop dan mobile ditangkap dalam log maintenance.
* Entri maintenance ada di `MAINTENANCE.MD` yang menjelaskan perubahan.
* `STATE.MD` mencerminkan perubahan yang disetujui.
* `TODO.MD` diperbarui: problem ini pindah dari "Menunggu Review Pengguna" / "Sedang Dikerjakan" ke "Selesai".
* Jika fix ternyata memerlukan perubahan area sensitif (seharusnya tidak, per §7), pengguna diinformasikan dulu dan persetujuan eksplisit.

#### 6. File yang Kemungkinan Terlibat

**In scope (harus dibaca / disentuh):**

* `apps/web/src/components/whats-new/whats-new-card.tsx` — komponen modal. Overflow horizontal kemungkinan besar berasal dari container entri (`overflow-y-auto` tanpa `overflow-x-hidden`) dan `<span>` teks di dalam setiap item daftar (flex child tanpa `min-w-0` atau `break-words`).
* `apps/web/src/lib/whats-new/feed.ts` — data. Read-only di sini; hanya diedit jika hipotesis B dikonfirmasi dan pengguna menyetujui perubahan konten.

**Adjacent — dibaca agar file in-scope dapat diinterpretasikan dengan benar:**

* `apps/web/src/stores/whats-new-store.ts` — `isOpen`, `hasUnseen`, dan perilaku auto-open adalah layout-neutral tetapi mount / unmount modal didorong dari sini.
* `apps/web/src/app/page.tsx` — halaman home yang me-mount `WhatsNewCard`. Mengonfirmasi satu-satunya konsumen saat ini.
* `apps/web/src/app/changelog/page.tsx` — halaman daftar publik changelog. **Bukan modal**, tetapi pengguna mencantumkannya. Lihat §8 Q1.
* `apps/web/src/lib/changelog/utils.ts` dan `apps/web/src/lib/changelog/components/release.tsx` — hanya relevan jika pengguna ingin halaman publik changelog di-audit untuk cacat yang sama (Q1).

**Konfigurasi / sumber data (jangan dibuka kecuali diperlukan):**

* Tailwind / `biome.json` — hanya jika kelas Tailwind yang diperkenalkan perlu verifikasi.

#### 7. Risiko

* **Layer fix yang salah.** Jika file yang salah disentuh, bug tetap ada atau masalah visual baru muncul. Mitigasi: konfirmasi elemen yang di-render yang memiliki scroll horizontal di browser sungguhan sebelum mengubah apa pun.
* **Regresi visual pada chip / dot / judul.** Kelas `break-words` pada span teks aman, tetapi jika diterapkan terlalu luas (mis. pada label chip atau tombol trigger), itu dapat menyebabkan wrapping yang tidak diinginkan pada chip ("IMPROVED" bisa pecah menjadi "IMP\nROVED" pada lebar 1rem). Mitigasi: batasi perubahan hanya pada `<span>` teks.
* **String panjang yang tidak dapat dipecah di feed.ts.** Jika satu token di `feed.ts` lebih lebar dari modal bahkan dengan wrapping diaktifkan (mis. URL sangat panjang atau base64), `break-words` saja tidak cukup; `word-break: break-all` atau `overflow-wrap: anywhere` diperlukan. Mitigasi: verifikasi token yang tidak dapat dipecah terpanjang di feed saat ini sebelum memutuskan className.
* **Scroll horizontal level halaman.** Jika bug sebenarnya ada di body / level halaman (karena card secara visual meluas melewati viewport di layar kecil dan menarik body bersamanya), fix hidup di container luar card, bukan di container entri. Mitigasi: konfirmasi di browser.
* **Ketidakcocokan file yang didaftarkan pengguna.** Pengguna mendaftarkan `apps/web/src/app/changelog/page.tsx`, yang merupakan halaman daftar publik /changelog, bukan modal. Jika pengguna benar-benar ingin halaman publik juga diperbaiki, itu adalah permukaan berbeda dengan layout berbeda. Mitigasi: klarifikasi di §8 Q1.
* **Tidak ada area sensitif yang disentuh.** Modal adalah UI shell. Tidak ada auth, API key, env var, migrasi, pemanggilan tool AI, export/render, Rust/WASM, WebGPU/WGSL, atau payment yang in-scope.

#### 8. Pertanyaan untuk Review

* **Q1. Permukaan mana yang sebenarnya memiliki bug?** Pengguna menyebutkan `apps/web/src/app/changelog/page.tsx`, tetapi file itu me-render halaman daftar publik /changelog, bukan card floating "What's New". Card "What's New" tinggal di `apps/web/src/components/whats-new/whats-new-card.tsx` dan di-mount di halaman home. Apakah bug-nya:
   * (a) hanya di modal "What's New",
   * (b) hanya di halaman daftar publik /changelog,
   * (c) di keduanya?
   Jika (b) atau (c), problem ini harus dipecah sehingga setiap permukaan memiliki DoD-nya sendiri.
* **Answer = a**
* **Q2. Entri mana yang memicunya?** Apakah bug muncul untuk setiap entri, atau hanya untuk yang spesifik (mis. entri pertama tentang thumbnail Unsplash, yang berisi path file panjang `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts`)?
* **Answer = Ya bug muncul untuk entri pertama**
* **Q3. Di mana Anda mengamati bug?** Browser desktop, browser mobile, atau keduanya? Scroll horizontal trackpad atau swipe sentuh?
* **Answer = Di Browser Desktop dan Mobile**
* **Q4. Apakah halaman publik /changelog juga terpengaruh?** Halaman publik me-render data `Release` yang sama melalui `getSortedReleases()` dan mungkin menunjukkan masalah wrapping path panjang yang sama di item daftar `ReactMarkdownWrapper` inline. Haruskah itu in-scope?
* **Answer = Tidak**
* **Q5. Layer fix.** Jika fix perlu menyentuh konten `feed.ts` (mis. memecah path panjang secara manual di dua baris), apakah itu dapat diterima, atau Anda ingin solusi murni CSS?
* **Answer = Dapat kuterima**
* **Q6. Defense in depth.** Jika card luar modal memiliki `overflow-hidden`, apakah Anda lebih suka fix juga menambahkan `overflow-x-hidden` pada container entri sebagai pengaman belt-and-braces terhadap konten feed di masa depan?
* **Answer = Iya**

---

### Problem 003 — Aturan disiplin "add at the top" untuk `WHATS_NEW`

* **Tanggal / waktu:** 2026-06-20 08:56 SEAST
* **Status:** Dipecah dari problem 001 sesuai jawaban Q5. Belum ada pekerjaan. Placeholder siap — akan diisi penuh saat pengguna siap untuk memulai problem ini.

#### 1. Laporan Asli Pengguna

_(belum ada — berasal dari jawaban Q5 problem 001: "Komentar doc di `feed.ts` menginstruksikan kontributor untuk 'add a new entry at the TOP of WHATS_NEW for every shipped change'. Ini ditegakkan oleh disiplin reviewer saja — tidak ada test yang menangkap 'ditambahkan di bawah' atau 'id duplikat'.")_

#### 2. Interpretasi Problem (ringkas)

Dokumen doc-comment di `apps/web/src/lib/whats-new/feed.ts` menginstruksikan kontributor untuk "add a new entry at the TOP of WHATS_NEW for every shipped change". Aturan ini hanya ditegakkan oleh disiplin reviewer — tidak ada mekanisme otomatis (test, type-level, atau runtime check) yang mendeteksi:

* Entri baru ditambahkan di akhir array, bukan di awal.
* Dua entri memiliki `id` yang sama (duplikat).

Akibat yang mungkin jika aturan dilanggar:

* **Entri di akhir**: `getLatestWhatsNewId()` selalu membaca `WHATS_NEW[0]?.id`, jadi entri baru di akhir tidak pernah muncul sebagai "terbaru" dan `WhatsNewCard` tidak pernah auto-membuka untuk entri tersebut. Indikator "unseen" ikut terpengaruh.
* **Id duplikat**: `<li key={entry.id}>` di `whats-new-card.tsx` akan memicu React warning. `hasUnseen()` di store membandingkan `getLatestWhatsNewId()` dengan `lastSeenId`; jika id cocok dengan yang sudah di-dismiss sebelumnya, indikator unseen bisa langsung dianggap "sudah dilihat" walaupun sebenarnya belum.

#### 3. Acceptance Criteria

_(akan diisi saat problem dimulai)_

#### 4. Actionable Tasks

_(akan diisi saat problem dimulai)_

#### 5. Definition of Done

_(akan diisi saat problem dimulai)_

#### 6. File yang Kemungkinan Terlibat

_(akan diisi saat problem dimulai — kandidat: `apps/web/src/lib/whats-new/feed.ts`, `apps/web/src/stores/whats-new-store.ts`, `apps/web/src/components/whats-new/whats-new-card.tsx`, test baru di bawah `apps/web/`)_

#### 7. Risiko

_(akan diisi saat problem dimulai)_

#### 8. Pertanyaan untuk Review

_(akan diisi saat problem dimulai — kandidat: apakah cukup test unit sederhana, atau perlu CI hook; apakah id harus typed-union daripada string bebas; apakah ingin migrasi id lama)_

---

### Problem 004 — Pembersihan stub mati `ChangelogNotification`

* **Tanggal / waktu:** 2026-06-20 08:56 SEAST
* **Status:** Dipecah dari problem 001 sesuai jawaban Q6. Belum ada pekerjaan. Placeholder siap — akan diisi penuh saat pengguna siap untuk memulai problem ini.

#### 1. Laporan Asli Pengguna

_(belum ada — berasal dari jawaban Q6 problem 001: "`ChangelogNotification` dipertahankan sebagai komponen no-op `return null` tetapi masih diimpor dan di-render oleh dua halaman. Itu juga menulis ke localStorage key `last-seen-version` yang tidak ada dalam codebase yang membacanya.")_

#### 2. Interpretasi Problem (ringkas)

`apps/web/src/lib/changelog/components/changelog-notification.tsx` adalah komponen yang dipertahankan sebagai no-op (`return null`). Komponen ini:

* Masih diimpor dan di-render oleh dua halaman: `apps/web/src/app/editor/[project_id]/page.tsx` (baris 59–61, 110) dan `apps/web/src/app/projects/page.tsx` (baris 93, 303).
* Menulis ke localStorage key `last-seen-version` setiap kali mount — tidak ada pembaca key ini di codebase (write-only, dead state).
* Tidak me-render apa pun yang terlihat pengguna.

Akibat: bundle size bertambah kecil, efek `useState`/`useEffect` yang tidak perlu di-bundle, dan data mati di localStorage pengguna. Cleanup yang tepat adalah menghapus komponen dan semua import-nya.

#### 3. Acceptance Criteria

_(akan diisi saat problem dimulai)_

#### 4. Actionable Tasks

_(akan diisi saat problem dimulai)_

#### 5. Definition of Done

_(akan diisi saat problem dimulai)_

#### 6. File yang Kemungkinan Terlibat

_(akan diisi saat problem dimulai — kandidat: `apps/web/src/lib/changelog/components/changelog-notification.tsx` (dihapus), `apps/web/src/app/editor/[project_id]/page.tsx` (hapus import + render), `apps/web/src/app/projects/page.tsx` (hapus import + render), kemungkinan update test)_

#### 7. Risiko

_(akan diisi saat problem dimulai — kandidat: jika ada pengguna yang mengandalkan key `last-seen-version` di localStorage (mis. ekstensi browser), penghapusan komponen tidak menghapus data; ini adalah write-only key, jadi tidak ada kehilangan data.)_

#### 8. Pertanyaan untuk Review

_(akan diisi saat problem dimulai — kandidat: apakah akan menghapus komponen sepenuhnya atau hanya membungkam (deprecation path); apakah perlu migrasi data localStorage; apakah perlu changelog entry tentang perubahan)_

---

### Problem 005 — Console error di tab Overlays: "Style property values shouldn't contain a semicolon."

* **Tanggal / waktu:** 2026-06-20 09:09 SEAST
* **Status:** Fix diterapkan pada 2026-06-20 09:18 SEAST. Strategi A dipakai: helper parser di file baru dan `overlays.tsx` memakai helper tersebut. Lint, typecheck, dan validasi parser terhadap 161 overlay lulus. Menunggu hand-test manual pengguna di browser sebelum problem ditutup sebagai selesai.

#### 1. Laporan Asli Pengguna

> Di tab `Overlays`, muncul banyak console error, sekitar 128 issues.
>
> Error utama:
> `Style property values shouldn't contain a semicolon.`
>
> Next.js menunjuk ke file:
> * `apps/web/src/components/editor/panels/assets/views/overlays.tsx`
> * error terjadi saat render `<OverlayItem key={preset.id} preset={preset} />`
> * sekitar line 546–547
>
> Kemungkinan masalah:
> Ada inline style/CSS value pada preset overlay yang memasukkan value seperti `background: radial-gradient(...);` ke dalam property React style, padahal React style value seharusnya hanya `radial-gradient(...)` tanpa `background:` dan tanpa semicolon.
>
> Expected behavior:
> * Tab `Overlays` tidak memunculkan console error.
> * Semua overlay preset tetap tampil normal.
> * Background/preview overlay tetap terlihat sesuai desain.
> * Tidak ada style value yang mengandung `background:` atau `;` di React inline style.
> * Fix harus kecil dan hanya menyentuh file terkait overlay jika memungkinkan.
>
> Ikuti rules di folder `stabilize/`. Jangan edit source code dulu. Tulis ulang problem ini ke `stabilize/PROBLEM.MD` lengkap dengan:
> * interpreted problem
> * acceptance criteria
> * actionable tasks
> * Definition of Done
> * files likely involved
> * risks
> * questions for review
>
> Update `MAINTENANCE.MD` dan `TODO.MD` sesuai rules. Setelah itu stop dan minta aku review. Saya sudah verifikasi dan tidak ada regresi.

#### 2. Interpretasi Problem

**Hipotesis terkonfirmasi dari pembacaan kode.**

`apps/web/src/lib/presets/overlays.ts` (file data) mendefinisikan field `css` pada setiap preset sebagai **string deklarasi CSS penuh** (bukan hanya nilai). Contoh dari 161 entry:

* `"background: radial-gradient(circle at 80% 20%, #ffb347 0%, #ff5e3a 35%, transparent 70%);"` (LightLeak)
* `"background-color: transparent;"` — ~38 entry di Dust, Snow, Rain, Glitter, Sparkle, Bokeh
* `"background-image: radial-gradient(circle, #000 30%, transparent 35%); background-size: 6px 6px;"` (Halftone)
* `"background-image: radial-gradient(circle, #000 30%, transparent 35%); background-size: 8px 8px; mask: linear-gradient(180deg, #000, transparent);"` (Halftone, multi-deklarasi)
* `"box-shadow: inset 0 0 30px 5px #ff00aa, inset 0 0 60px 15px #ff00aa; background: transparent;"` (Neon, multi-deklarasi dengan `box-shadow` + `background`)
* `"background: url(\"data:image/svg+xml;utf8,...\") #fff;"` (Paper, data URL dengan `;` di dalam tanda kutip)

`apps/web/src/components/editor/panels/assets/views/overlays.tsx` baris 509 menggunakan `css` tersebut sebagai berikut:

```ts
previewStyle: { background: overlay.css },
```

Ini menggabungkan string deklarasi penuh sebagai **nilai** property `background` di React inline style, menghasilkan object seperti `{ background: "background: radial-gradient(...);" }`. React memvalidasi nilai property style di dev-mode dan menolak string yang mengandung `;` (atau `:`), memunculkan warning "Style property values shouldn't contain a semicolon." untuk setiap preset yang di-render.

**Mengapa "sekitar 128 issues":**

* 161 preset melalui jalur `presetOverlayPresets`.
* React di dev-mode menampilkan warning per render. Next.js dengan React strict mode me-render dua kali, sehingga total warning bisa mendekati 161 × 2 ≈ 322; jumlah aktual bisa lebih kecil karena de-duplication internal atau hanya sebagian preset yang ter-render (scroll, filter kategori).
* Hampir semua 161 entry memicu (termasuk yang `css`-nya `"background-color: transparent;"` yang tetap mengandung `;`).
* Mungkin ada warning dev-mode lain (mis. deprecation, key props) yang digabung ke counter yang ditampilkan Next.js.

**Entry `previewStyle` lain di file yang sama (lines 82, 98, 114, ..., 305, 474, 492)** sudah benar: mereka menulis `{ background: <value> }` dengan `<value>` berupa string nilai saja (tanpa prefix property dan tanpa trailing `;`). Baris 509 adalah satu-satunya jalur yang secara langsung menggunakan `overlay.css` (string deklarasi penuh) sebagai nilai.

**Penelusuran dependency:**

* `apps/web/src/lib/presets/overlays.ts` — definisi data (161 entry).
* `apps/web/src/lib/presets/types.ts` — `Overlay` interface dengan field `css: string` (baris 115).
* `apps/web/src/components/editor/panels/assets/views/overlays.tsx` baris 5 (import) dan baris 509 (consumer) — **satu-satunya pengguna `Overlay.css` di seluruh repo** (terkonfirmasi via grep: tidak ada barrel export, tidak ada consumer lain di `apps/web/src`).
* Mengubah consumer (Strategi A) **aman** karena tidak ada kode lain yang bergantung pada format `css`.

#### 3. Acceptance Criteria

1. Console di tab Overlays tidak menampilkan error `Style property values shouldn't contain a semicolon.` (atau warning React setara) saat pertama render maupun saat re-render (filter kategori, scroll, hover).
2. Semua 161 overlay preset di tab Overlays tetap me-render background/preview secara visual benar — tidak ada preset yang tiba-tiba kehilangan background, menjadi kosong, atau tampil berbeda karena perubahan.
3. Properti CSS yang dipakai dalam data (`background`, `background-color`, `background-image`, `background-size`, `box-shadow`, `mask`) tetap diterapkan untuk setiap preset sesuai desain.
4. Tidak ada regresi pada:
   * Tab asset lain (Effects, Transitions, Text, Templates, Stickers, Animations, Captions) yang memakai pattern `previewStyle` serupa.
   * Render preset yang tidak menggunakan jalur `overlay.css` (mis. 150 `genOverlays` Wash, dan `presetOverlayPresets` lain di lines 82–305).
   * Lint (`bun run lint:web`) dan typecheck (`bunx tsc --noEmit` di `apps/web`).
5. Fix minimal, terlingkup, dan hanya menyentuh file terkait overlay (atau satu file helper kecil), sesuai permintaan.
6. Data di `apps/web/src/lib/presets/overlays.ts` **tidak disentuh** kecuali Strategi B atau C disetujui secara eksplisit (lihat §8 Q1).
7. Tipe publik `Overlay.css: string` di `apps/web/src/lib/presets/types.ts` **tidak diubah** (tidak menambah/menghapus field, tidak mengubah tipe), kecuali Strategi C disetujui.

#### 4. Actionable Tasks

1. **Konfirmasi akar penyebab di runtime**: jalankan dev server, buka tab Overlays, amati console — verifikasi error persis menunjuk ke `overlays.tsx` baris 509 dan/atau nilai `overlay.css` yang tidak valid. Tangkap satu baris `css` penyebab.
2. **Klasifikasi data**: scan `apps/web/src/lib/presets/overlays.ts` dan klasifikasikan 161 entry:
   * Properti apa saja yang muncul di seluruh dataset? (konfirmasi: `background`, `background-color`, `background-image`, `background-size`, `box-shadow`, `mask`.)
   * Berapa entry yang multi-deklarasi?
   * Apakah ada entry dengan `;` di dalam string (mis. data URL SVG)? — ya, di Paper.
3. **Tentukan strategi fix** (lihat §8 Q1–Q3):
   * **Strategi A (default, paling kecil):** tambah helper `parseOverlayCss(css: string): CSSProperties` di `overlays.tsx` (atau file helper baru). Helper memecah string dengan `;`, lalu `:` per deklarasi, konversi `kebab-case` ke `camelCase`, dan skip `;` di dalam tanda kutip. Ubah baris 509 dari `previewStyle: { background: overlay.css }` menjadi `previewStyle: parseOverlayCss(overlay.css)`.
   * **Strategi B (data-centric, invasive):** edit 161 entry `css` di `overlays.ts` — strip prefix property dan trailing `;`, pisahkan multi-deklarasi menjadi field baru. Berisiko lebih besar, menyentuh 161 baris.
   * **Strategi C (kompromi):** tambah field baru `cssValue` (atau `style`) di `Overlay` interface; biarkan `css` lama untuk backward compat. Ubah baris 509 untuk memilih field baru. Mengubah API publik.
4. **Usulkan diff** strategi yang dipilih, dengan kutipan `file:line` dan before/after singkat.
5. **Tunggu persetujuan** strategi dari pengguna.
6. **Terapkan fix**, jalankan `bun run lint:web` dan `bunx tsc --noEmit` di `apps/web`, verifikasi tidak ada error baru.
7. **Verifikasi visual** di dev server: buka tab Overlays, periksa:
   * Console bersih.
   * Semua preset tampil dengan benar (cek subset: satu entry `LightLeak` untuk `background:`, satu entry `Dust` untuk `background-color: transparent`, satu entry `Halftone` untuk multi-deklarasi `background-image` + `background-size`, satu entry `Neon` untuk `box-shadow`, satu entry `Paper` untuk data URL dengan `;` di dalam string).
   * Tidak ada regresi pada tab asset lain.
8. **Tambahkan entri maintenance** di `MAINTENANCE.MD` dan perbarui `STATE.MD` / `TODO.MD`.
9. **Catat verifikasi** oleh pengguna di entri maintenance.

#### 5. Definition of Done

* Console di tab Overlays bersih dari error `Style property values shouldn't contain a semicolon.` (atau warning setara).
* Semua 161 overlay preset me-render background/preview yang benar secara visual.
* Properti `background`, `background-color`, `background-image`, `background-size`, `box-shadow`, dan `mask` (jika ada) tetap diterapkan dengan benar.
* `bun run lint:web` lulus tanpa error baru.
* `bunx tsc --noEmit` di `apps/web` lulus (exit 0).
* Tidak ada regresi di tab asset lain atau di komponen lain.
* Verifikasi visual oleh pengguna (atau headless via Playwright jika disetujui) tertangkap di entri maintenance.
* `STATE.MD` diperbarui.
* `TODO.MD` diperbarui.
* `PROBLEM.MD` status problem 005 dipindahkan ke "Selesai".
* File yang disentuh hanya `apps/web/src/components/editor/panels/assets/views/overlays.tsx` (atau satu file helper kecil baru), sesuai Strategi A.

#### 6. File yang Kemungkinan Terlibat

**In scope (sentuh jika perlu, sesuai strategi yang dipilih):**

* `apps/web/src/components/editor/panels/assets/views/overlays.tsx` — baris 509 (consumer `overlay.css`) dan baris 19–28 (tipe `OverlayPreset` lokal). Strategi A menyentuh file ini saja.
* `apps/web/src/lib/presets/overlays.ts` — definisi data (161 entry) — **hanya disentuh jika Strategi B dipilih**.
* `apps/web/src/lib/presets/types.ts` — `Overlay` interface dengan field `css` (baris 106–117) — **hanya disentuh jika Strategi C dipilih**.

**Adjacent (dibaca untuk konsistensi, tidak disentuh):**

* `apps/web/src/components/editor/panels/assets/views/transitions.tsx` — pattern `previewStyle` serupa (line 247).
* `apps/web/src/components/editor/panels/assets/views/animations.tsx` (lines 189, 219) — pattern `previewStyle` serupa.
* `apps/web/src/components/editor/panels/assets/views/text.tsx` (lines 135, 174, 187) — pattern `previewStyle` serupa.
* `apps/web/src/lib/transitions/types.ts` line 24 — `previewStyle: (params) => string` (signature berbeda).
* `apps/web/src/lib/transitions/definitions/*.ts` — definisi transisi.

**Konfigurasi / sumber data (jangan dibuka kecuali diperlukan):**

* `apps/web/src/lib/presets/index.ts` — barrel export (tidak mengekspor `Overlay`, terkonfirmasi via grep).

#### 7. Risiko

* **Parser harus handle multi-deklarasi**: data mengandung entry dengan 2–3 deklarasi (`background-image` + `background-size`; `box-shadow` + `background`; `background-image` + `background-size` + `mask`). Mitigasi: helper memecah berdasarkan `;` (top-level), lalu `:`.
* **`;` di dalam string**: beberapa entry `Paper` mengandung `url("data:image/svg+xml;utf8,...")` dengan `;` di dalam tanda kutip. Parser harus skip `;` di dalam `"..."` atau `'...'`. Mitigasi: tracking state inside-quotes saat split.
* **Konversi `kebab-case` → `camelCase`**: React inline style menggunakan `backgroundColor` (camelCase) untuk CSS `background-color`. Mitigasi: helper mengkonversi dengan regex `-([a-z])` → upper.
* **Preservasi `url("...")`**: parser tidak boleh memotong string di dalam `url("...")`. Mitigasi: parser skip karakter `;` di dalam tanda kutip.
* **Regresi pada tab lain**: jika helper dipindahkan ke shared util dan dipakai di tempat lain yang memiliki format berbeda, bisa breakage. Mitigasi: helper disimpan lokal di `overlays.tsx` atau di file khusus yang hanya di-impor di sana.
* **Nilai property tak dikenal**: jika data mengandung property yang tidak valid untuk React (mis. `-webkit-` prefix), React akan silent-drop. Tidak ada risiko fungsional, hanya tidak ada efek visual.
* **Tidak ada area sensitif yang disentuh** (auth, API key, env var, migrasi, AI tool calls, export/render, Rust/WASM, WebGPU/WGSL, payment). Hanya UI.
* **Strategi B invasive**: menyentuh 161 entry. Risiko typo sangat tinggi. Mitigasi: tidak dipilih (default adalah A).

#### 8. Pertanyaan untuk Review

* **Q1. Strategi fix**: apakah Anda memilih **Strategi A** (parser di consumer, default yang saya usulkan), **Strategi B** (edit 161 entry data), atau **Strategi C** (field baru di `Overlay`)? Strategi A paling kecil dan tidak menyentuh data atau API.
* **Answer = A** — pakai Strategi A: parser di consumer, tidak edit 161 entry data, tidak ubah API `Overlay`.
* **Q2. Lokasi helper**: jika Strategi A, apakah helper `parseOverlayCss` diletakkan inline di `overlays.tsx` atau di file baru `apps/web/src/lib/presets/css-parser.ts`? (Inline = paling kecil; file terpisah = lebih reusable tapi satu file tambahan.)
* **Answer = File baru** — helper dibuat di file baru, bukan inline di `overlays.tsx`.
* **Q3. Test untuk parser**: apakah Anda ingin saya tambahkan unit test kecil untuk parser (kasus multi-deklarasi, `;` di dalam data URL, `kebab-case` ke `camelCase`), atau cukup hand-test di dev server?
* **Answer = Hand-test aja** — tidak tambah unit test untuk parser.
* **Q4. Verifikasi headless**: apakah Anda ingin saya spin up dev server dan capture screenshot via Playwright untuk verifikasi, atau Anda verifikasi manual di browser?
* **Answer = Manual aja aku di browser** — verifikasi visual dilakukan manual oleh pengguna di browser.
* **Q5. Penutupan problem 002**: Anda menyatakan "Saya sudah verifikasi dan tidak ada regresi" untuk fix modal "What's New" (problem 002). Apakah ini cukup untuk menutup problem 002 sebagai selesai, atau Anda ingin satu langkah verifikasi tambahan (mis. capture screenshot)?
* **Answer = Cukup tutup dengan konfirmasi tidak ada regresi** — problem 002 tetap ditutup sebagai selesai tanpa capture screenshot tambahan.

---

### Problem 006 — Category chips Sound effects kepotong di tab Audio

* **Tanggal / waktu:** 2026-06-20 09:32 SEAST
* **Status:** Menunggu review pengguna. Tidak ada kode sumber yang diedit. Tidak ada fix yang diterapkan.

#### 1. Laporan Asli Pengguna

> Di tab `Audio` bagian `Sound effects`, kategori kecil/chip di bawah search bar terlihat kepotong di sisi kanan. Contohnya kategori seperti `Amb...` tidak tampil penuh karena area kategori tidak menangani overflow dengan benar.
>
> Expected behavior:
>
> * Category chips di bawah search bar tidak boleh kepotong.
> * Jika kategori terlalu banyak, harus ada handling yang rapi:
>   * horizontal scroll yang halus, atau
>   * wrap ke baris berikutnya jika lebih cocok dengan layout.
> * Teks kategori harus tetap terbaca.
> * Layout tidak boleh keluar dari container panel.
> * Tampilan tetap rapi di ukuran layar kecil.
> * Search bar dan filter icon tetap sejajar dan tidak rusak.
>
> Area yang perlu diaudit:
>
> * Audio panel / Sound effects view
> * Komponen category chips/filter tags
> * Styling container di bawah search bar
>
> Ikuti rules di folder `stabilize/`.
>
> Jangan edit source code dulu.
>
> Tulis ulang problem ini ke `stabilize/PROBLEM.MD` lengkap dengan:
>
> * interpreted problem
> * acceptance criteria
> * actionable tasks
> * Definition of Done
> * files likely involved
> * risks
> * questions for review
>
> Update `MAINTENANCE.MD` dan `TODO.MD` sesuai rules.
>
> Setelah itu stop dan minta aku review.

#### 2. Interpretasi Problem

Di tab `Audio` → `Sound effects`, deretan category chip di bawah search bar tidak menangani overflow secara rapi pada lebar panel tertentu. Akibatnya chip di sisi kanan terlihat terpotong; contoh yang dilaporkan adalah kategori `Ambient` yang tampak seperti `Amb...` atau hanya terlihat sebagian.

Pembacaan kode read-only menemukan area utama:

* `apps/web/src/components/editor/panels/assets/views/sounds.tsx`:
  * `SoundsView` me-render tab `Sound effects` pada line 70–82.
  * `SoundEffectsView` me-render search row + filter button pada line 255–293.
  * `CategoryBar` untuk Sound effects dipanggil pada line 295–306 dengan `categories={SOUND_LABELS}`.
  * `SOUND_CATEGORIES` berisi 10 label: `Whoosh`, `Impact`, `Click`, `Riser`, `Pop`, `Cinematic`, `Ambient`, `Lofi`, `Nature`, `Beep` (line 39–50).
* `apps/web/src/components/editor/panels/assets/views/category-bar.tsx`:
  * Komponen shared `CategoryBar` memang didesain sebagai horizontal scroll row (komentar line 3–8).
  * Container menggunakan `scrollbar-hidden -mx-0.5 flex items-center gap-1.5 overflow-x-auto px-0.5 pb-1` (line 31).
  * Button chip menggunakan `shrink-0 ... whitespace-nowrap` (line 43), jadi text chip seharusnya tidak wrap/truncate secara internal.

Hipotesis awal: masalah bukan karena text chip `Ambient` secara eksplisit di-truncate oleh `CategoryBar`, tetapi karena container horizontal scroll di bawah search bar tidak punya lebar/overflow boundary yang cukup eksplisit pada layout `SoundEffectsView`. Kombinasi `scrollbar-hidden`, negative margin kecil (`-mx-0.5`), dan container parent yang berada dalam nested flex panel dapat membuat sisi kanan terlihat clipped tanpa affordance scroll yang jelas. Karena `CategoryBar` shared dipakai di Effects, Overlays, Transitions, Text, Templates, Animations, Adjustments, dan Sounds, fix harus dipilih hati-hati: apakah memperbaiki shared component atau hanya instance Sound effects.

#### 3. Acceptance Criteria

1. Di tab `Audio` → `Sound effects`, semua category chip di bawah search bar terbaca penuh saat berada dalam area visible.
2. Jika jumlah chip melebihi lebar panel, overflow ditangani rapi dengan salah satu pendekatan yang disetujui:
   * horizontal scroll yang halus dan jelas, tanpa chip terpotong secara membingungkan; atau
   * wrap ke baris berikutnya jika lebih cocok dengan layout panel.
3. Text kategori seperti `Ambient`, `Cinematic`, dan kategori lain tidak terpotong atau menjadi ellipsis yang tidak disengaja.
4. Layout chip tidak keluar dari container panel dan tidak menyebabkan horizontal scroll pada panel utama.
5. Search bar dan filter icon di line 255–293 tetap sejajar, tetap berfungsi, dan tidak berubah layout secara negatif.
6. Layout tetap rapi di viewport/panel kecil.
7. Jika fix menyentuh shared `CategoryBar`, semua pengguna `CategoryBar` lain tetap tidak regresi (Effects, Overlays, Transitions, Text, Templates, Animations, Adjustments, Filters).
8. Lint dan typecheck lulus.

#### 4. Actionable Tasks

1. **Verifikasi UI di browser**: buka tab Audio → Sound effects, cek apakah chip `Ambient` atau chip kanan lain memang clipped, dan catat viewport/panel width saat bug muncul.
2. **Inspeksi DOM/computed style** untuk menentukan elemen yang clipping:
   * container `CategoryBar` line 29–34 di `category-bar.tsx`;
   * parent `SoundEffectsView` line 255–306 di `sounds.tsx`;
   * wrapper `TabsContent` line 78–82 di `sounds.tsx`;
   * panel/scroll container di parent asset panel jika diperlukan.
3. **Pilih strategi fix** (lihat §8):
   * **Strategi A — shared horizontal scroll fix**: perkuat `CategoryBar` agar selalu `w-full min-w-0 max-w-full overflow-x-auto` dan tetap `shrink-0 whitespace-nowrap`. Dampaknya shared ke semua tab pemakai `CategoryBar`.
   * **Strategi B — sound-only wrapper fix**: bungkus instance `CategoryBar` di `sounds.tsx` dengan container `min-w-0 overflow-hidden` atau pass `className` khusus seperti `w-full min-w-0 max-w-full`. Dampak paling kecil ke tab lain.
   * **Strategi C — wrap chips**: ubah instance Sound effects agar chip bisa wrap (`flex-wrap`) di bawah search bar. Lebih readable, tapi bisa menambah tinggi area filter dan mengurangi ruang list sound.
4. **Usulkan diff kecil** sesuai strategi yang dipilih, tanpa mengubah logic search/filter.
5. **Tunggu approval implementasi** sebelum mengedit source code.
6. Setelah approval, terapkan fix, jalankan `bun run lint:web` dan `bunx tsc --noEmit` di `apps/web`.
7. Minta pengguna hand-test manual di browser pada panel kecil dan normal.
8. Update `MAINTENANCE.MD`, `STATE.MD`, `TODO.MD`, dan status problem ini setelah fix diverifikasi.

#### 5. Definition of Done

* Category chips Sound effects tidak kepotong di sisi kanan.
* Text chip tetap terbaca penuh, terutama `Ambient` dan `Cinematic`.
* Overflow kategori ditangani sesuai strategi yang disetujui (horizontal scroll rapi atau wrap).
* Search bar dan filter icon tetap sejajar dan berfungsi.
* Sound list tetap scroll normal dan tidak terdorong keluar layout.
* Tidak ada horizontal overflow pada panel utama.
* Tidak ada regresi visual pada tab lain jika `CategoryBar` shared disentuh.
* `bun run lint:web` lulus tanpa error baru.
* `bunx tsc --noEmit` di `apps/web` lulus.
* Pengguna hand-test manual dan mengonfirmasi tidak ada regresi.
* File governance diperbarui dan problem 006 ditutup sebagai selesai.

#### 6. File yang Kemungkinan Terlibat

**In scope utama:**

* `apps/web/src/components/editor/panels/assets/views/sounds.tsx`
  * line 39–50 — daftar `SOUND_CATEGORIES` (`Ambient` termasuk di sini).
  * line 255–293 — search bar + filter icon row.
  * line 295–306 — `CategoryBar` instance untuk Sound effects.
* `apps/web/src/components/editor/panels/assets/views/category-bar.tsx`
  * line 29–34 — container horizontal scroll.
  * line 38–50 — chip button styling.

**Adjacent (dibaca jika strategi shared dipilih):**

* `apps/web/src/components/editor/panels/assets/views/effects.tsx`
* `apps/web/src/components/editor/panels/assets/views/overlays.tsx`
* `apps/web/src/components/editor/panels/assets/views/transitions.tsx`
* `apps/web/src/components/editor/panels/assets/views/text.tsx`
* `apps/web/src/components/editor/panels/assets/views/templates.tsx`
* `apps/web/src/components/editor/panels/assets/views/animations.tsx`
* `apps/web/src/components/editor/panels/assets/views/adjustments.tsx`
* `apps/web/src/components/editor/panels/assets/views/filters.tsx`

#### 7. Risiko

* **Shared component regression**: `CategoryBar` dipakai banyak tab. Mengubah shared styling dapat memperbaiki Audio tetapi mengubah spacing/scrolling di tab lain. Mitigasi: jika ingin paling aman, pilih Strategi B (sound-only fix).
* **Scrollbar tersembunyi tetap membingungkan**: jika tetap pakai `scrollbar-hidden`, horizontal scroll mungkin bekerja tetapi user tidak sadar ada konten di kanan. Mitigasi: pertimbangkan fade/mask atau padding kanan, atau wrap.
* **Wrap chips mengurangi ruang list**: Strategi C membuat kategori lebih terbaca tapi bisa menambah tinggi filter area dan mengurangi area sound list, terutama di panel kecil.
* **Search row regresi**: perubahan parent layout bisa membuat search input dan filter icon tidak sejajar. Mitigasi: jangan sentuh search row kecuali computed style menunjukkan itu penyebab.
* **Tidak ada area sensitif yang disentuh**: ini UI-only, tidak menyentuh auth, API key, env var, database, AI tool calls, export/render, Rust/WASM, WebGPU/WGSL, atau payment.

#### 8. Pertanyaan untuk Review

* **Q1. Strategi fix**: pilih A (fix shared `CategoryBar`), B (fix khusus Sound effects), atau C (wrap chips)? Default saya: **B** karena paling kecil dan paling aman untuk stabilisasi.
* **Q2. Preferensi overflow**: untuk Sound effects, Anda lebih ingin horizontal scroll atau wrap ke baris berikutnya?
* **Q3. Scrollbar/fade affordance**: jika memilih horizontal scroll, apakah perlu affordance visual seperti fade kanan/kiri, atau cukup memastikan chip tidak terpotong dan scroll bisa dilakukan?
* **Q4. Scope regresi**: jika memilih A/shared, apakah Anda ingin saya cek semua tab pemakai `CategoryBar`, atau cukup Sound effects dulu?
* **Q5. Verifikasi**: setelah fix diterapkan, apakah Anda akan hand-test manual di browser seperti problem 005, atau Anda ingin saya coba jalankan verifikasi headless?
