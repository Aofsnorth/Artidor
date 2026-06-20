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
* **Status:** Fix diterapkan pada 2026-06-20 09:42 SEAST. Menunggu hand-test manual pengguna. Shared `CategoryBar` tidak diubah; `STATE.MD` tidak disentuh sampai pengguna test dan approve.

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
* **Answer = B** — fix khusus Sound effects, tidak mengubah shared `CategoryBar`.
* **Q2. Preferensi overflow**: untuk Sound effects, Anda lebih ingin horizontal scroll atau wrap ke baris berikutnya?
* **Answer = Horizontal Scroll** — gunakan horizontal scroll, bukan wrap.
* **Q3. Scrollbar/fade affordance**: jika memilih horizontal scroll, apakah perlu affordance visual seperti fade kanan/kiri, atau cukup memastikan chip tidak terpotong dan scroll bisa dilakukan?
* **Answer = Perlu fade** — tambahkan affordance fade.
* **Q4. Scope regresi**: jika memilih A/shared, apakah Anda ingin saya cek semua tab pemakai `CategoryBar`, atau cukup Sound effects dulu?
* **Answer = Cek semua tab pemakai CategoryBar** — meskipun fix dipilih khusus Sound effects, semua pemakai `CategoryBar` dicek agar tidak ada perubahan shared yang tidak disengaja.
* **Q5. Verifikasi**: setelah fix diterapkan, apakah Anda akan hand-test manual di browser seperti problem 005, atau Anda ingin saya coba jalankan verifikasi headless?
* **Answer = Verifikasi manual** — pengguna akan test manual di browser.

#### 9. Catatan Implementasi

* Fix diterapkan hanya di `apps/web/src/components/editor/panels/assets/views/sounds.tsx`.
* Instance Sound effects `CategoryBar` dibungkus dengan container `relative min-w-0 max-w-full overflow-hidden` agar overflow horizontal punya batas eksplisit di panel ini.
* `CategoryBar` Sound effects diberi `w-full min-w-0 max-w-full scroll-smooth pr-8` agar horizontal scroll tetap terjadi di dalam area panel dan chip terakhir punya ruang sebelum fade kanan.
* Fade kanan ditambahkan sebagai overlay `pointer-events-none` dengan `bg-gradient-to-l from-background to-transparent` untuk memberi affordance bahwa chip masih bisa di-scroll.
* `apps/web/src/components/editor/panels/assets/views/category-bar.tsx` tidak diubah.
* Semua pemakai `<CategoryBar` dicek ulang via grep: `adjustments.tsx`, `animations.tsx`, `effects.tsx`, `filters.tsx`, `overlays.tsx`, `sounds.tsx`, `templates.tsx`, `text.tsx`, `transitions.tsx`.
* `bun run lint:web` lulus tanpa error baru; 4 warning lama tetap ada dan tidak disentuh.
* `bunx tsc --noEmit` di `apps/web` lulus.
* Designer anti-slop detector pada `sounds.tsx` tidak menemukan anti-pattern.
* Menunggu pengguna hand-test Audio → Sound effects sebelum problem ditutup dan `STATE.MD` diperbarui.

---

### Problem 007 — Audit label storage `2 GB FREE` di sidebar kiri bawah editor

* **Tanggal / waktu:** 2026-06-20 09:46 SEAST
* **Status:** Selesai. Fix diterapkan pada 2026-06-20 11:43 SEAST dan diverifikasi aman oleh pengguna pada 2026-06-20 11:47 SEAST.

#### 1. Laporan Asli Pengguna

> Problem/user story:
>
> Di sidebar kiri bawah editor ada storage info yang menampilkan `2 GB FREE`.
>
> Aku ingin audit apakah angka storage ini benar atau misleading.
>
> Konteks:
>
> * Device-ku punya SSD sekitar 500GB.
> * Sisa storage fisik kira-kira 60–80GB.
> * Tapi app menampilkan `2 GB FREE`.
> * Aku ingin tahu apakah angka itu:
>
>   1. hardcoded,
>   2. browser storage quota,
>   3. IndexedDB/local app storage quota,
>   4. plan/free tier label,
>   5. atau bug/misinformation.
>
> Expected behavior:
>
> * Storage info tidak boleh misleading.
> * Jika angka itu bukan storage SSD asli, label harus jelas.
> * Jika menggunakan browser storage, gunakan/validasi dengan `navigator.storage.estimate()` jika relevan.
> * Jika angka 2GB adalah limit app/free tier, UI harus menjelaskan itu sebagai app limit, bukan free disk storage.
> * Jika angka hardcoded, catat sebagai bug.
> * Jangan klaim “free disk space” kalau app tidak benar-benar bisa membaca free disk OS.
> * UI harus tetap rapi dan tidak membuat user salah paham.
>
> Area yang perlu diaudit:
>
> * komponen sidebar/storage badge
> * logic storage usage/quota
> * IndexedDB/local project storage
> * any file containing `2 GB`, `storage`, `quota`, `free`, `usage`, or similar terms
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

Sidebar kiri bawah editor menampilkan storage badge yang secara visual terbaca sebagai `2 GB FREE`. Pengguna membandingkannya dengan free space fisik SSD perangkat (sekitar 60–80GB) dan ingin audit apakah angka tersebut benar, hardcoded, berasal dari browser quota, berasal dari IndexedDB/local app storage, merupakan label plan/free tier, atau merupakan bug/misinformation.

Pembacaan source awal secara read-only menemukan bahwa badge sidebar berada di `apps/web/src/components/editor/panels/assets/tabbar.tsx` pada `StorageCard`:

* line 118 memanggil `useStorageEstimate()`.
* line 120 membuat `freeLabel` dari `formatStorageSize(storage.freeBytes)`.
* line 134 tooltip menulis `${used} used of ${total} available`.
* line 141–142 label bawahnya hanya `Free`.

Hook yang dipakai berada di `apps/web/src/hooks/use-storage-estimate.ts`:

* line 18–20 memakai `navigator.storage.estimate()`.
* line 23–25 menyimpan `usedBytes`, `totalBytes: quota`, dan `freeBytes: Math.max(0, quota - usage)`.
* line 43–53 memformat angka dengan basis desimal GB dan membulatkan `gb >= 1` ke integer `GB`.

Artinya, **berdasarkan pembacaan awal, string `2 GB FREE` tidak terlihat sebagai literal hardcoded di app source**. Lebih mungkin angka itu adalah hasil runtime dari browser Storage Estimate API: `quota - usage`, lalu dibulatkan. Namun audit penuh tetap perlu mengonfirmasi di browser yang sama dengan perangkat pengguna, karena `navigator.storage.estimate()` melaporkan quota storage origin/browser, **bukan** free disk OS secara langsung. UI label `Free` tanpa konteks bisa misleading jika pengguna membacanya sebagai free disk space fisik.

Problem ini adalah audit dan scoping fix. Tidak ada perubahan UI/source sebelum pengguna mereview dan menyetujui pemahaman.

#### 3. Acceptance Criteria

1. Audit menjawab secara eksplisit apakah angka `2 GB FREE` berasal dari hardcoded value, browser `navigator.storage.estimate()`, IndexedDB/local app storage usage, plan/free tier label, atau bug/misinformation.
2. Audit mengutip file dan line yang menentukan angka, label, tooltip, dan formatting storage badge.
3. Audit membedakan dengan jelas antara:
   * free disk OS/SSD fisik;
   * browser origin quota;
   * usage/quota storage app lokal (IndexedDB/OPFS/local app data);
   * business/plan limit jika ada.
4. Jika angka berasal dari browser storage quota, audit memvalidasi cara pembacaan terhadap `navigator.storage.estimate()` dan menjelaskan keterbatasan API tersebut.
5. Jika angka hardcoded ditemukan, audit mencatatnya sebagai bug dengan lokasi file/line.
6. Jika label `Free` dapat membuat pengguna mengira itu free disk OS, audit mencatat risiko UX/misinformation dan mengusulkan wording yang lebih jelas tanpa langsung mengedit kode.
7. Audit memeriksa relationship dengan storage persistence, IndexedDB, OPFS, media import quota check, dan halaman Projects yang juga memakai storage estimate.
8. Tidak ada source code di `apps/`, `rust/`, atau file lain yang diedit selama tahap audit problem ini.
9. `TODO.MD` dan `MAINTENANCE.MD` mencatat problem ini; `STATE.MD` tidak diubah sampai ada fix yang disetujui dan selesai.

#### 4. Actionable Tasks

1. Baca penuh `apps/web/src/components/editor/panels/assets/tabbar.tsx`, terutama `StorageCard`, untuk memastikan source UI badge sidebar kiri bawah editor.
2. Baca penuh `apps/web/src/hooks/use-storage-estimate.ts` untuk menentukan source angka, polling interval, fallback, dan formatting.
3. Baca `apps/web/src/services/storage/quota.ts` untuk membandingkan helper quota app/storage capacity yang dipakai saat import media.
4. Baca storage service dan adapters yang relevan:
   * `apps/web/src/services/storage/service.ts`
   * `apps/web/src/services/storage/indexeddb-adapter.ts`
   * `apps/web/src/services/storage/opfs-adapter.ts`
   * `apps/web/src/services/storage/types.ts`
5. Baca flow yang memakai quota untuk user-facing error:
   * `apps/web/src/lib/media/processing.ts`
   * `apps/web/src/core/managers/media-manager.ts`
   * `apps/web/src/lib/commands/media/add-media-asset.ts`
6. Baca storage persistence UI dan hook:
   * `apps/web/src/components/editor/dialogs/storage-persistence-dialog.tsx`
   * `apps/web/src/hooks/use-storage-persistence.ts`
