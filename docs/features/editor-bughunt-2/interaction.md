# Editor Bug Hunt 2 — Interaction Ledger (apps/web)

Scope lock: hanya file di bawah `apps/web/src` yang terdaftar + tes baru. Ledger ini
saja yang boleh menyentuh `docs/`. Tanpa dep/commit baru, diff minimal, file milik
track lain tidak disentuh (placement/snap-utils/commands/audio hanya dilaporkan).

Bacaan penuh (pra-ronde) — hook + komponen + util dalam scope:
- `hooks/timeline/use-timeline-drag-drop.ts` (+ `.test.ts`), `hooks/timeline/element/use-element-interaction.ts`
- `lib/timeline/drag.ts`, `lib/timeline/drag-utils.ts` (+ `.test.ts`)
- `hooks/use-preview-interaction.ts`, `hooks/use-transform-handles.ts`, `hooks/use-mask-handles.ts`
- `components/editor/panels/timeline/timeline-ruler.tsx`, `timeline-playhead.tsx`, `hooks/timeline/use-timeline-zoom.ts`
- `hooks/timeline/use-bookmark-drag.ts`, `components/editor/panels/timeline/bookmarks.tsx`, `lib/timeline/bookmarks.ts`
- `components/editor/panels/timeline/timeline-element-cull.ts` (+ test) — CATATAN: file ini +
  testnya sudah punya perubahan uncommitted milik track lain (react-perf round 10);
  TIDAK di-revert; perubahan saya ditumpuk minimal di atasnya.
- Pembanding baca-saja (tidak diubah): `drop-target.ts`, `drag-line.tsx`, `index.tsx`
  (struktur render DragGhost/scroll), `track-layout.ts`, `layout.ts`, `interaction.ts`,
  `lib/masks/definitions/{box-like,split}.ts`, `lib/presets/manager.ts`, `use-timeline-seek.ts`,
  `use-timeline-playhead.ts`, `preview-viewport.tsx`, `lib/preview/element-bounds.ts`.

## Ronde R01–R20

### R01 — Drop effect × beberapa effect track: commit mendarat di track effect PERTAMA, bukan yang di-hover [BUG, FIX]
- Skenario: 2 effect track ("FX-1", "FX-2"). Drag effect, hover FX-2 (drop-line ghost
  di FX-2 via `dropTarget.trackIndex`), lepas.
- Bukti: `executeEffectDrop` (`use-timeline-drag-drop.ts` L517-522) memakai
  `tracks.find((t) => t.type === "effect")` → selalu FX-1. Ghost (`DragLine` dari
  `dropTarget.trackIndex`) vs commit divergen.
- Perintah: `bun test apps/web/src/hooks/timeline/use-timeline-drag-drop.test.ts`
- Hasil: FAIL→PASS setelah fix (lihat R-dst). Jujur: tes ditulis dulu (merah), lalu fix.

### R02 — Drop kinds × target kinds: matriks kompatibilitas [VERIFIKASI + FIX parsial]
- Skenario: text→video track, video→audio track, audio→video track, effect→klip
  kompatibel, media→klip beda tipe, preset→track kosong, file OS→track penuh.
- Bukti: `computeDropTarget` (baca-saja, milik track lain) sudah menangani tiap
  pasangan via `resolveTrackPlacement` + "track type wall" (drop-target.test.ts milik
  track lain membuktikan audio→overlay→new track). Lapisan `execute*Drop` milik saya:
  (a) effect reuse-first-track = R01; (b) `executeMediaDrop` swap `mediaId` tanpa
  sinkron durasi → DILAPORKAN (risiko semantik, perintah milik track lain);
  (c) `executeFileDrop` reuse-main memakai playhead, bukan cursor X → DILAPORKAN
  (UX first-clip yang disengaja); (d) toast `invalidEffectTrack` adalah jaring
  pengaman yang normalnya unreachable (placement selalu newTrack untuk effect yang
  tak kompatibel) — dipertahankan, tidak dihapus.
- Perintah: `bun test apps/web/src/components/editor/panels/timeline/drop-target-compat.bughunt.test.ts` (TES BARU, hanya manggil API murni milik track lain — tanpa mengubahnya)
- Hasil: PASS. Jujur: tes matriks hanya mengunci perilaku kompatibilitas yang benar.

