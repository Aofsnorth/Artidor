# Editor Bug Hunt 2 — Panels Ledger (apps/web)

Scope lock: hanya file di bawah `apps/web/src` yang terdaftar + tes baru. Ledger ini
saja yang boleh menyentuh `docs/`. Tanpa dep/commit baru, diff minimal, file milik
track lain tidak disentuh (commands/persistence/collab/audio/clipboard hanya dilaporkan).

Bacaan penuh (pra-ronde) — semua file milik track ini + pembanding baca-saja:
- `components/editor/panels/properties/` (semua: index, details-view, registry,
  tabs/element-tab, transform-tab, camera-tab, audio-tab, audio-effects-tab,
  blending-tab, graphic-tab, graphics-style-tab, image-tab, masks-tab,
  parenting-tab, text-tab, speed-tab, speed-ramp-tab, effects-tab,
  adjustments-tab, basic-adjust-tab, color-grading-tab, color-wheels-tab,
  davinci-adjust-tab, frame-interpolation-tab, animations-tab,
  components/property-param-field, components/keyframe-toggle,
  components/copy-paste-buttons, hooks/use-property-draft,
  hooks/use-keyframed-number-property, hooks/use-keyframed-param-property,
  hooks/use-keyframed-color-property, hooks/use-element-playhead,
  stores/properties-store)
- `core/managers/selection-manager.ts`, `core/managers/scenes-manager.ts`
  (hanya create/delete + kamera; switchToScene milik track lain — diverifikasi utuh)
- `components/providers/editor-provider.tsx` (lifecycle load/beforeunload/cancelled)
- `stores/editor-ui-store.ts` (baca; fix hanya clear/sanitize logic)
- Pembanding baca-saja (tidak diubah): `core/managers/timeline-manager.ts`
  (insertCameraLayer, getElementsWithTracks, preview/commit), `core/managers/commands.ts`,
  `core/managers/project-manager.ts` (loadProjectSeq), `core/managers/save-manager.ts`
  (getIsDirty), `lib/commands/scene/*`, `lib/commands/timeline/element/delete-elements.ts`,
  `lib/scenes.ts`, `lib/camera/index.ts`, `lib/retime/rate.ts`, `hooks/use-editor.ts`,
  `hooks/timeline/element/use-element-selection.ts`, `hooks/actions/use-editor-actions.ts`
  (select-all), `hooks/use-audio-effects.ts`, `hooks/use-element-preview.ts`,
  `components/ui/number-field.tsx`, `utils/math.ts`
- CATATAN: working tree sudah punya perubahan uncommitted milik track lain
  (react-perf, interaction, dll); TIDAK di-revert; perubahan saya minimal di atasnya.

## Ronde R01–R20

### R01 — Properties memeriksa elemen yang sudah dihapus/undo [BUG, FIX]
- Skenario: pilih 1 klip → hapus (DeleteElementsCommand {select:[]} membersihkan
  seleksi — normal), lalu undo; atau seleksi menunjuk track yang sudah hilang.
  `InspectorView` (index.tsx L141) me-return `null` saat `getElementsWithTracks`
  kosong sementara `selectedElements.length === 1` — panel blank.
- Bukti: `timeline.getElementsWithTracks` memfilter ref tak dikenal (L415-435);
  `DeleteElementsCommand.execute` me-return `{select: []}` (milik track lain,
  sudah benar); `switchToScene`/`loadProject` membersihkan seleksi (pola yang benar).
- Fix: `if (!elementWithTrack) return <ProjectDetailsView />` — fallback Details,
  bukan blank. Perintah: suite baru panels-bughunt (R-dst). Hasil: PASS.
- Jujur: crash-vs-fallback — tidak ada crash (React me-return null dengan aman),
  tapi blank panel adalah bug UX; fallback Details adalah perilaku editor normal.

### R02 — parseNumericInput melewatkan Infinity ke commands [BUG, FIX]
- Skenario: ketik `Infinity` / `-Infinity` / `1e999` (overflow → Infinity) di
  field transform/text.