7. Baca `apps/web/src/app/projects/stats-overview.tsx` karena halaman Projects juga memakai `useStorageEstimate()` dan melabelinya `Local storage`.
8. Grep seluruh repo untuk literal dan istilah terkait: `2 GB`, `2GB`, `GB FREE`, `storage`, `quota`, `free`, `usage`, `availableBytes`, `freeBytes`, `navigator.storage`, `storage.estimate`.
9. Jika pengguna menyetujui audit lanjutan, jalankan verifikasi runtime di browser/devtools:
   * catat nilai `await navigator.storage.estimate()`;
   * bandingkan `quota - usage` dengan angka badge;
   * catat browser, mode normal/private, dan apakah storage persistence granted.
10. Tulis hasil audit inline di bawah problem ini atau laporkan sebagai pesan, sesuai jawaban review.
11. Jika fix diperlukan, usulkan diff kecil terpisah yang kemungkinan hanya mengubah copy/tooltip/label di UI dan tidak mengubah logic quota tanpa approval.

#### 5. Definition of Done

* Audit menyatakan sumber angka `2 GB FREE` dengan confidence dan kutipan file:line.
* Audit menyatakan apakah angka tersebut bukan free disk SSD fisik, dan apakah UI saat ini misleading.
* Jika menggunakan `navigator.storage.estimate()`, audit menjelaskan bahwa nilainya adalah browser/origin storage estimate dan tidak setara dengan total free disk OS.
* Jika rounding/formatting membuat angka terlihat terlalu kasar, audit mencatat behavior formatting dan dampaknya.
* Jika ada label/copy yang berisiko misleading, fix kecil yang diusulkan memiliki wording yang jelas seperti `Browser storage`, `Local browser storage`, atau `App storage available` (wajib disetujui sebelum diedit).
* Tidak ada source code yang diedit selama tahap laporan problem/audit awal.
* `MAINTENANCE.MD` dan `TODO.MD` diperbarui.
* `STATE.MD` tidak diubah pada tahap ini.
* Setelah pengguna approve problem ini, AI membaca ulang `PROBLEM.MD` sebelum audit lanjutan atau usulan fix.

#### 6. File yang Kemungkinan Terlibat

**In scope utama:**

* `apps/web/src/components/editor/panels/assets/tabbar.tsx`
  * line 112 — `<StorageCard />` dirender di bawah tabbar editor.
  * line 117–152 — `StorageCard`.
  * line 120 — `freeLabel = formatStorageSize(storage.freeBytes)`.
  * line 132–135 — tooltip `used of available`.
  * line 138–142 — angka + label `Free`.
* `apps/web/src/hooks/use-storage-estimate.ts`
  * line 18–20 — `navigator.storage.estimate()`.
  * line 23–25 — `usedBytes`, `totalBytes`, `freeBytes`.
  * line 43–53 — `formatStorageSize()` memakai basis 1,000,000,000 dan membulatkan GB.

**Storage/quota logic adjacent:**

* `apps/web/src/services/storage/quota.ts` — helper storage quota/capacity, `readStorageQuotaStatus()`, `availableBytes`, reserve 50MiB, dan error copy `Not enough browser storage...`.
* `apps/web/src/services/storage/service.ts` — `canStoreFile()`, `getStorageInfo()`, `isIndexedDBSupported()`, `isOPFSSupported()`.
* `apps/web/src/services/storage/indexeddb-adapter.ts` — adapter IndexedDB untuk project/sounds/metadata.
* `apps/web/src/services/storage/opfs-adapter.ts` — OPFS adapter memakai `navigator.storage.getDirectory()`.
* `apps/web/src/services/storage/types.ts` — tipe storage adapter/config.

**User-facing adjacent:**

* `apps/web/src/app/projects/stats-overview.tsx` — juga memakai `useStorageEstimate()`, tetapi labelnya `Local storage` dan value yang ditampilkan adalah `usedBytes`, bukan free.
* `apps/web/src/components/editor/dialogs/storage-persistence-dialog.tsx` — copy tentang browser dapat menghapus project saat storage rendah.
* `apps/web/src/hooks/use-storage-persistence.ts` — memakai `navigator.storage.persist()` / `persisted()`.
* `apps/web/src/lib/media/processing.ts` — import media memeriksa kapasitas dan menampilkan `Not enough browser storage...`.
* `apps/web/src/core/managers/media-manager.ts` — quota exceeded toast saat save media gagal.
* `apps/web/src/lib/commands/media/add-media-asset.ts` — quota exceeded toast pada command failure.

**Dokumentasi yang muncul di grep tetapi bukan source UI:**

* `docs/features-blueprint.md` dan `docs/features-blueprint-3.md` mengandung beberapa referensi `2GB`/`2 GB` untuk requirement RAM/VRAM/storage, tetapi pencarian awal tidak menemukan literal `2 GB FREE` di app source.

#### 7. Risiko

* **Misinformation UX:** label `Free` dapat dibaca sebagai free SSD/disk OS, padahal browser web app umumnya hanya bisa melihat quota storage origin via Storage Estimate API, bukan free disk OS yang sebenarnya.
* **Browser-dependent quota:** `navigator.storage.estimate()` berbeda antar browser, profile, private/incognito mode, site engagement, persistent storage, dan device. Angka 2GB mungkin benar untuk quota browser saat itu, tetapi tetap bukan angka disk fisik.
* **Rounding misleading:** `formatStorageSize()` membulatkan GB ke integer. Nilai seperti 1.6GB atau 2.4GB sama-sama dapat tampil sebagai `2 GB`, sehingga badge mungkin terlalu kasar untuk status kapasitas.
* **Inconsistency antar UI:** sidebar menulis `Free`, halaman Projects menulis `Local storage`, error import menulis `browser storage`. Audit perlu menentukan wording mana yang paling benar dan konsisten.
* **Fix copy dapat mengubah layout kecil:** sidebar hanya lebar `4.5rem`, sehingga label yang lebih jelas bisa overflow. Perlu wording pendek atau tooltip yang jelas jika fix nanti disetujui.
* **No OS disk API:** browser tidak menyediakan API umum yang aman untuk membaca free disk OS secara langsung. Jangan mencoba membuat klaim SSD free space tanpa API yang valid.
* **Tidak ada area sensitif yang disentuh saat audit:** problem ini UI/storage-local. Namun fix logic storage perlu hati-hati karena berpengaruh pada import media, IndexedDB/OPFS, dan data lokal pengguna.

#### 8. Pertanyaan untuk Review

* **Q1. Bentuk audit:** apakah Anda ingin hasil audit lengkap ditulis inline di bawah problem ini, atau cukup sebagai pesan laporan terpisah?
* **Answer = Pesan laporan + ringkasan di `PROBLEM.MD`** — hasil audit lengkap dikirim sebagai message/report, dan ringkasan penting tetap dicatat di `PROBLEM.MD`.
* **Q2. Verifikasi runtime:** apakah Anda ingin saya menjalankan dev server/browser dan membaca `navigator.storage.estimate()` dari app, atau cukup audit source code dulu?
* **Answer = Ya, lakukan runtime verification jika memungkinkan** — jalankan/cek app di browser, baca `await navigator.storage.estimate()`, lalu bandingkan `quota`, `usage`, `quota - usage`, dan nilai yang ditampilkan sidebar.
* **Q3. Scope UI:** apakah audit/fix nanti hanya untuk badge editor sidebar, atau juga halaman Projects `Local storage` dan copy error `Not enough browser storage`?
* **Answer = Fix hanya editor sidebar storage badge untuk sekarang** — related UI seperti Projects `Local storage` boleh disebut, tetapi jangan dimodifikasi dulu.
* **Q4. Preferensi wording jika misleading:** jika angka ini browser quota, wording mana yang Anda prefer untuk fix nanti: `Browser storage`, `App storage`, `Local app storage`, atau wording lain?
* **Answer = `App storage` atau `Browser storage`** — tooltip/copy harus menjelaskan bahwa ini adalah browser storage yang tersedia untuk site/app ini, bukan free disk space SSD/OS.
* **Q5. Rounding:** apakah Anda ingin audit juga menilai apakah formatting `2 GB` harus lebih presisi seperti `1.8 GB`, atau fokus hanya pada label yang misleading?
* **Answer = Ya, cek rounding juga** — jika `2 GB` berasal dari nilai seperti `1.6 GB` atau `2.4 GB`, usulkan display lebih presisi seperti `1.6 GB` atau `2.4 GB`.
* **Q6. Batas source edit:** jika fix nanti hanya copy/tooltip di `tabbar.tsx`, apakah itu boleh sebagai perubahan kecil setelah review, atau Anda ingin audit report dulu tanpa usulan diff?
* **Answer = Jangan edit source code dulu** — berikan runtime audit result dan proposed minimal fix/diff plan lebih dulu, lalu stop dan tunggu approval sebelum source edit.

#### 9. Ringkasan Hasil Audit Runtime/Source

* **Bukan hardcoded:** literal `2 GB FREE`, `GB FREE`, dan angka storage badge tidak ditemukan sebagai literal di app source. Referensi `2GB`/`2 GB` yang ditemukan berada di dokumen blueprint requirement, bukan UI runtime.
* **Sumber angka:** editor sidebar `StorageCard` di `apps/web/src/components/editor/panels/assets/tabbar.tsx` mengambil `storage.freeBytes` dari `useStorageEstimate()` dan memformatnya sebagai label atas.
* **API yang dipakai:** `apps/web/src/hooks/use-storage-estimate.ts` memakai `navigator.storage.estimate()`, lalu menghitung `freeBytes = quota - usage`.
* **Runtime verification pada dev server `http://localhost:3000/editor/986246ae-800e-4d21-826a-5c3cd9bf8b9c`:**
  * `navigator.storage.estimate().quota = 10,737,730,167 bytes` (`10.737730167 GB`).
  * `navigator.storage.estimate().usage = 311,927 bytes` (`0.000311927 GB`).
  * `quota - usage = 10,737,418,240 bytes` (`10.73741824 GB`).
  * sidebar displayed value = `11 GB` with label `FREE`.
  * tooltip = `1 MB used of 11 GB available`.
  * `usageDetails.indexedDB = 311,927 bytes`.
  * `navigator.storage.persisted() = false`.