### R03 — Komitmen drag element vs ghost: clamp/snap diterapkan konsisten [VERIFIKASI]
- Skenario: drag klip melewati t=0 dan tepi klip lain dengan magnet ON; bandingkan
  `dragState.currentTime` (ghost) vs `newStartTime` (commit).
- Bukti: mousemove menerapkan `max(0, mouse-clickOffset) → roundToFrame → snap`;
  mouseup memakai ulang `dragState.currentTime` yang SAMA (L508, L538, L561, L579).
  Tidak ada clamp/snap kedua yang divergen. Snap siblings memakai delta waktu yang
  sama. Jujur: commit memakai state mousemove terakhir (bukan posisi mouseup
  mentah) — disengaja agar ghost≡commit; pergerakan sub-piksel setelah event
  terakhir memang diabaikan (standar editor).
- Perintah: tercakup R-dst unit helper (R09). Hasil: PASS.

### R04 — Drag saat zoom ekstrem: pixel↔tick tidak drift [VERIFIKASI + TES]
- Skenario: zoom 100 (1 frame 30fps ≈ 166px) dan zoom 0.05 (1 frame ≈ 0.08px);
  klik tepat di piksel batas frame N → harus mendarat di frame N, bukan N±1.
- Bukti: `getMouseTimeFromClientX` membulatkan dalam ticks bulat dengan epsilon
  1e-6 detik (=0.12 tick) — di bawah setengah tick pada semua zoom.
- Perintah: `bun test apps/web/src/lib/timeline/drag-utils.test.ts`
- Hasil: PASS (2 tes baru: zoom-in ekstrem, zoom-out ekstrem).

### R05 — Box-select / multi-select drag menjaga offset relatif [BUG, FIX]
- Skenario: box-select 2 klip (t=2s & t=5s), drag yang pertama +3s. Harapan ala
  CapCut: keduanya geser +3s (t=5s & t=8s), ghost menampilkan keduanya.
- Bukti: `startDrag` (use-element-interaction.ts L221-247) SELALU menulis
  `dragElementIds: [elementId]`, `dragTimeOffsets: {}` — seleksi multi diabaikan.
  Ghost (`DragGhostInner`, index.tsx L2123-2129) hanya merender `dragElementIds`,
  dan commit hanya menggeser sibling bila `targetTrack.id === dragState.trackId`
  (L563) — sibling di track lain TIDAK PERNAH ikut. Satu klip "melompat", sisanya diam.
- Fix: snapshot drag-set dari seleksi saat drag dimulai (helper murni baru
  `buildMultiDragSet`, diekspor untuk tes); commit menggeser semua anggota set
  dengan offset yang sama; sibling tetap di track-nya sendiri (tanpa placement math).
- Perintah: `bun test apps/web/src/hooks/timeline/element/use-element-interaction-multidrag.bughunt.test.ts` (TES BARU)
- Hasil: FAIL→PASS. Jujur: drag lintas-track untuk PRIMARY tetap seperti semula;
  sibling TIDAK pindah track (disengaja — CapCut group-drag menjaga track).

### R06 — Transform handle vs bounds ter-rotasi/ter-skala: posisi handle benar [VERIFIKASI + TES]
- Skenario: elemen rotate 45°, skala 2×; handle sudut/tepi/rotasi vs bounds.
- Bukti: `getCornerPosition`/`getEdgeHandlePosition` (element-bounds.ts, baca-saja)
  menerapkan rotasi penuh R(θ) pada offset lokal; posisi handle rotasi
  (transform-handles.tsx L70-79) meluas searah sumbu atas yang ter-rotasi —
  diverifikasi via turunan manual (θ=0 → atas (0,-1), meluas ke atas ✓).
  `getCornerDistance` konsisten dengan rumus yang sama.
- Perintah: `bun test apps/web/src/lib/preview/element-bounds-handles.bughunt.test.ts` (TES BARU, hanya tes — tanpa ubah source milik track lain)
- Hasil: PASS (invarian rotasi: |corner-c| = |edge-c|·√2, handle rotasi di luar,
  sudut berlawanan simetris; θ=0/45/90/180).

