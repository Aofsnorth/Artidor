# Editor Bughunt-2 — Media / Subtitle / Teleprompter / Font / artpr (R01–R20)

Scope: `apps/web/src/core/managers/media-manager.ts`, `apps/web/src/lib/media/processing.ts` +
mediabunny wrappers, `apps/web/src/lib/subtitles/*`, `apps/web/src/core/managers/teleprompter-manager.ts`,
`apps/web/src/lib/fonts/*`, `apps/web/src/lib/drive/api.ts` (audit read-only),
`apps/web/src/lib/project-file/artpr.ts`. Tidak ada dependensi baru, tidak ada commit.

Legenda hasil: ✅ = bug terkonfirmasi + diperbaiki di akar + uji regresi hijau.
⚠️ = parsial / butuh tindak lanjut track lain. Honest marker ❌ TIDAK dipakai menutupi —
setiap ronde di bawah mencantumkan perintah, bukti, dan status jujur.

## Ringkasan ronde

| Ronde | Area | Temuan (akar) | Perintah | Hasil |
|---|---|---|---|---|
| R01 | processing thumbnail | `timeInSeconds: 1` buta: klip <1 dtk cari frame di luar durasi → thumbnail hitam/gagal | `bun test src/lib/media/__tests__/media-bughunt-2.test.ts` | ✅ `getThumbnailTimeForDuration` (½ durasi, clamp 1 dtk) |
| R02 | SRT timestamp | Jam 1-digit ditolak; mm/ss ≥60 lolos jadi durasi absurd | `bun test src/lib/subtitles/subtitle-bughunt-2.test.ts` | ✅ terima `\d{1,2}`, tolak mm/ss>59 |
| R03 | SRT/ASS ordering | Cue out-of-order tak disort; overlap menumpuk di render | sama | ✅ sort + clamp overlap + warning |
| R04 | export SRT/ASS | `Math.round` pecahan → `,1000` / `.100` (timestamp invalid) | sama | ✅ bulatkan ke ms/cs total dulu (carry) |
| R05 | insert caption | rename track via `updateTracks` di luar batch → undo 2 langkah + redo rusak | `bun test src/lib/subtitles/insert-bughunt-2.test.ts` | ✅ rename jadi `UpdateTrackCommand` dalam batch |
| R06 | teleprompter mgr | `open()/toggle()` tulis store yatim, dialog mounted baca store lain → tombol diam | `bun test src/core/managers/__tests__/media-bughunt-2.test.ts` | ✅ route ke `useOpenDialogsStore["teleprompter"]` + stop playback saat close |
| R07 | font loader | `document.fonts.load` reject (offline) menggelembung → `loadFonts` bisa blokir load proyek; `<link>` ganda; gagal permanen | sama | ✅ dedupe janji, tandai loaded hanya saat sukses, `loadFonts` tak pernah throw |
| R08 | artpr envelope | base64 rusak / iterasi aneh lolos ke `atob`/KDF dengan error mentah | `bun test src/lib/project-file/__tests__/artpr-bughunt-2.test.ts` | ✅ validasi pola base64 + iterasi integer |
| R09 | artpr decode | input sampah → `SyntaxError` mentah (crash UI); salt/iv salah panjang lolos ke decrypt | sama | ✅ semua input malformed → pesan envelope bersih + cek panjang salt/iv |
| R10 | VTT | tidak ada parser `.vtt` sama sekali → `Unsupported subtitle format` | `bun test src/lib/subtitles/subtitle-bughunt-2.test.ts` | ✅ `vtt.ts` baru: header/NOTE/STYLE/N-region dilewati, cue-id & settings opsional |
| R11 | SRT robustness | blok tanpa baris nomor cue (indeks>1) berisiko salah potong | sama | ✅ pindai baris timestamp pertama, bukan asumsi indeks 0/1 |
| R12 | SRT jam | duplikat R02 sisi pola baris-penuh (pola `TIMESTAMP_PATTERN` masih 2-digit) | sama | ✅ pola baris dilonggarkan ke `\d{1,2}` jam |
| R13 | routing format | `.ssa` ditolak; `.txt` berisi WEBVTT ditolak; nama path Windows salah ekstensi | sama | ✅ `.ssa`→ASS, sniff konten WEBVTT, basename-aware |
| R14 | tick builder | `startTime/duration` float → drift ±1 tick; durasi mikro → elemen 0-tick tak terlihat | `bun test src/lib/subtitles/insert-bughunt-2.test.ts` | ✅ `Math.round` + clamp (start≥0, dur≥1) |
| R15 | artpr DoS | `iterations: 99_999_999` di envelope → PBKDF2 hang | `bun test src/lib/project-file/__tests__/artpr-bughunt-2.test.ts` | ✅ clamp atas 1.000.000 |
| R16 | artpr version | versi baru → pesan "invalid" generik (pengguna kira korup) | sama | ✅ pesan `Unsupported .artpr version X (this app reads version Y)` |
| R17 | uji gabungan | — | `bun test <10 file>` | ✅ 34/34 hijau |
| R18 | fallback thumb | durasi NaN/0 → `Math.min(1, NaN)` = NaN → `getSample(NaN)` | `bun test src/lib/media/__tests__/media-bughunt-2.test.ts` | ✅ NaN/≤0/∞ → 0 dtk (tercakup di R01) |
| R19 | lint | — | `biome check … --write` lalu tanpa `--write` | ✅ 16 file bersih |
| R20 | typecheck | — | `bunx tsc --noEmit` | ✅ bersih, tanpa error |