* **Kesimpulan runtime:** displayed value cocok dengan formatter saat ini (`Math.round(10.73741824) = 11 GB`). Jadi angka di badge adalah browser/origin storage estimate, bukan free SSD/OS disk space.
* **Klasifikasi:** bukan plan/free tier label; tidak ada evidence business plan storage limit. Ini bukan bug kalkulasi utama, tetapi **misleading UX/copy** karena label `Free` tidak menjelaskan bahwa angka itu browser storage untuk origin/site/app.
* **Rounding:** formatter saat ini membulatkan setiap nilai `>= 1 GB` ke integer. Nilai `1.6 GB` atau `2.4 GB` sama-sama bisa tampil sebagai `2 GB`, jadi untuk badge kecil ini display satu desimal lebih jujur (`1.6 GB`, `2.4 GB`, `10.7 GB`).
* **Scope fix yang diusulkan:** hanya `apps/web/src/components/editor/panels/assets/tabbar.tsx`. Jangan ubah halaman Projects atau shared storage hook dulu.
* **Rencana fix minimal:** ubah label bawah dari `Free` menjadi `App storage` atau `Browser storage`, ubah tooltip agar eksplisit “browser storage available for this site/app, not SSD/OS free disk space”, dan gunakan formatter lokal yang lebih presisi untuk sidebar badge.

#### 10. Catatan Implementasi

* Fix diterapkan hanya di `apps/web/src/components/editor/panels/assets/tabbar.tsx`.
* `use-storage-estimate.ts`, halaman Projects `Local storage`, dan storage/quota logic tidak diubah.
* Import `formatStorageSize` dihapus dari `tabbar.tsx` karena badge sekarang memakai formatter lokal.
* Ditambahkan `formatSidebarStorageSize()` lokal untuk sidebar badge:
  * GB ditampilkan dengan satu desimal (`10.7 GB`, bukan `11 GB`).
  * MB/TB tetap ringkas mengikuti pola visual sebelumnya.
* Label bawah badge diubah dari `Free` menjadi `Storage`.
* Tooltip diubah menjadi copy eksplisit: nilai adalah browser storage available untuk Artidor di device ini, bukan SSD/OS free disk space.
* Class label diperkecil ke `text-[0.5rem]`, `tracking-[0.04em]`, dan `whitespace-nowrap` agar `Storage` tetap compact dan tidak overflow di card sidebar.
* Runtime check setelah HMR/dev server aktif menunjukkan card text `10.7 GB\nSTORAGE`, tooltip `10.7 GB browser storage available to Artidor on this device. 1 MB used of 10.7 GB quota. This is not your SSD/OS free disk space.`, dan card tetap lebar `58px`.
* `bun run lint:web` lulus tanpa error baru; 4 warning lama tetap ada dan tidak disentuh.
* `bunx tsc --noEmit` di `apps/web` lulus.
* Designer anti-slop detector pada `tabbar.tsx` tidak menemukan anti-pattern.
* Pengguna mengonfirmasi fix aman pada 2026-06-20 11:47 SEAST. Problem ditutup.

---

### Problem 008 — Audit menyeluruh website/app Artidor

* **Tanggal / waktu:** 2026-06-20 11:50 SEAST
* **Status:** Audit selesai. Menunggu review pengguna dan persetujuan prioritas fix. Tidak ada source code yang diedit. `STATE.MD` tidak diperbarui.

#### 1. Laporan Asli Pengguna

> Audit seluruh website/app Artidor untuk mencari bug, masalah UX, error console, layout rusak, dan kemungkinan penyebab lag/performance issue.
>
> Scope audit: seluruh halaman utama app, editor page, assets panel, audio panel, overlays, effects, transitions, timeline, preview/player, inspector panel, sidebar, modals/popups, changelog / What's New, console errors, layout overflow, render lag, unnecessary re-render, heavy components, slow loading, memory leak risk, expensive loops/calculations, unnecessary API calls, broken responsive layout.
>
> Ikuti rules di folder `stabilize/`. Jangan edit source code dulu. Jangan langsung fix semua. Jangan tambah fitur baru. Jangan rewrite besar-besaran.

#### 2. Interpretasi Problem

Pengguna meminta audit komprehensif seluruh aplikasi Artidor untuk mengidentifikasi bug, masalah UX, error console, layout rusak, dan potensi performance issue. Audit mencakup static analysis (lint, typecheck, build, test runner), code inspection (source patterns), dan runtime verification (browser console, network, layout). Deliverable adalah laporan temuan terstruktur dengan prioritas dan rekomendasi urutan fix.

#### 3. Ringkasan Kondisi App

**Build & typecheck:** ✅ Lulus — `bun run build:web` berhasil (Next.js 16.1.3 Turbopack), `bunx tsc --noEmit` bersih.

**Lint:** 4 warning pre-existing (bukan error):
- `procedural-preview.ts:127` — non-null assertion
- `overlays.tsx:596` — unused `getOverlayPhotoUrl`
- `stickers.tsx:460` — unused `photoUrl`
- `transitions.tsx:228` — unused `hashString`

**Test runner:** ❌ Gagal — `bun run test` crash karena Playwright test files (`*.spec.ts` di `e2e/`) dimuat oleh Bun test runner yang tidak kompatibel dengan `test.describe()` API Playwright. Unit test di `services/storage/migrations/__tests__/` berjalan normal.

**Runtime console (seluruh halaman yang diuji):**

| Halaman/Panel | Error | Warning | Catatan |
|---|---|---|---|
| Home (`/`) | 0 | 0 | Bersih |
| Projects (`/projects`) | 2× Databuddy 402 | 0 | External analytics |
| Editor (default) | 2× Databuddy 402 | 2 (powerPreference, LCP image) | WebGPU + Next.js image |
| Editor → Overlays | 0 baru | 0 baru | Bersih |
| Editor → Effects | 0 baru | 5 baru (WGSL shader errors) | Fisheye shader gagal compile |
| Editor → Transitions | 0 baru | 0 baru | Bersih |
| Editor → Audio | 2× Freesound API 500 | 0 baru | External API gagal |
| Editor → Templates | 0 baru | 0 baru | Bersih |
| Editor → Settings | 0 baru | 0 baru | Bersih |
| Changelog (`/changelog`) | 2× Databuddy 402 | 0 | External analytics |
| Blog (`/blog`) | 1× Databuddy 402 | 0 | External analytics |

#### 4. Temuan Audit

##### 4.1 — ~~CRITICAL: WGSL Shader `fisheye` Gagal Compile (WebGPU)~~ ✅ FIXED

* **Severity:** `critical` → **Fixed** (2026-06-20 12:05, verified by user)
* **File:** `rust/crates/effects/src/shaders/fisheye.wgsl`
* **Masalah:** `textureSample()` dipanggil di dalam `if` block (non-uniform control flow). WebGPU spec melarang ini.
* **Fix diterapkan:** UV di-clamp ke `[0, 1]` sebelum `textureSample`, lalu out-of-bounds check dilakukan setelah sampling. WASM rebuilt. Lint, typecheck, build lulus. User konfirmasi efek terlihat benar.

##### 4.2 — HIGH: Freesound API 500 Error (Audio Tab)

* **Severity:** `high`
* **File:** `apps/web/src/app/api/sounds/search/route.ts:218-227`
* **Masalah:** Request ke `https://freesound.org/apiv2/search/text/` mengembalikan HTTP 500. Route mengembalikan status upstream langsung ke client tanpa graceful fallback.
* **Error runtime:** `Failed to fetch top sounds: Error: Failed to fetch: 500` — tab Audio menampilkan empty state tanpa pesan error yang informatif.
* **Kemungkinan penyebab:** API key tidak valid, Freesound API sedang down, atau rate limiting.
* **Dampak:** Tab Audio tidak menampilkan sound effects. UX: user melihat empty state tanpa penjelasan.
* **Fix yang diusulkan:**
  1. Tambahkan error handling yang lebih baik di route — return user-friendly error message.
  2. Di `sounds.tsx`, tampilkan pesan error yang jelas (misalnya "Sound search temporarily unavailable") alih-alih empty state.
  3. Pertimbangkan retry logic atau cache hasil sebelumnya.
* **Risiko fix:** Rendah. Tidak menyentuh area sensitif.

##### 4.3 — HIGH: Databuddy Analytics 402 Error (Semua Halaman)

* **Severity:** `high`
* **File:** `apps/web/src/app/layout.tsx:59-70`
* **Masalah:** Script `https://cdn.databuddy.cc/databuddy.js` dengan `data-client-id="UP-Wcoy5arxFeK7oyjMMZ"` mengembalikan HTTP 402 (Payment Required) di setiap halaman.
* **Dampak:** Console error di setiap halaman. Tidak mempengaruhi fungsionalitas app, tapi noise di console dan potensi tracking tidak berjalan.
* **Fix yang diusulkan:**
  1. Verifikasi apakah Databuddy subscription masih aktif.
  2. Jika sudah tidak dipakai, hapus script dari `layout.tsx`.
  3. Jika masih dipakai, perbarui `data-client-id` atau hubungi Databuddy support.