- Bukti: `parseFloat("Infinity") === Infinity`, `Number.isNaN(Infinity) === false`
  ( diverifikasi via `bun -e`); `parseNumericInput` lama hanya menolak NaN.
  Infinity lalu ditulis mentah ke commands → meracuni duration math + konversi
  waktu WASM downstream. Perintah: `bun -e` + panels-bughunt.test.ts. Hasil:
  FAIL→PASS setelah fix (`!Number.isFinite` → null).
- Jujur: `12abc` → 12 (parseFloat prefix) dipertahankan — standar browser, bukan bug.
- Speed-tab (`parseSpeedInput`, speed-tab.tsx L56-62) DIVERIFIKASI aman tanpa perubahan:
  `clampRetimeRate` (lib/retime/rate.ts, milik track lain) menolak Infinity/negatif/NaN
  → 1 dan meng-cap 999 → 5 (diverifikasi via `bun -e`). Jalur speed tidak menulis
  mentah seperti jalur transform/text sebelum R02.

### R03 — Audio tab parse (volume/pan/fade) tanpa guard non-finite [BUG, FIX]
- Skenario: `Infinity` di volume/pan/fade-in/fade-out.
- Bukti: keempat parse hanya cek `Number.isNaN` (audio-tab.tsx L90-210). Volume/pan
  memang di-clamp — TAPI `clamp({value: Infinity})` aman hanya karena min+max ada;
  fade memakai clamp juga; masalahnya nilai Infinity tetap lolos snap lalu di-clamp
  ke max (salah diam-diam: maksud pengguna tidak jelas). Konsisten dengan R02:
  tolak di parse → null → no-op.
- Fix: tambah `!Number.isFinite` di keempat parse. Hasil: PASS (suite R-dst).

### R04 — Blending opacity + image opacity tanpa guard non-finite [BUG, FIX]
- Skenario: `Infinity` di opacity (blending-tab L138-142, image-tab L61-65).
- Bukti: hanya cek NaN; `clamp({0..100})(Infinity)` → 100 diam-diam. Sama kelasnya
  dengan R03.
- Fix: tambah `!Number.isFinite` di kedua parse. Hasil: PASS.

### R05 — CameraNumberInput: clamp timpang + Infinity lolos [BUG, FIX]
- Skenario: `Infinity` di Near (hanya min=0.01, tanpa max) / Far (hanya min).
- Bukti: kode lama `min!=null && max!=null ? clamp : parsed` — field min-only
  (near/far/focus) TIDAK di-clamp sama sekali, Infinity mendarat mentah di elemen
  kamera → proyeksi NaN downstream. Diverifikasi via baca + tes parse.
- Fix: (a) tolak NaN/non-finite (no-op); (b) clamp satu-sisi:
  `if (min!=null) max(min); if (max!=null) min(max)` — FOV (1–179) tetap dua-sisi.
  Hasil: PASS (camera-bughunt pins defaults + invariant).

### R06 — Param generik (graphic/effects/adjust) + mask numbers [BUG, FIX]
- Skenario: `Infinity` di PropertyParamField NumberParamField & MaskNumberField.
- Bukti: kedua parse hanya cek NaN (property-param-field.tsx L179-183,
  masks-tab.tsx L678-684).
- Fix: tambah `!Number.isFinite` di keduanya. Hasil: PASS.

### R07 — Text tab numerik (font/spacing/background/animator) [BUG, FIX]
- Skenario: `Infinity` di font-size, letter-spacing, line-height, padding,
  offset, corner-radius, animator duration/stagger.
- Bukti: 9 parse hanya cek NaN. Animator duration/stagger lebih parah: hanya
  `Math.max(min)` tanpa max — input 999s menulis mentah meski NumberField
  mendeklarasikan max (10 / 2).