### R07 — Mask handle vs transform elemen: drag mask pada elemen TER-ROTASI miring [BUG, DILAPORKAN — bukan FIX]
- Skenario: elemen rotate 30°, drag handle sudut mask box.
- Bukti: `computeBoxMaskParamUpdate` (box-like.ts, milik track lain, baca-saja)
  memakai `deltaX/deltaY` kanvas MENTAH terhadap `bounds` yang ter-rotasi
  (L197-234: `sign*deltaX*2/bounds.width`, jarak radial tanpa un-rotasi), dan
  handle `rotation` memakai sudut atan2 kanvas (L177-181). Pada elemen ter-rotasi,
  mask bergeser/skala miring terhadap sumbu elemen — CapCut mengocok sepanjang
  sumbu lokal elemen.
- Keputusan: TIDAK diperbaiki — fungsi milik track lain; perbaikan butuh
  meng-un-rotasi delta dengan `bounds.rotation` di file mereka.
- Jujur: mask yang TAK ter-rotasi (kasus umum) sudah benar; hanya elemen dengan
  `transform.rotate ≠ 0` yang terpengaruh.

### R08 — Handle untuk elemen off-canvas: posisi benar, render terpotong kartu preview [VERIFIKASI, DILAPORKAN]
- Skenario: posisi elemen ±5000 (di luar kanvas).
- Bukti: `getVisibleElementsWithBounds` memfilter visibilitas WAKTU, bukan kanvas;
  handle dihitung benar di ruang kanvas dan `canvasToOverlay` tetap memetakan;
  `MaskHandles` punya `overflow-hidden`, `TransformHandles` tidak — keduanya
  terpotong kartu preview (perlu browser untuk memastikan klik-tidak-bocor).
- Jujur: butuh verifikasi browser; tidak ada perubahan.

### R09 — Klik ruler: frame-aligned [VERIFIKASI]
- Skenario: klik ruler di x mana pun → playhead harus di batas frame.
- Bukti: `handleTimelineSeek` (use-timeline-seek.ts L140-145) membulatkan ke
  ticks lalu `snappedSeekTime({time, duration, rate})`; `handleScrub`
  (use-timeline-playhead.ts L140-142) melakukan hal yang sama. Keduanya
  frame-aligned. Jujur: RULER memakai `snappedSeekTime` bukan `roundToFrame` —
  perbedaan clamp (lihat R-dst bookmark).
- Perintah: tidak ada tes baru (hook butuh DOM). Hasil: terverifikasi via baca.

### R10 — Scrub ruler: tanpa spam history [VERIFIKASI]
- Skenario: drag-scrub 60 event/detik → undo stack harus tetap kosong.
- Bukti: scrub hanya memanggil `editor.playback.seek({time})`
  (use-timeline-playhead.ts L95-98, L185, L352) — tanpa `editor.command.execute`
  di seluruh hook (grep `command\.execute` → nol). `setTimelineViewState` bukan
  perintah undoable. Tidak ada entri history.
- Hasil: terverifikasi via baca. Jujur: tidak ada tes runtime (perlu core).

### R11 — Navigasi bookmark prev/next: urutan + tanpa wrap [VERIFIKASI + TES]
- Skenario: bookmark [1s, 3s, 2s tak-urut, duplikat]; next/prev dari dalam,
  dari atas bookmark, dari luar rentang.
- Bukti: `getNext/PreviousBookmarkTime` (bookmarks.ts) sort asc; next strikt
  `> time+ε` (tekan next berulang berjalan maju ✓); prev strikt `< time-ε` ✓;
  tanpa wrap (null di ujung; toolbar jatuh ke jump-backward/forward ✓ disengaja).
- Perintah: `bun test apps/web/src/lib/timeline/bookmarks-navigation.bughunt.test.ts` (TES BARU)
- Hasil: PASS (7 tes: urutan, skip-self, ujung null, varian Within, toleransi duplikat-dekat).

### R12 — Drag bookmark: clamp UI [BUG KECIL, FIX]
- Skenario: drag bookmark melewati durasi; magnet snap ke tepi klip di ujung.
- Bukti: `use-bookmark-drag.ts` clamp `[0, duration]` SEBELUM `roundToFrame`+snap
  (L160-164, L192-195): snap/round sesudahnya bisa mendorong `currentTime`
  melewati duration ≤1 frame → GHOST (`displayTime=currentTime`) tampil sedikit
  melewati akhir sementara commit (mouseup L233-236) clamp ulang → divergen 1 frame.