* **Risiko fix:** Rendah. Script analytics bukan bagian kritis.

##### 4.4 — MEDIUM: Test Runner Crash (`bun run test`)

* **Severity:** `medium`
* **File:** `apps/web/e2e/` (Playwright test files)
* **Masalah:** `bun run test` memanggil `bun test` yang mencoba memuat file Playwright (`*.spec.ts`) dari `apps/web/e2e/`. Bun test runner tidak kompatibel dengan `test.describe()` API Playwright, menyebabkan crash.
* **Dampak:** Tidak bisa menjalankan test suite. CI/CD mungkin gagal jika memakai `bun run test`.
* **Fix yang diusulkan:**
  1. Pisahkan unit test dan e2e test di `package.json` scripts: `"test": "bun test --exclude apps/web/e2e"` dan `"test:e2e": "playwright test"`.
  2. Atau gunakan filter pattern: `"test": "bun test apps/web/src"`.
* **Risiko fix:** Sangat rendah. Hanya perubahan konfigurasi.

##### 4.5 — MEDIUM: LCP Image Missing `loading="eager"` (Editor Header)

* **Severity:** `medium`
* **File:** `apps/web/src/components/editor/editor-header.tsx:244-250`
* **Masalah:** Logo Artidor (`/logos/artidor/logo-uploaded.png`) terdeteksi sebagai Largest Contentful Paint (LCP) element tapi tidak memiliki `loading="eager"`. Next.js `Image` component default `loading="lazy"`.
* **Dampak:** LCP metric bisa lebih lambat dari seharusnya, mempengaruhi Core Web Vitals score.
* **Fix yang diusulkan:** Tambahkan `priority` prop ke `Image` component di `editor-header.tsx:244`. Ini akan otomatis set `loading="eager"` dan `fetchPriority="high"`.
* **Risiko fix:** Sangat rendah. Prop `priority` adalah standard Next.js pattern.

##### 4.6 — LOW: WebGPU `powerPreference` Ignored on Windows

* **Severity:** `low`
* **File:** `rust/wasm/pkg/` (compiled WASM) atau `apps/web/src/services/renderer/gpu-renderer.ts`
* **Masalah:** Chromium warning: `The powerPreference option is currently ignored when calling requestAdapter() on Windows.` (Chrome bug 369219127).
* **Dampak:** Tidak mempengaruhi fungsionalitas. Hanya warning di console. GPU adapter tetap berfungsi.
* **Fix yang diusulkan:** Tidak ada action yang diperlukan dari sisi app. Ini adalah Chromium bug yang sedang ditracking upstream. Bisa suppress warning jika mengganggu, tapi tidak direkomendasikan.
* **Risiko fix:** N/A — tidak perlu fix.

##### 4.7 — LOW: 4 Lint Warnings (Unused Variables + Non-Null Assertion)

* **Severity:** `low`
* **Files:**
  - `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts:127` — non-null assertion
  - `apps/web/src/components/editor/panels/assets/views/overlays.tsx:596` — unused `getOverlayPhotoUrl`
  - `apps/web/src/components/editor/panels/assets/views/stickers.tsx:460` — unused `photoUrl`
  - `apps/web/src/components/editor/panels/assets/views/transitions.tsx:228` — unused `hashString`
* **Dampak:** Code cleanliness. Tidak mempengaruhi runtime behavior.
* **Fix yang diusulkan:** Hapus unused imports/variables. Untuk non-null assertion, tambahkan null check yang proper.
* **Risiko fix:** Sangat rendah.

#### 5. Acceptance Criteria (untuk audit ini)

1. Semua halaman utama app dibuka dan console diperiksa: ✅ Done.
2. Editor panel tabs (Overlays, Effects, Transitions, Audio, Templates, Settings) dibuka dan console diperiksa: ✅ Done.
3. Lint, typecheck, build, dan test dijalankan: ✅ Done (test runner crash tercatat).
4. Temuan dikategorikan severity (Critical/High/Medium/Low): ✅ Done.
5. Rekomendasi urutan fix disusun: ✅ Done (lihat §6).
6. Tidak ada source code yang diedit: ✅ Confirmed.
7. `STATE.MD` tidak diperbarui: ✅ Confirmed.

#### 6. Rekomendasi Urutan Fix

| Prioritas | Problem | Kompleksitas | Area Sensitif |
|---|---|---|---|
| 1 | 4.1 — Fisheye WGSL shader | Medium | ⚠️ Rust/WASM + WebGPU |
| 2 | 4.2 — Freesound API 500 error handling | Low | Tidak ada |
| 3 | 4.3 — Databuddy 402 cleanup | Low | Tidak ada |
| 4 | 4.4 — Test runner config fix | Very Low | Tidak ada |
| 5 | 4.5 — LCP image `priority` prop | Very Low | Tidak ada |
| 6 | 4.7 — Lint warnings cleanup | Very Low | Tidak ada |
| Skip | 4.6 — powerPreference warning | N/A | Chromium upstream bug |

**Task pertama yang paling aman:** Problem 4.4 (test runner config) — hanya mengubah `package.json` scripts, tidak menyentuh logic app, tidak ada risiko regresi. Atau Problem 4.5 (LCP image) — satu prop tambahan di satu file.

**Task dengan impact tertinggi:** Problem 4.1 (fisheye shader) — fix membuat effect berfungsi, tapi menyentuh Rust/WASM dan WebGPU/WGSL (area sensitif per `RULES.MD` §4).

#### 7. Risiko Keseluruhan

* **Tidak ada area sensitif yang disentuh selama audit.** Semua pembacaan source bersifat read-only.
* **Problem 4.1 (fisheye shader)** menyentuh Rust/WASM + WebGPU/WGSL — memerlukan persetujuan eksplisit per `RULES.MD` §4 sebelum fix.
* **Problem 4.2 (Freesound API)** melibatkan API key (`FREESOUND_API_KEY`) yang merupakan area sensitif per `RULES.MD` §4, tapi fix yang diusulkan hanya error handling di UI, bukan mengubah API key.
* **Problem 4.3 (Databuddy)** melibatkan third-party analytics script — bukan area sensitif, tapi keputusan bisnis (apakah analytics masih diperlukan).

#### 8. Pertanyaan untuk Review

* **Q1. Prioritas fix:** Apakah urutan prioritas di §6 sudah sesuai, atau ada yang ingin didahulukan/ditunda?
* **Answer = Sudah benar** — urutan prioritas sesuai.
* **Q2. Fisheye shader (4.1):** Apakah Anda ingin saya memperbaiki shader WGSL ini? Ini menyentuh Rust/WASM + WebGPU/WGSL. Perlu rebuild WASM.
* **Answer = Iya, perbaiki** — fix fisheye shader, rebuild WASM.
* **Q3. Databuddy (4.3):** Apakah Databuddy analytics masih dipakai? Jika tidak, boleh saya hapus script-nya dari `layout.tsx`?
* **Answer = Ya masih dipakai untuk Vercel nantinya** — jangan hapus. Akan dikonfigurasi saat deploy ke Vercel.
* **Q4. Freesound API (4.2):** Apakah API key masih valid? Apakah ini masalah transient (API sedang down) atau permanent (key expired)?
* **Answer = Belum ada API key-nya** — ini expected behavior saat development lokal tanpa key. Tidak perlu fix.
* **Q5. Task pertama:** Apakah saya mulai dari yang paling aman (4.4 test runner config atau 4.5 LCP image), atau langsung ke yang paling berdampak (4.1 fisheye shader)?
* **Answer = Yang paling berdampak** — mulai dari fisheye shader (4.1).

#### 9. Catatan Implementasi

* **§4.1 Fisheye shader:** Fix diterapkan 2026-06-20 12:05. Shader `fisheye.wgsl` di-refactor: UV di-clamp ke `[0, 1]` sebelum `textureSample`, out-of-bounds check dilakukan setelah sampling. WASM rebuilt. Lint, typecheck, build lulus. User konfirmasi efek terlihat benar pada 2026-06-20 12:10.

---

### Problem 009 — 2 Masalah UI di Editor (Preview Controls + Inspector Tabs)

* **Tanggal / waktu:** 2026-06-20 12:10 SEAST
* **Status:** Menunggu review pengguna. Audit source awal read-only sudah dilakukan. Tidak ada source code yang diedit. `STATE.MD` tidak diperbarui.

#### 1. Laporan Asli Pengguna

> **Issue A — Preview top-right controls muncul terlalu agresif**
>
> Di video preview, kontrol kanan atas seperti `Fit`, `16:9`, fullscreen/icon, dan menu `...` saat ini muncul ketika mouse hover ke area preview video secara umum.
>
> Expected behavior:
> * Kontrol tersebut hanya muncul ketika user hover ke area/hotspot kontrol kanan atas saja.
> * Hover di area tengah/kiri/bagian utama preview tidak boleh memunculkan kontrol kanan atas.
> * Kontrol tetap mudah diakses saat user mengarah ke area kanan atas preview.
> * Tidak mengganggu pengalaman melihat preview video.
>
> **Issue B — Inspector card/tab row harus horizontal scroll**
>
> Di panel Inspector, ada deretan card/tab seperti `Info`, `Transform`, `Audio`, `Speed`, dan tab lain jika ada.
>
> Masalah:
> * Deretan tab/card ini bisa overflow dan tidak nyaman diakses.
> * Aku ingin seluruh row card/tab bisa discroll ke kanan dan kiri.
> * Scroll harus horizontal saat mouse hover di area row tersebut.
> * User tidak perlu menekan `Shift` untuk horizontal scroll.
> * Mouse wheel biasa harus menggeser row ke kiri/kanan ketika pointer berada di atas row.
> * Jangan sampai scrolling malah mengganggu scroll vertikal panel bawahnya.
> * Tidak boleh ada distraksi scroll ke bawah saat fokusnya memang di row tab/card tersebut.
>
> Expected behavior:
> * Inspector tab/card row bisa horizontal scroll dengan mouse wheel biasa.
> * Scroll horizontal hanya aktif saat pointer hover di row tab/card.
> * Tidak menyebabkan page/panel vertical scroll yang mengganggu.
> * Tab/card tetap clickable dan keyboard/accessibility tetap aman.
> * Layout tetap rapi dan tidak overflow keluar panel.
> * Visual style tetap sama.