- Fix: tambah `!Number.isFinite` di semua; animator `onNumberChange` kini menerima
  max dan meng-clamp dua-sisi (duration 0.05–10, stagger 0–2). Hasil: PASS.

### R08 — Graphics-style tab: border opacity tanpa clamp [BUG, FIX]
- Skenario: ketik 200 / -50 di border opacity (0–100 → 0–1).
- Bukti: fill-opacity memakai `setMediaFillOpacity` (clamp 0–1 di dalam), tapi
  border-opacity menulis `parsed/100` mentah — 200% → opacity 2 (blown), negatif
  → invisible — padahal NumberField mendeklarasikan min/max.
- Fix: `Math.max(0, Math.min(1, parsed/100))`. Fill/stroke-width/border-width/
  shadow sudah benar (clamp / Math.max(0)). Hasil: PASS via baca + suite.

### R09 — Text EffectsSection + pivot [VERIFIKASI + FIX parsial]
- Skenario: stroke-width/shadow di EffectsSection memakai `parseNumericInput`
  (R02) — otomatis aman setelah R02, tanpa ubahan. Pivot X/Y hanya cek NaN lalu
  `clamp01` — `clamp01(Infinity)` → 1 diam-diam.
- Fix: tambah `!Number.isFinite` di kedua handler pivot. Hasil: PASS.

### R10 — DetailsView: fps + background NaN [BUG, FIX]
- Skenario: shape project korup (fps denominator 0, blurIntensity NaN).
- Bukti: `numerator/denominator` tanpa guard → Infinity/NaN dirender;
  `bg.blurIntensity.toFixed(1)` → "Blur · NaN".
- Fix: guard denominator>0 + `Number.isFinite(rawFps)` → 0; blur non-finite →
  label "Blur" polos. Hasil: PASS via baca (tidak ada tes DOM baru — jujur).

### R11 — Scene create: default tracks? [VERIFIKASI]
- Skenario: scene baru harus punya track default.
- Bukti: `buildDefaultScene` selalu membangun `tracks.main` (+ overlay/audio kosong);
  `CreateSceneCommand` memakai builder itu. Tidak ada jalur create tanpa tracks.
- Perintah: scenes-bughunt.test.ts ("new scenes carry default tracks"). Hasil: PASS.

### R12 — Delete scene aktif: fallback selection? [BUG, FIX]
- Skenario: hapus scene AKTIF yang sedang punya seleksi.
- Bukti: `DeleteSceneCommand` (milik track lain) mem-fallback activeSceneId ke main
  dengan benar + undo merestore `savedActiveSceneId` (terverifikasi). TAPI tidak
  menyentuh selection — refs dari scene terhapus menjadi stale; inspector resolve
  nol track (sebelum fallback R01 → blank).
- Fix (dalam scope: scenes-manager delete flow): snapshot `wasActive` pre-command
  (command menukar active via setScenes, jadi identitas post-delete tak bisa
  dipakai), clear selection hanya bila yang dihapus aktif. Hapus scene background
  → seleksi dipertahankan. Hasil: FAIL→PASS (2 tes).

### R13 — Delete scene terakhir (empty state?) [VERIFIKASI]
- Skenario: hapus satu-satunya scene non-main.
- Bukti: `canDeleteScene` hanya melarang hapus main; fallback `getMainScene`
  menjamin tidak pernah kosong. Tes: hapus "only" → tersisa ["main"], aktif main.
- Hasil: PASS. Jujur: empty state memang tidak diizinkan — by design.

### R14 — Undo delete restores activeSceneId [VERIFIKASI]
- Skenario: hapus B (aktif) → undo → B aktif lagi.
- Bukti: `DeleteSceneCommand.undo` merestore `savedScenes` + `savedActiveSceneId`
  (file milik track lain — hanya dipanggil, tidak diubah). Tes pin perilaku.
- Hasil: PASS.