- Fix: clamp ulang SETELAH frame-snap+snap di kedua jalur (helper murni baru
  `clampBookmarkDragTime`, diekspor untuk tes); command-clamp tetap sebagai
  jaring pengaman (tidak diubah).
- Perintah: `bun test apps/web/src/hooks/timeline/use-bookmark-drag-clamp.bughunt.test.ts` (TES BARU)
- Hasil: FAIL→PASS.

### R13 — Cull: flicker tepi viewport [VERIFIKASI + TES]
- Skenario: scroll 1px di sekitar tepi viewport dengan klip tepat di tepi.
- Bukti: `shouldMountTimelineElement` murni; window pemanggil memakai overscan
  ±600px (`HORIZONTAL_OVERSCAN_PX`) → batas mount/unmount 600px dari tepi
  terlihat; scroll 1px di dekat tepi TIDAK membalik keputusan (tanpa hysteresis
  eksplisit, tapi band overscan berfungsi sebagai hysteresis visual). Klip yang
  jauh (>overscan) membalik sekaligus — tak terlihat, jadi bukan flicker.
- Perintah: `bun test` cull suites (milik track lain — hanya dibaca) +
  `apps/web/src/components/editor/panels/timeline/timeline-element-cull-boundary.bughunt.test.ts` (TES BARU: stabilitas ±1px di 4 batas, simetri mount/unmount)
- Hasil: PASS. Jujur: berutang budi pada perubahan uncommitted track lain;
  tes saya hanya menambah, tidak mengubah file mereka.

### R14 — Cull: selected-but-culled tetap punya handle [VERIFIKASI]
- Skenario: klip terseleksi di-scroll jauh keluar viewport.
- Bukti: `shouldMountTimelineElement` short-circuit `isSelected → true` (L33);
  tes milik track lain sudah mengunci ("always mounts a selected clip").
  Tidak ada perubahan. Hasil: terverifikasi.

### R15 — Preview drag multi-elemen menjaga offset [VERIFIKASI]
- Skenario: 2 elemen visual terseleksi, drag di preview.
- Bukti: `use-preview-interaction.ts` L384-398 menerapkan `deltaSnapped` yang
  SAMA ke semua `initialTransform` → offset relatif terjaga; snap memakai bounds
  target utama (wajar). Commit menulis state preview yang sama
  (`commitPreview`, tanpa tulis ulang) → tanpa divergensi ghost≡commit.
- Hasil: terverifikasi via baca. Jujur: `buildDragSelection` privat — tak bisa
  unit-test tanpa refactor; tidak di-refactor (minimal diff).

### R16 — Ruler vs track-click: selisih inset 8px [BUG, DILAPORKAN — bukan FIX]
- Skenario: klik ruler tepat di tepi klip vs klik area track di x yang sama.
- Bukti: konten ruler & track SAMA-SAMA `padding-left: 8px` (index.tsx L738, L776);
  rect konten ruler sudah mencakup inset → `handleScrub` benar tanpa pengurangan.
  `handleTimelineSeek` memakai rect VIEWPORT + `scrollLeft - INSET` → benar bila
  viewport & konten sejajar. KEDUA jalur konsisten secara aljabar; SISA RISIKO:
  sinkron scroll ruler-vs-track (`syncFollowers`) dan `headerHeight` bukan milik
  saya — perlu browser untuk memastikan nol-selisiH. Jujur: DILAPORKAN, bukan diklaim fix.