#### 2. Interpretasi Problem

**Issue A:** Preview panel (`apps/web/src/components/editor/panels/preview/index.tsx:362`) menggunakan `group-hover:opacity-100` pada container kontrol kanan atas. Ini berarti kontrol muncul saat mouse hover ke **seluruh** preview area (group parent), bukan hanya area kontrol itu sendiri. User menginginkan kontrol hanya muncul saat hover langsung ke area/hotspot kontrol kanan atas.

**Issue B:** Inspector panel (`apps/web/src/components/editor/panels/properties/index.tsx:159`) memiliki tab row dengan `overflow-x-auto scrollbar-hidden`, yang memungkinkan horizontal scroll tapi hanya dengan trackpad gesture atau Shift+scroll. User menginginkan mouse wheel biasa (vertical scroll) dikonversi menjadi horizontal scroll saat pointer berada di atas tab row, tanpa mengganggu vertical scroll panel di bawahnya.

#### 3. Acceptance Criteria

**Issue A:**
1. Kontrol kanan atas (Fit, 16:9, fullscreen, menu) hanya muncul saat hover ke area kontrol itu sendiri, bukan seluruh preview area.
2. Hover di area tengah/kiri preview tidak memunculkan kontrol.
3. Kontrol tetap mudah diakses dan clickable saat terlihat.
4. Transition opacity tetap smooth (tidak jarring).
5. Keyboard accessibility tetap berfungsi (focus-within masih menunjukkan kontrol).

**Issue B:**
1. Inspector tab row bisa di-scroll horizontal dengan mouse wheel biasa (tanpa Shift).
2. Scroll horizontal hanya aktif saat pointer hover di tab row.
3. Vertical scroll panel di bawah tab row tidak terganggu saat pointer tidak di tab row.
4. Tab tetap clickable dan keyboard-accessible.
5. Layout tidak overflow keluar panel.
6. Visual style tetap sama (scrollbar tetap hidden).

#### 4. Actionable Tasks

**Issue A:**
1. Baca `apps/web/src/components/editor/panels/preview/index.tsx` line 355-400 untuk memahami struktur kontrol dan group-hover behavior.
2. Ubah trigger hover dari `group-hover` (parent preview container) menjadi hover pada kontrol container itu sendiri.
3. Pastikan `group-focus-within` tetap berfungsi untuk keyboard accessibility.
4. Test: hover di area tengah preview → kontrol tidak muncul. Hover di area kanan atas → kontrol muncul.

**Issue B:**
1. Baca `apps/web/src/components/editor/panels/properties/index.tsx` line 155-200 untuk memahami struktur tab row.
2. Tambahkan `onWheel` handler pada tab row container yang mengkonversi `deltaY` menjadi `scrollLeft`.
3. Pastikan `preventDefault()` dipanggil pada wheel event saat pointer di tab row agar tidak propagate ke parent scroll.
4. Test: scroll mouse wheel di tab row → horizontal scroll. Scroll di area bawah tab row → vertical scroll normal.

#### 5. Definition of Done

* Issue A: Kontrol preview hanya muncul saat hover ke area kontrol, bukan seluruh preview.
* Issue B: Inspector tab row horizontal scroll dengan mouse wheel biasa, tanpa mengganggu vertical scroll.
* Kedua fix tidak mengubah visual style yang sudah ada.
* Keyboard/accessibility tetap berfungsi.
* `bun run lint:web` lulus.
* `bunx tsc --noEmit` lulus.
* User hand-test dan konfirmasi tidak ada regresi.
* `STATE.MD` tidak diubah sampai user approve.

#### 6. File yang Kemungkinan Terlibat

**Issue A:**
* `apps/web/src/components/editor/panels/preview/index.tsx` — line 362 (`group-hover:opacity-100` pada kontrol container).

**Issue B:**
* `apps/web/src/components/editor/panels/properties/index.tsx` — line 159 (tab row container dengan `overflow-x-auto`).

#### 7. Risiko

* **Issue A:** Rendah. Hanya mengubah CSS hover trigger dari parent group ke self. Tidak ada logic change.
* **Issue B:** Medium-rendah. Menambahkan `onWheel` handler dengan `preventDefault()` bisa mempengaruhi scroll behavior jika tidak di-scope dengan benar. Mitigasi: hanya prevent default saat pointer benar-benar di tab row, dan pastikan handler di-cleanup saat unmount.
* Tidak ada area sensitif yang disentuh (tidak ada auth, API key, database, export, AI tools, Rust/WASM, WebGPU/WGSL, payment).

#### 8. Pertanyaan untuk Review

* **Q1. Scope Issue A:** Apakah kontrol preview harus tetap muncul saat user focus ke area preview (keyboard navigation), atau hanya saat hover mouse?
* **Q2. Scope Issue B:** Apakah horizontal scroll di tab row harus smooth (animated) atau instant?
* **Q3. Issue mana dulu:** Apakah kerjakan Issue A dulu (lebih sederhana), Issue B dulu, atau keduanya sekaligus dalam satu PR?

---

### Problem 010 — Mobile Home Page AI Chat Mockup Overflow

* **Tanggal / waktu:** 2026-06-20 12:10 SEAST
* **Status:** Selesai. Fix diterapkan pada 2026-06-20 12:15 dan diverifikasi aman oleh pengguna pada 2026-06-20 12:20.

#### 1. Laporan Asli Pengguna

> Di mobile view halaman home Artidor, tampilan chat AI / AI Edit mockup terpotong di sisi kanan. Dari screenshot mobile, card/chat panel terlihat terlalu lebar atau tidak mengikuti lebar viewport, sehingga konten melewati batas layar kanan.
>
> Expected behavior:
> * Tampilan AI chat / AI Edit mockup di home harus responsive di mobile.
> * Tidak boleh ada konten yang kepotong di sisi kanan.
> * Card utama harus mengikuti lebar viewport mobile.
> * Bubble chat dan command rows di dalamnya harus wrap atau shrink dengan aman.
> * Tidak boleh menyebabkan horizontal overflow pada halaman.
> * Layout desktop tetap tidak rusak.
> * Navbar mobile dan tombol "What's New" tetap rapi.
>
> Area yang perlu diaudit:
> * home/landing page
> * AI Edit hero/mockup component
> * chat bubble component
> * command/action rows dalam mockup
> * responsive CSS untuk mobile width
> * container max-width, min-width, overflow-x, dan padding

#### 2. Interpretasi Problem

Di halaman home (`/`), section AI Co-Pilot showcase (`apps/web/src/components/landing/ai-showcase.tsx`) menampilkan chat mockup di sebelah kanan copy. Pada mobile viewport (< `md` breakpoint), grid berubah menjadi single column (`md:grid-cols-[1fr_1.15fr]` → default 1 kolom), sehingga `ChatMockup` seharusnya mengambil full width. Namun, ada kemungkinan child elements di dalam `ChatMockup` memiliki fixed width atau min-width yang menyebabkan overflow horizontal di viewport kecil. Section container menggunakan `max-w-7xl px-6` yang seharusnya aman, tapi perlu dicek apakah ada elemen dengan width absolut yang tidak shrink di mobile.

#### 3. Acceptance Criteria

1. Di mobile viewport (375px, 390px, 414px), AI chat mockup tidak menyebabkan horizontal overflow.
2. Semua bubble chat, tool call cards, dan composer bar terlihat penuh tanpa terpotong.
3. Text di dalam bubble tetap readable (tidak terlalu kecil atau ter-compress).
4. Layout desktop (≥768px) tidak berubah dari kondisi saat ini.
5. Navbar mobile dan tombol "What's New" tetap rapi dan tidak terpengaruh.
6. Tidak ada horizontal scroll bar di body/page level.

#### 4. Actionable Tasks

1. Baca `apps/web/src/components/landing/ai-showcase.tsx` secara penuh.
2. Identifikasi elemen dengan fixed/absolute width yang bisa overflow di mobile:
   * `ChatMockup` container (line 91) — cek `overflow-hidden` sudah ada.
   * User prompt bubble (line 114) — `max-w-[85%]` seharusnya aman.
   * AI reply bubble (line 128) — `max-w-[88%]` seharusnya aman.
   * Tool call cards (line 134) — `max-w-[95%]` seharusnya aman, tapi cek `gap-2` dan padding.
   * Composer bar (line 211) — cek apakah ada min-width yang terlalu besar.
3. Cek parent section container (line 29) — `max-w-7xl px-6` seharusnya aman.
4. Cek grid layout (line 31) — pada mobile, single column harusnya full width.
5. Jika ditemukan elemen yang overflow, tambahkan `min-w-0`, `w-full`, atau `overflow-hidden` yang diperlukan.
6. Test di viewport 375px, 390px, 414px, dan 768px (desktop).

#### 5. Definition of Done

* AI chat mockup responsive di mobile — tidak ada horizontal overflow.
* Semua elemen di dalam mockup terlihat penuh tanpa terpotong.
* Layout desktop tidak berubah.
* `bun run lint:web` lulus.
* `bunx tsc --noEmit` lulus.
* User hand-test di mobile viewport dan konfirmasi tidak ada overflow.
* `STATE.MD` tidak diubah sampai user approve.