### R15 — switchToScene milik track lain: verifikasi utuh [VERIFIKASI]
- Skenario: pastikan fix track lain (selection clear + playhead reset) masih ada.
- Bukti: scenes-manager.ts L105-111 — `clearSelection()` + `seek({time:0})` utuh;
  TIDAK dikerjakan ulang. Tes milik mereka (scenes-100-pass) masih PASS (15/15).
- Hasil: PASS. Jujur: tidak ada perubahan dari saya di fungsi ini.

### R16 — Camera track creation + single-camera invariant [VERIFIKASI]
- Skenario: dua kamera — apakah invariant "satu kamera" dilanggar?
- Bukti: `insertCameraLayer` (milik track lain) memakai ulang track kamera yang ada
  (benar); `findActiveCamera` (baca-saja) — multi-kamera DISEGaja ala Alight Motion:
  highest-visible menang, hide mempromosikan berikutnya, semua-hidden → null
  (diverifikasi via `bun -e`). CameraSwitcher UI sudah menangani multi-kamera.
- Keputusan: BUKAN bug — tidak ada fix. Tes camera-bughunt mengunci invariant.
  Hasil: PASS.

### R17 — editor-provider: rapid A→B + beforeunload [VERIFIKASI]
- Skenario: loadProject A lalu B sebelum A selesai; beforeunload hanya saat dirty.
- Bukti: provider `cancelled` (2 checks) menjaga React state (setIsLoading/setError/
  GPU-degraded), TAPI singleton dijaga satu lapis di bawah via
  `loadProjectSeq`/`isStaleLoad` di project-manager (milik track lain — hanya
  dibaca). Klaim "cancelled guards singleton" akan SALAH — ledger jujur: provider
  menjaga UI state, manager menjaga singleton. beforeunload ter-wire ke
  `save.getIsDirty()` dengan benar + cleanup listener.
- Perintah: provider-bughunt.test.ts (static pins). Hasil: PASS.
- Jujur: tanpa tes deferred-promise browser; static pin adalah yang bisa dilakukan
  dalam scope (provider file milik saya, manager bukan).

### R18 — Selection: multi-select lintas scene? select-all scope? undo restore? [VERIFIKASI + FIX parsial]
- Multi-select lintas scene: selection menyimpan ElementRef tanpa sceneId; scene
  switch membersihkan seleksi (R15) — lintas-scene tidak mungkin by design. ✓
- Select-all scope: `use-editor-actions` "select-all" memakai
  `getActiveScene()` — active scene ONLY. ✓ (milik track lain, hanya dibaca).
- Undo delete restores refs: CommandManager.undo merestore `previousSelection`
  hanya bila command mendeklarasikan selection override; DeleteElementsCommand
  me-return `{select: []}` → undo merestore seleksi semula dengan benar. ✓
- FIX (dalam scope): SelectionManager aliasing — getter mengembalikan array live,
  setter menyimpan referensi caller; mutasi satu pihak mendesync pihak lain tanpa
  notify(). Fix: copy defensif di getter+setter (elements + keyframes).
  Perintah: selection-bughunt.test.ts. Hasil: FAIL→PASS (ditulis merah dulu).

### R19 — editor-ui-store clear logic [BUG, FIX]
- Skenario: tidak ada fungsi clear/reset-all di store ( diverifikasi: tidak ada) —
  popOut/dock guards + persist/throttle (milik track lain) sudah benar.
- Bug ditemukan: `clampFloatingPosition` tanpa sanitize — posisi NaN lolos
  `Math.min/Math.max` sebagai NaN (diverifikasi `bun -e`), persist sebagai JSON
  null, rehydrate menjadi layout rusak.
- Fix: `sanitizeFloatingNumber` (non-finite → default panel itu) + clamp memakai
  nilai tersanitasi; `panelId` diteruskan dari kedua call-site. Tes:
  editor-ui-bughunt.test.ts (NaN + Infinity → finite). Hasil: FAIL→PASS.
  (Noise persist-middleware "storage unavailable" di output bun adalah normal di
  luar browser — bukan kegagalan.)