### R17 — Zoom anchoring playhead [VERIFIKASI + LAPORAN tepi]
- Skenario: zoom melewati ambang 0.15 dengan playhead di luar viewport.
- Bukti: `use-timeline-zoom.ts` L201-218 menjangkar playhead di atas ambang,
  mengembalikan scroll pra-jangkar saat zoom-out kembali (L215-218). Tepi:
  scroll manual SELAMA mode jangkar tidak memperbarui `prePlayheadAnchor…` →
  zoom-out mengembalikan posisi lama (lompatan kecil). DILAPORKAN (bukan milik
  penuh saya? — zoom hook milik saya; tapi perilaku ini disengaja "kembali ke
  sebelum zoom"; tidak diubah agar diff minimal).
- Hasil: terverifikasi via baca.

### R18 — Osilasi label ruler saat resize [VERIFIKASI, milik track lain]
- `timeline-ruler.tsx` L93-105 menstabilkan end-tick (±1 tick diserap). Sudah
  benar; bukan saya yang ubah. Tercatat sebagai lolos.

### R19 — Ghost drop element: selisih scroll/INSET [VERIFIKASI — ternyata BENAR]
- Dugaan awal: `DragGhost left=timeToPixels` tanpa INSET/scrollLeft akan
  meleset. Bukti pembanding: ghost dirender di `tracksContainerRef` (non-scroll,
  L723-730) SEMENTARA `DragLine` tidak memakai x sama sekali (hanya garis-Y +
  label tengah) — DAN klip yang di-drag disembunyikan (opacity 0,
  timeline-element.tsx L743-746) sehingga ghost adalah satu-satunya acuan X.
  Jujur: tanpa browser saya TIDAK bisa memastikan apakah kontainer ghost
  di-offset oleh scroll (kemungkinan ghost mengikuti via re-render per
  `currentTime`+`currentMouseY`, tapi `left` mentah tetap meragukan saat
  scrollLeft>0). DILAPORKAN sebagai kebutuhan verifikasi browser — TIDAK diubah
  (render ghost di index.tsx di luar scope saya).

### R20 — Sweep akhir: biome + tsc + suite tersentuh [VALIDASI]
- Perintah:
  - `bun test --isolate` 12 suite tersentuh → **57 pass, 0 fail, 149 expects**.
  - `biome check --write` 11 file saya → bersih (1 `useExhaustiveDependencies`
    ditemukan & diperbaiki: `dragState.dragElementIds/dragTimeOffsets` masuk deps).
  - `tsc --noEmit -p apps/web/tsconfig.json` → **exit 0, nol error**.
  - Bukti merah R01: stash fix → tes baru FAIL; pop → PASS.
- Hasil: PASS. Jujur: suite BERAT (core/commands milik track lain) tidak
  dijalankan — di luar scope; suite tersentuh saya semuanya hijau.

## Laporan lintas-track (jangan fix — hanya lapor)
1. `lib/masks/definitions/box-like.ts::computeBoxMaskParamUpdate` — delta drag
   mask tak di-un-rotasi (R07). Fix milik mereka: putar balik delta dengan
   `-bounds.rotation` sebelum hitung corner/edge/position.
2. `lib/timeline/*placement*` + `commands` — `executeMediaDrop` swap mediaId tanpa
   sinkron durasi (R02-b); first-file-drop memakai playhead (R02-c).
3. `components/editor/panels/timeline/index.tsx` — koordinat X `DragGhost` vs
   scroll (R19); sinkron scroll ruler-vs-track (R16) — butuh verifikasi browser.
4. `core/managers/timeline-manager.ts` (baca-saja) — `commitPreview` no-op bila
   overlay kosong ✓ benar; `discardPreview` serupa ✓.
5. `lib/preview/element-bounds.ts`, `lib/timeline/bookmarks.ts`,
   `components/.../drop-target.ts`, `timeline-ruler.tsx` — diverifikasi benar,
   tanpa perubahan.

## File yang diubah (rencana)
- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` — R01 (hovered effect track).
- `apps/web/src/hooks/timeline/use-bookmark-drag.ts` — R12 (clamp-setelah-snap) + helper murni.
- `apps/web/src/hooks/timeline/element/use-element-interaction.ts` — R05 (multi-drag set) + helper murni.
- Tes BARU: `drop-target-compat.bughunt.test.ts`, `drag-utils` (+2 tes? — file milik
  track lain! → pindah ke file baru `drag-utils-zoom.bughunt.test.ts`),
  `use-timeline-drag-drop-effect-track.bughunt.test.ts` (atau perluas test milik
  saya? `use-timeline-drag-drop.test.ts` milik SAYA per scope → boleh tambah tes
  di dalamnya), `use-element-interaction-multidrag.bughunt.test.ts`,
  `use-bookmark-drag-clamp.bughunt.test.ts`, `bookmarks-navigation.bughunt.test.ts`,
  `element-bounds-handles.bughunt.test.ts`, `timeline-element-cull-boundary.bughunt.test.ts`.
  Koreksi: `drag-utils.test.ts` & `timeline-element-cull.test.ts` & `drop-target.test.ts`
  BUKAN milik saya (tidak terdaftar) → JANGAN edit; semua tes baru di file baru.