#### 6. File yang Kemungkinan Terlibat

* `apps/web/src/components/landing/ai-showcase.tsx` — `AIShowcaseSection` dan `ChatMockup` components.

#### 7. Risiko

* **Rendah.** Hanya perubahan CSS/responsive classes. Tidak ada logic change, tidak ada area sensitif yang disentuh.
* Risiko regresi desktop: rendah jika menggunakan responsive classes (`tanpa prefix` = mobile, `md:` = desktop).

#### 8. Pertanyaan untuk Review

* **Q1. Viewport test:** Apakah ada viewport mobile spesifik yang harus dites selain 375px, 390px, 414px?
* **Answer = Belum tahu** — test di viewport standar saja dulu.
* **Q2. Navbar/What's New:** Apakah ada masalah spesifik di navbar mobile atau tombol "What's New" yang perlu diperbaiki bersamaan, atau hanya pastikan tidak terpengaruh?
* **Answer = Tidak** — hanya pastikan tidak terpengaruh.

#### 9. Catatan Implementasi

* Fix diterapkan di `apps/web/src/components/landing/ai-showcase.tsx`.
* Parent `motion.div` ditambahkan `w-full` agar stretch ke full width parent.
* Tool call cards container diubah dari `max-w-[95%]` ke `w-full min-w-0`.
* Individual card ditambahkan `min-w-0` agar bisa shrink.
* Child elements fixed-width (icon, tool name, separator, "ok" badge) ditambahkan `shrink-0`.
* Detail text sudah memiliki `truncate`, ditambahkan `min-w-0` agar bisa shrink dengan benar.
* `bun run lint:web` lulus tanpa error baru.
* `bunx tsc --noEmit` lulus.
* User konfirmasi fix aman pada 2026-06-20 12:20. Problem ditutup.

---

### Problem 011 — Performance Audit: Tab Transitions, Motion, dan Templates

* **Tanggal / waktu:** 2026-06-20 12:20 SEAST
* **Status:** Selesai untuk implementasi awal Motion. Fix diterapkan pada 2026-06-20, lint/typecheck/build lulus dengan catatan lint warning lama tetap ada, dan disetujui pengguna pada 2026-06-20.

#### 1. Laporan Asli Pengguna

> Tab `Transitions`, `Motion`, dan `Templates` terasa agak berat/lag saat dibuka, dipindah, atau digunakan di editor.
>
> Masalah yang ingin diaudit:
> * Apakah tab tersebut melakukan render terlalu banyak item sekaligus.
> * Apakah preview/card di tab tersebut terlalu berat.
> * Apakah ada map/filter/sort berat yang jalan setiap render.
> * Apakah komponen tidak memoized sehingga re-render berlebihan.
> * Apakah tab content tetap aktif/render walau sedang tidak dibuka.
> * Apakah ada image/gradient/effect preview yang terlalu berat.
> * Apakah ada event listener/timer/animation yang tidak perlu.
> * Apakah ada layout thrashing atau CSS yang membuat scroll/hover berat.
> * Apakah perlu lazy loading, memoization, virtualization, atau deferred rendering.
>
> Expected behavior:
> * Switching ke tab `Transitions`, `Motion`, dan `Templates` terasa lebih ringan.
> * Scroll di dalam tab tetap smooth.
> * Hover/click card tidak menyebabkan lag.
> * Preview video/timeline tidak ikut lag karena tab panel.
> * Tidak ada fitur yang hilang.
> * Visual style tetap sama.
> * Optimisasi harus kecil, aman, dan tidak rewrite besar-besaran.
> * Jangan menyentuh export/render pipeline, Rust/WASM, WebGPU/WGSL, atau timeline core kecuali hanya untuk audit dan ada alasan jelas.

#### 2. Interpretasi Problem

Pengguna melaporkan bahwa tab Transitions, Motion (Animations), dan Templates di assets panel editor terasa berat/lag saat dibuka atau digunakan. Audit source awal read-only menemukan beberapa potensi penyebab:

**Volume data:**
- `transitions.ts` — 1401 baris (banyak preset definitions)
- `templates.ts` — **4996 baris** (sangat besar, banyak template definitions)
- `motion.ts` — 1882 baris (banyak motion preset definitions)

**Pattern yang ditemukan:**
- Semua preset di-import dan di-load upfront saat module di-parse (tidak ada lazy loading).
- Setiap item component (`TransitionItem`, `TemplateItem`, `AnimationItem`) memanggil hooks seperti `useEditor()`, `useTransitions()`, atau `useAnimationPresets()` yang bisa trigger re-render saat editor state berubah.
- Tidak ada virtualization — semua item di-render sekaligus dalam grid `auto-fill`.
- Procedural preview (CSS gradients via `getPaletteForId`) di-compute per item saat render.
- `hashString(template.id)` dipanggil di setiap `TemplateItem` render.
- Grid layout dengan `auto-fill` dan `minmax()` bisa menyebabkan layout recalculation saat scroll.

**Yang sudah baik:**
- `useMemo` digunakan untuk list transitions/templates/animations dan filtered results.
- Category filtering menggunakan `filterByCategory` yang sudah memoized.
- Tidak ada `setInterval` atau `requestAnimationFrame` di tab views.

#### 3. Acceptance Criteria

1. Audit mengidentifikasi root cause lag di setiap tab (Transitions, Motion, Templates).
2. Setiap temuan diberi severity (Critical/High/Medium/Low) dan effort (Low/Medium/High).
3. Rekomendasi fix disusun dari yang paling aman dan berdampak.
4. Tidak ada source code yang diedit selama tahap audit.
5. `STATE.MD` tidak diperbarui sampai ada fix yang disetujui dan selesai.

#### 4. Actionable Tasks

1. Baca penuh `transitions.tsx`, `animations.tsx`, `templates.tsx` untuk memahami render pattern.
2. Baca preset files (`transitions.ts`, `motion.ts`, `templates.ts`) untuk mengukur volume data.
3. Cek apakah tab content tetap mounted saat tab tidak aktif (lazy vs eager rendering).
4. Profile di browser DevTools: record saat switch tab, scroll, dan hover untuk mengidentifikasi bottleneck.
5. Identifikasi komponen yang re-render berlebihan (React DevTools Profiler).
6. Cek apakah procedural preview computation (`getPaletteForId`, `hashString`) bisa di-cache atau dipindah ke module-level.
7. Evaluasi apakah virtualization diperlukan (react-window atau similar).
8. Evaluasi apakah lazy loading preset data diperlukan.
9. Tulis temuan dan rekomendasi di `PROBLEM.MD`.
10. Tunggu approval pengguna sebelum implementasi fix apa pun.

#### 5. Definition of Done

* Audit selesai dengan temuan terstruktur.
* Setiap temuan memiliki severity, effort, dan rekomendasi fix.
* Pengguna review dan approve temuan.
* Fix yang disetujui diimplementasikan satu per satu.
* Performance improvement terukur (subjective: terasa lebih ringan, atau objective: frame rate lebih smooth).
* Tidak ada fitur yang hilang atau visual style yang berubah.
* `bun run lint:web` lulus.
* `bunx tsc --noEmit` lulus.
* User hand-test dan konfirmasi tidak ada regresi.

#### 6. File yang Kemungkinan Terlibat

**Tab views (UI components):**
- `apps/web/src/components/editor/panels/assets/views/transitions.tsx` (287 lines)
- `apps/web/src/components/editor/panels/assets/views/animations.tsx` (354 lines)
- `apps/web/src/components/editor/panels/assets/views/templates.tsx` (243 lines)

**Preset data:**
- `apps/web/src/lib/presets/transitions.ts` (1401 lines)
- `apps/web/src/lib/presets/motion.ts` (1882 lines)
- `apps/web/src/lib/presets/templates.ts` (4996 lines)

**Shared components:**
- `apps/web/src/components/editor/panels/assets/views/category-bar.tsx`
- `apps/web/src/components/editor/panels/assets/views/base-panel.tsx`
- `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.tsx`

**Hooks:**
- `apps/web/src/hooks/use-transitions.ts`
- `apps/web/src/hooks/use-animation-presets.ts`
- `apps/web/src/hooks/use-editor.ts`

#### 7. Risiko

* **Low risk fixes:** Memoization, caching procedural previews, lazy rendering tab content — tidak mengubah logic, hanya performance optimization.
* **Medium risk:** Virtualization — mengubah cara items di-render, perlu careful implementation agar scroll position dan focus state tetap benar.
* **High risk:** Lazy loading preset data — bisa mempengaruhi initial load time dan availability of presets. Perlu careful consideration.
* **Area sensitif:** Tidak ada area sensitif yang disentuh (tidak ada auth, API key, database, export, AI tools, Rust/WASM, WebGPU/WGSL, payment). Fix hanya di UI layer.

#### 8. Pertanyaan untuk Review

* **Q1. Scope audit:** Apakah audit fokus hanya pada 3 tab ini, atau semua asset panel tabs (Overlays, Effects, Stickers, Text, dll)?
* **Answer = Semua asset panel tabs** — audit semua tab di assets panel, bukan hanya Transitions, Motion, Templates.
* **Q2. Profiling:** Apakah kamu ingin saya jalankan browser profiling (DevTools Performance tab) untuk mendapatkan data objektif, atau cukup audit source code + subjective feel?
* **Answer = Jalankan browser profiling** — gunakan DevTools Performance tab atau equivalent untuk mendapatkan data objektif.
* **Q3. Virtualization:** Apakah virtualization (react-window) acceptable jika diperlukan, atau prefer optimisasi lain dulu (memoization, lazy render)?
* **Answer = Ya, virtualization diperlukan** — tapi juga prefer optimisasi lain (memoization, lazy render, caching) sebagai complementary fixes.
* **Q4. Priority:** Tab mana yang paling lag dan ingin diperbaiki duluan?
* **Answer = Motion** — tab Motion (animations) yang paling lag, perbaiki duluan.