### R20 — Sweep akhir: biome + tsc + suite tersentuh [VALIDASI]
- Perintah: `bun test <6 suite bughunt>` → 18 pass, 0 fail.
- `bunx biome check --write` pada file yang diubah + `tsc --noEmit` — lihat bawah.
- Jujur: full `bun test` repo tidak dijalankan (terlalu besar + milik banyak track);
  hanya suite tersentuh + suite tetangga (scenes-100-pass 15/15, clipboard 5/5,
  number-field 2/2).

## Laporan lintas-track (jangan fix — hanya lapor)

1. **commands (DeleteSceneCommand/DeleteElementsCommand/CommandManager):** undo +
   selection-override sudah benar; hanya dipanggil dari tes saya, tidak diubah.
2. **persistence (project-manager loadProjectSeq, save-manager getIsDirty):**
   sequencing + dirty-gate sudah benar; tidak diubah.
3. **audio (`use-audio-effects.ts`):** hook memegang chain LOKAL useState, mengabaikan
   `trackId`/`element` (biome-ignore) — AudioEffectsTab tidak pernah persist ke
   timeline. Kemungkinan bug ketahanan (efek hilang saat ganti seleksi), tapi file
   di luar scope → DILAPORKAN, tidak di-fix.
4. **audio-effects-tab `Number.parseFloat(...) || 0`:** `|| 0` menelan Infinity→0
   diam-diam DAN menelan input kosong→0 (bukan no-op). Pola di bawah standar
   parse-guard track ini, tapi file dalam scope parsial (tab terdaftar) — saya
   biarkan karena hook di bawahnya milik track lain; DILAPORKAN agar pemilik
   audio menyeragamkan ke `parseNumericInput`.
5. **clipboard:** tidak tersentuh; hanya dibaca untuk pola getElementsWithTracks.
6. **collab:** tidak tersentuh.

## File yang diubah (rencana → aktual)

- `apps/web/src/components/editor/panels/properties/index.tsx` (R01 fallback)
- `.../properties/tabs/transform-tab.tsx` (R02 parse guard + pivot R09)
- `.../properties/tabs/audio-tab.tsx` (R03 ×4 parse)
- `.../properties/tabs/blending-tab.tsx` (R04 opacity)
- `.../properties/tabs/image-tab.tsx` (R04 opacity)
- `.../properties/tabs/camera-tab.tsx` (R05 blur + clamp satu-sisi)
- `.../properties/components/property-param-field.tsx` (R06 param generik)
- `.../properties/tabs/masks-tab.tsx` (R06 mask numbers)
- `.../properties/tabs/text-tab.tsx` (R07 ×9 + animator max)
- `.../properties/tabs/graphics-style-tab.tsx` (R08 border-opacity clamp + finite)
- `.../properties/tabs/graphic-tab.tsx` (R09 shadow param finite)
- `.../properties/details-view.tsx` (R10 fps + blur guards)
- `apps/web/src/core/managers/scenes-manager.ts` (R12 delete-active clear)
- `apps/web/src/core/managers/selection-manager.ts` (R18 aliasing copies)
- `apps/web/src/stores/editor-ui-store.ts` (R19 NaN sanitize)
- Tes baru (6): `properties/panels-bughunt.test.ts`, `core/managers/selection-bughunt.test.ts`,
  `core/managers/scenes-bughunt.test.ts`, `core/managers/camera-bughunt.test.ts`,
  `core/managers/provider-bughunt.test.ts`, `stores/editor-ui-bughunt.test.ts`
- TIDAK diubah (verifikasi saja): `tabs/speed-tab.tsx` (parse aman via clampRetimeRate),
  `components/providers/editor-provider.tsx`, `lib/*` (commands/scenes/camera/retime),
  `core/managers/timeline-manager.ts`, `core/managers/project-manager.ts`,
  `core/managers/save-manager.ts`, `hooks/*`, `components/ui/number-field.tsx`
- Ledger ini: `docs/features/editor-bughunt-2/panels.md`