## Perintah validasi final

```sh
cd apps/web
bun test src/lib/subtitles/subtitle-bughunt-2.test.ts src/lib/project-file/__tests__/artpr-bughunt-2.test.ts src/lib/media/__tests__/media-bughunt-2.test.ts src/lib/subtitles/insert-bughunt-2.test.ts src/core/managers/__tests__/media-bughunt-2.test.ts src/lib/subtitles/caption-cues.test.ts src/lib/subtitles/build-subtitle-text-element.test.ts src/lib/project-file/__tests__/artpr.test.ts src/lib/media/__tests__/media-utils.test.ts src/lib/subtitles/insert.test.ts
# → 34 pass, 0 fail
bunx tsc --noEmit  # → bersih
```

## File diubah (apps/web saja)

- `src/lib/media/processing.ts` — progress dilaporkan di SEMUA jalur keluar (unsupported/quota/sukses/gagal); thumbnail clamp via `getThumbnailTimeForDuration`.
- `src/lib/subtitles/srt.ts` — jam 1–2 digit, tolak mm/ss>59, scan timestamp fleksibel, sort+clamp overlap+warning.
- `src/lib/subtitles/ass.ts` — sort+clamp overlap+warning.
- `src/lib/subtitles/vtt.ts` — BARU: parser WebVTT.
- `src/lib/subtitles/parse.ts` — rute `.vtt`/`.ssa`, sniff WEBVTT, basename-aware; perbaiki bug nyata `input` tak diteruskan ke `getFileExtension` (ditemukan saat uji R13 gagal).
- `src/lib/subtitles/export.ts` — rounding-carry ms/cs.
- `src/lib/subtitles/insert.ts` — rename via `UpdateTrackCommand` dalam batch (import langsung, tanpa sentuh barrel milik track lain).
- `src/lib/subtitles/build-subtitle-text-element.ts` — round tick + clamp.
- `src/core/managers/teleprompter-manager.ts` — route store dialog benar + stop playback saat close.
- `src/lib/fonts/google-fonts.ts` — loader idempoten, aman-offline, tak pernah throw.
- `src/lib/project-file/artpr.ts` — validasi envelope/base64/iterasi/panjang salt-iv, pesan versi khusus.
- Uji baru: `src/lib/media/__tests__/media-bughunt-2.test.ts` (3),
  `src/lib/subtitles/subtitle-bughunt-2.test.ts` (8),
  `src/lib/project-file/__tests__/artpr-bughunt-2.test.ts` (5),
  `src/lib/subtitles/insert-bughunt-2.test.ts` (2),
  `src/core/managers/__tests__/media-bughunt-2.test.ts` (2). Total baru: 20; total gabungan dengan suite lama: 34 hijau.

## Honest gaps (yang TIDAK diperbaiki / tak terverifikasi)

1. Dedupe aset ganda by-hash: TIDAK diimplementasikan — butuh hashing saat impor + skema storage (risiko scope). Impor file sama 2× masih membuat 2 entri (progres+zombie aman, duplikat tidak).
2. Virtualisasi 100+ aset: TIDAK ada (`MediaItemList` me-render semua; `react-window` sudah jadi dep tapi belum dipakai di sini) — penambahan virtual list adalah ranah UI, di luar diff minimal.
3. Concurrency thumbnail N-file: `CONCURRENCY=4` sudah ada; tidak diubah (cukup).
4. Teleprompter sync playhead: tidak ada kaitan playhead di kode (skor manual px/detik) — drift yang dilaporkan adalah keterbatasan desain, bukan bug logika yang bisa diuji di sini; edit skrip mid-playback memang me-reset offset hanya via tombol reset (perilaku, bukan crash).
5. Drive `api.ts`: audit read-only — multipart `saveProjectToDrive`/`uploadMediaToDrive` membangun body via `join("")`/Blob string untuk biner (risiko korupsi byte non-UTF8); state machine sync milik project-manager → DILAPORKAN, tidak diperbaiki (lihat laporan lintas-track).
6. Renderer dangling mediaId: jalur audio (`audio.ts`) sudah `?? null`/`continue` (graceful). Jalur render visual/GPU milik track lain → tidak diaudit di luar `grep` baca-saja.

## Laporan lintas-track (jangan diperbaiki oleh saya)

- **commands/audio/persistence/collab**: `insert.ts` memakai `UpdateTrackCommand` via import modul langsung karena barrel `timeline/track/index.ts` tidak me-re-export-nya — pemilik commands disarankan menambahkan export resmi bila pola ini dipakai luas.
- **project-manager (Drive sync)**: `syncProjectFromDrive` mencocokkan aset by-`name` (kolisi nama), mengimpor media tanpa kelanjutan progres yang seragam, dan `saveProjectToDrive`/`uploadMediaToDrive` merangkai biner ke string multipart — mohon pemilik Drive/project-manager meninjau ketahanan byte + state machine error/syncing.
- **UI aset**: `MediaItemList` tanpa virtualisasi; disarankan pemilik UI memakai `react-window` (sudah ada di deps) untuk 100+ item.