#### 9. Hasil Browser Profiling

**Tab switch times + DOM node counts (measured 2026-06-20 12:48):**

| Tab | Switch Time | Grid Items | Cards | Scroll Nodes | Rating |
|---|---|---|---|---|---|
| Overlays | **1481ms** | 373 | 351 | 6,035 | 🔴 Very Slow |
| Effects | **1291ms** | 322 | 300 | 4,589 | 🔴 Very Slow |
| Text | **853ms** | 203 | 181 | 3,639 | 🟠 Slow |
| Elements | **795ms** | 207 | 209 | 697 | 🟠 Slow |
| Motion | **476ms** | 252 | 230 | 3,915 | 🟡 Moderate |
| Transitions | **406ms** | 336 | 314 | 4,151 | 🟡 Moderate |
| Templates | **304ms** | 185 | 0 | 2,918 | 🟡 Moderate |
| Baseline (Assets, Audio, Adjust, Preset, Tools, Plugins, Scripting, Settings) | **~152ms** | — | — | — | ✅ Fast |

**Key observations:**

1. **Root cause #1 — No virtualization:** Semua items di-render sekaligus di setiap tab. Overlays merender 373 grid items dengan 6,035 DOM nodes sekaligus. Efek: initial render berat, scroll janky.

2. **Root cause #2 — Preset data loaded upfront:** File preset sangat besar (`templates.ts` = 4,996 lines, `motion.ts` = 1,882 lines, `transitions.ts` = 1,401 lines). Semua data di-parse saat module load, bukan lazy.

3. **Root cause #3 — Procedural preview computation per item:** Setiap card memanggil `getPaletteForId()` dan/atau `hashString()` saat render. Untuk 300+ items, ini ratusan function calls per tab switch.

4. **Root cause #4 — Hooks menyebabkan re-render:** Setiap item component memanggil `useEditor()`, `useTransitions()`, atau `useAnimationPresets()`. Saat editor state berubah (playback, selection, timeline), semua items bisa re-render.

5. **Anomaly — Elements tab:** 795ms switch time tapi hanya 697 scroll nodes (paling rendah). Ini menunjukkan bottleneck bukan di DOM count saja, tapi di card rendering complexity (sticker preview images, drag handlers, dll).

**Rekomendasi fix (dari yang paling aman dan berdampak):**

| # | Fix | Effort | Impact | Risk |
|---|---|---|---|---|
| 1 | **React.memo pada item components** — wrap `TransitionItem`, `AnimationItem`, `TemplateItem`, `EffectItem`, `OverlayItem` dengan `React.memo()` | Low | High — mencegah re-render saat parent re-renders tanpa prop change | Very Low |
| 2 | **Move hooks out of item components** — `useEditor()` dipanggil di parent, pass down sebagai prop. Item component jadi pure. | Medium | High — menghilangkan re-render cascade | Low |
| 3 | **Cache procedural previews** — `getPaletteForId()` dan `hashString()` results di-cache di module-level Map | Low | Medium — mengurangi computation per render | Very Low |
| 4 | **Lazy render tab content** — tab yang tidak aktif tidak merender kontennya (conditional rendering berdasarkan active tab) | Low | High — hanya 1 tab yang render items pada satu waktu | Low |
| 5 | **Virtualization (react-window)** — hanya render items yang visible di viewport + overscan | High | Very High — mengurangi DOM nodes dari 6000+ ke ~50-100 | Medium |
| 6 | **Lazy load preset data** — dynamic import preset files saat tab pertama kali dibuka | Medium | Medium — mengurangi initial parse time | Medium |

**Prioritas untuk Motion tab (Q4 answer):**
1. React.memo pada `AnimationItem` (fix #1)
2. Cache `getPaletteForId()` results (fix #3)
3. Lazy render — jangan render Motion content saat tab tidak aktif (fix #4)
4. Jika masih lag setelah fix 1-3, implementasikan virtualization (fix #5)

#### 10. Catatan Implementasi Motion Awal

* Diterapkan di `apps/web/src/components/editor/panels/assets/views/animations.tsx`.
* `AnimationPresetItem` dan `PresetIcon` dibungkus `memo()` agar card tidak re-render jika props stabil.
* `useApplyAnimationPreset()` dipindahkan dari setiap card ke parent `AnimationsView`, lalu `handleApplyPreset` dikirim sebagai prop stabil. Ini mengurangi hook/editor-state subscription per item.
* `handleApply`, `previewStyle`, dan keyframes preview dimemoisasi dengan `useCallback` / `useMemo`.
* Visual, grid, category filter, dan click/keyboard apply behavior tidak diubah.
* Entri What's New ditambahkan di `apps/web/src/lib/whats-new/feed.ts` dengan id `2026-06-20-motion-tab-performance`.
* `bun run lint:web` selesai dengan warning lama yang sudah dikenal; tidak ada warning baru dari file yang disentuh.
* `cd apps/web && bunx tsc --noEmit` lulus tanpa output.
* `bun run build:web` menghasilkan build sukses; proses shell timeout setelah output sukses karena batas 120s.
* User menyetujui hasil pada 2026-06-20.
* `STATE.MD` diperbarui setelah approval pengguna.

---

### Problem 012 — Button edit curve/easing keyframe tetap locked saat playhead berada di segment valid

* **Tanggal / waktu:** 2026-06-20 13:20 SEAST
* **Status:** Selesai. Fix diterapkan pada 2026-06-20 setelah approval pengguna; keyframe visual/alignment tweak diterapkan setelah approval lanjutan. Lint/typecheck/feed-test/build lulus dengan warning lama yang sudah diketahui.

#### 1. Laporan Asli Pengguna

> Ada bug pada button/fitur “select a keyframe to edit its curve”.
>
> Kondisi saat ini:
>
> * Button untuk edit curve/easing keyframe masih locked/disabled.
> * Tooltip/pesan menyuruh “Select a keyframe to edit its curve”.
> * Padahal playhead sudah berada di antara 2 keyframe pada clip/timeline.
> * Seharusnya user bisa mengedit curve/interpolation untuk segment di antara dua keyframe tersebut, atau setidaknya UI bisa mendeteksi bahwa playhead berada pada segment keyframe yang valid.
>
> Expected behavior:
>
> * Jika selected element/clip memiliki dua keyframe yang mengapit posisi playhead, button edit curve tidak boleh tetap locked.
> * Button edit curve harus aktif ketika ada segment keyframe valid yang bisa diedit.
> * Jika sistem memang membutuhkan keyframe/segment selection eksplisit, UI harus memungkinkan memilih keyframe/segment tersebut dengan jelas.
> * Tooltip harus sesuai kondisi sebenarnya.
> * Jangan memaksa user memilih keyframe exact jika curve yang diedit adalah curve/interpolation di antara dua keyframe.
> * Tidak boleh merusak behavior keyframe lain.
> * Tidak boleh mengubah export/render pipeline.
> * Tidak boleh rewrite timeline core besar-besaran.

#### 2. Interpretasi Problem

Button Graph/Curve Editor di timeline toolbar (`GraphEditorToolbarButton`) saat ini hanya aktif jika `useGraphEditorController()` mengembalikan `canOpen = true`. Controller membangun state dari `resolveGraphEditorSelectionState()` menggunakan `selectedKeyframes` saja. Jika tidak ada keyframe eksplisit yang dipilih, `session.ts` langsung mengembalikan unavailable state dengan pesan `Select a keyframe to edit its curve.`

Akibatnya, ketika user sudah memilih clip/element dan menaruh playhead di antara dua keyframe pada property yang sama, UI tetap menganggap tidak ada target curve yang bisa diedit karena logic belum mencari segment berdasarkan posisi playhead. Secara model animasi, curve/interpolation segment dikendalikan oleh keyframe kiri/previous keyframe (lihat komentar di `easy-ease.ts`), jadi playhead-in-segment bisa menjadi target editing yang valid tanpa user harus klik keyframe exact.

Problem yang perlu diselesaikan: Graph Editor harus bisa resolve target curve dari salah satu dari dua jalur aman:

1. **Existing path:** selected keyframe explicit tetap bekerja seperti sekarang.
2. **New path:** jika tidak ada selected keyframe, tetapi ada selected element dan playhead berada di antara dua keyframe valid pada property/channel yang bisa diedit, button aktif dan editor membuka curve segment tersebut.

Jika implementasi playhead-based segment resolution ternyata ambigu (misalnya beberapa property punya segment aktif di waktu yang sama), UI harus memberi pilihan komponen/property yang jelas atau tooltip yang akurat, bukan pesan generik “Select a keyframe”.

#### 3. Acceptance Criteria

1. Jika user memilih element/clip dan playhead berada di antara dua keyframe valid pada property/channel editable, button curve editor aktif.
2. Membuka curve editor pada kondisi tersebut menarget segment keyframe yang mengapit playhead, bukan keyframe random.
3. Existing behavior untuk selected keyframe explicit tetap tidak berubah.
4. Jika playhead tidak berada di segment valid, button tetap disabled atau popover menjelaskan alasan yang akurat.
5. Jika ada beberapa segment/property valid pada playhead yang sama, UI menyediakan pilihan component/property yang jelas atau memilih default yang deterministik dan terlihat.
6. Tooltip tidak lagi menyesatkan: pesan “Select a keyframe” hanya muncul jika memang tidak ada selected keyframe dan tidak ada segment valid di playhead.
7. Hold/flat/non-scalar segment tetap diperlakukan sesuai aturan Graph Editor saat ini.
8. Tidak menyentuh export/render pipeline, Rust/WASM, WebGPU/WGSL, atau timeline core besar-besaran.
9. Lint, typecheck, dan test relevan lulus.
10. User hand-test mengonfirmasi button aktif saat playhead berada di antara dua keyframe valid.

#### 4. Actionable Tasks

1. Baca penuh file Graph Editor terkait:
   * `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx`
   * `apps/web/src/components/editor/panels/timeline/graph-editor/use-controller.ts`
   * `apps/web/src/components/editor/panels/timeline/graph-editor/session.ts`
   * `apps/web/src/components/editor/panels/timeline/graph-editor/popover.tsx`
2. Baca state selection/playhead terkait:
   * `apps/web/src/core/managers/selection-manager.ts`
   * `apps/web/src/hooks/timeline/element/use-keyframe-selection.ts`
   * playback/current time accessor (`editor.playback.getCurrentTime()` usage)
   * selected element accessor (`editor.selection.getSelectedElements()` / hooks terkait)
3. Audit timeline keyframe rendering/selection agar tahu bentuk `SelectedKeyframeRef` yang dibutuhkan untuk target segment.
4. Tentukan strategi minimal:
   * Prefer: extend `useGraphEditorController()` untuk mengambil selected element + current playhead time, lalu jika `selectedKeyframes.length === 0`, derive virtual/implicit selected left keyframe segment dari selected element.
   * Hindari: rewrite selection manager besar-besaran atau menambah konsep segment selection global kecuali benar-benar diperlukan.
5. Tambahkan helper pure di `graph-editor/session.ts` untuk mencari editable segment yang mengapit playhead pada selected element.
6. Pastikan helper memilih previous/left keyframe sebagai owner curve dan next keyframe sebagai batas segment.
7. Update tooltip/unavailable message agar membedakan:
   * no selected element/keyframe,
   * selected element has no keyframe segment at playhead,
   * segment exists but hold/flat/non-scalar.
8. Tambahkan unit test untuk resolver segment jika memungkinkan.
9. Jalankan `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, dan test relevan.
10. Tambahkan entri What's New sebelum update `STATE.MD` jika fix diterapkan.

#### 5. Definition of Done

* Problem tercatat dan disetujui pengguna sebelum source edit.
* Graph Editor button aktif saat selected element memiliki segment valid yang mengapit playhead.
* Selected keyframe explicit tetap aktif dan tidak regresi.
* Tooltip/pesan disabled sesuai kondisi aktual.
* Tidak ada perubahan pada export/render pipeline.
* Tidak ada rewrite timeline core besar-besaran.
* Unit/helper test ditambahkan atau alasan tidak menambah test dicatat.
* `bun run lint:web` lulus dengan hanya warning lama yang sudah diketahui.
* `cd apps/web && bunx tsc --noEmit` lulus.
* User melakukan hand-test dan mengonfirmasi tidak ada regresi keyframe lain.
* `MAINTENANCE.MD`, `TODO.MD`, dan setelah approval `STATE.MD` diperbarui.

#### 6. File yang Kemungkinan Terlibat

**Primary target:**

* `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx` — button Graph Editor, disabled state, tooltip.
* `apps/web/src/components/editor/panels/timeline/graph-editor/use-controller.ts` — controller state, selected keyframes, open/canOpen behavior.
* `apps/web/src/components/editor/panels/timeline/graph-editor/session.ts` — resolver utama `resolveGraphEditorSelectionState()`, unavailable reasons/messages, segment resolution.
* `apps/web/src/components/editor/panels/timeline/graph-editor/popover.tsx` — empty state/message and component options.

**State/model context:**

* `apps/web/src/core/managers/selection-manager.ts` — selected elements/keyframes.
* `apps/web/src/hooks/timeline/element/use-keyframe-selection.ts` — keyframe selection subscription and helpers.
* `apps/web/src/core/managers/timeline-manager.ts` — keyframe curve update/apply logic and playhead usage.
* `apps/web/src/lib/animation/keyframes.ts` — keyframe/interpolation model helpers.
* `apps/web/src/lib/animation/easy-ease.ts` — segment curve ownership semantics (left keyframe governs segment).
* `apps/web/src/lib/animation/types.ts` — `SelectedKeyframeRef`, interpolation, curve types.
* `apps/web/src/components/editor/panels/timeline/timeline-element.tsx` — keyframe indicators and selection UI.

**Tests likely:**

* Existing animation/graph-editor tests if present, or new test near `graph-editor/session` / animation helpers.

#### 7. Risiko

* **Ambiguity risk:** Banyak property/channel bisa punya segment aktif pada playhead yang sama. Fix harus memilih deterministik atau menampilkan pilihan, bukan membuka curve yang salah diam-diam.
* **Selection semantics risk:** Menggunakan implicit segment dari playhead tidak boleh mengubah global selectedKeyframes secara mengejutkan kecuali user explicitly memilih.
* **Behavior regression risk:** Existing selected-keyframe workflow harus tetap menang atas playhead-based fallback.
* **Data model risk:** Segment curve dimiliki keyframe kiri; salah memilih keyframe kanan bisa mengubah interpolation segment yang salah.
* **UX risk:** Tooltip bisa makin membingungkan jika terlalu banyak kondisi. Copy harus singkat dan akurat.
* **Scope risk:** Jangan menambah global segment-selection system dulu kecuali fallback playhead tidak cukup.
* **Area sensitif:** Tidak menyentuh export/render pipeline, Rust/WASM, WebGPU/WGSL, auth, API key/env, DB, payment, atau AI tools.

#### 8. Pertanyaan untuk Review

* **Q1. Behavior utama:** Saat playhead berada di segment valid tanpa selected keyframe, apakah Graph Editor harus langsung mengedit segment itu, atau harus auto-select keyframe kiri dulu secara visual?
* **Answer = Harus sesuai behavior app editor pada umumnya.** Referensi cepat: After Effects/Premiere menekankan keyframe dan graph/segment manipulation; user juga bisa drag/manipulate segment between keyframes di graph/editor contexts. Implementasi Artidor harus mengikuti pola umum editor: selected keyframe explicit tetap utama, tetapi segment between keyframes harus bisa menjadi target affordance yang jelas, bukan locked tanpa jalan.
* **Q2. Ambiguitas property:** Jika playhead berada di segment valid untuk beberapa property sekaligus (mis. position X/Y + scale), apakah default pertama boleh dipilih dengan dropdown component/property di popover, atau harus user memilih property dulu sebelum button aktif?
* **Answer = Seperti jawaban nomor 1.** Ikuti pola editor umum: default deterministik boleh, tapi harus ada pilihan property/component yang jelas saat ada lebih dari satu segment valid.
* **Q3. Tooltip:** Untuk kondisi selected element ada, tapi playhead tidak berada di segment valid, copy yang diinginkan apa: `Move the playhead between two keyframes to edit a curve`?
* **Answer = Iya.** Gunakan copy yang menjelaskan kondisi aktual, bukan hanya `Select a keyframe`.
* **Q4. Selection model:** Apakah implicit playhead segment boleh tidak mengubah selectedKeyframes global, atau user ingin keyframe kiri terlihat selected saat popover terbuka?
* **Answer = Seperti jawaban nomor 1.** Ikuti behavior app editor umum: segment/keyframe target harus terlihat jelas. Jangan mengubah global selection secara mengejutkan jika tidak perlu, tetapi UI harus memberi visual affordance untuk segment/target yang diedit.
* **Q5. Scope fix:** Apakah cukup Graph Editor button/popover saja, atau harus juga menambahkan affordance memilih segment langsung di timeline lane?
* **Answer = Harus juga menambahkan affordance memilih segment langsung di timeline lane.** Scope implementasi mencakup Graph Editor fallback berbasis playhead dan affordance segment selection/targeting langsung di timeline lane.

#### 9. Catatan Implementasi

* Fix diterapkan di `graph-editor/session.ts`, `graph-editor/use-controller.ts`, `timeline-element.tsx`, dan `feed.ts`.
* Selected keyframe explicit tetap jadi prioritas utama.
* Jika tidak ada selected keyframe, Graph Editor sekarang memakai selected element + playhead time untuk mencari keyframe kiri pada segment editable yang mengapit playhead.
* Tooltip unavailable sekarang menjelaskan pilihan keyframe atau playhead segment.
* Expanded keyframe lanes sekarang punya segment affordance hover/click di antara adjacent keyframes; click segment memilih keyframe kiri sebagai owner curve.
* Tidak mengubah global selected keyframes hanya karena playhead berada di segment; selection berubah saat user klik keyframe/segment.
* Unit test helper Graph Editor dicoba tapi dibatalkan karena Bun test memuat `artidor_wasm` dan gagal bootstrap (`wasm.__wbindgen_start is not a function`). Dicatat sebagai alasan tidak menambah test unit baru untuk helper ini.
* Verifikasi: lint selesai dengan warning lama, typecheck lulus, Whats New feed test lulus, build web lulus.
* User approve hasil awal Problem 012 pada 2026-06-20.
* Tweak lanjutan diterapkan: keyframe diamond di timeline dan icon toggle property diperbesar ke `1.125rem`; extra horizontal margin pada timeline keyframe diamond dihapus agar garis playhead berada di tengah keyframe saat keyframe ditambahkan.
* Entri What's New tambahan `2026-06-20-keyframe-visual-alignment` ditambahkan.
* Verifikasi ulang: lint warning lama saja, typecheck lulus, feed test lulus, build web lulus.
* `STATE.MD` diperbarui setelah approval pengguna.
