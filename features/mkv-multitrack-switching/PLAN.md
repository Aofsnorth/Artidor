# Plan

## Approach

This is a multi-phase feature. Per RULES.md "Existing code first" and
DEPENDENCY_POLICY, phase 0 is research: confirm what mediabunny
exposes for multi-track enumeration before writing any feature code.
No new dependency may be added without owner approval.

### Phase 0 — Research (no code changes)

1. Audit the installed `mediabunny` API surface: does `Input` expose
   enumeration of all audio tracks and all subtitle/text tracks (not
   just `getPrimaryAudioTrack()`)? Document exact method names +
   signatures in this file.
2. If mediabunny exposes multi-track audio but not subtitle extraction,
   check whether the web `<video>` element's `HTMLMediaElement.textTracks`
   API can list/enable embedded subtitle tracks for the preview path
   (MKV in the project's preview player).
3. If neither is sufficient, document the gap and propose the smallest
   existing-dependency / standard-platform-API solution. Do NOT add a
   dependency without owner approval + DEPENDENCY_POLICY compliance.

#### Phase 0 Findings (2026-06-29)

**Multi-track AUDIO (dubbing) — FEASIBLE, no new dependency needed.**

mediabunny `Input` exposes:

- `getAudioTracks(query?): Promise<InputAudioTrack[]>` — returns ALL
  audio tracks in file order.
- `getPrimaryAudioTrack(query?): Promise<InputAudioTrack | null>` —
  what the app uses today.
- `InputAudioTrack` extends `InputTrack` which provides:
  - `getNumber()` — 1-based index among same-type tracks.
  - `getLanguageCode()` — ISO 639-2/T language code (`'und'` if
    unknown).
  - `getName()` — user-defined track name (e.g. "Director's
    commentary").
  - `getCodec()` — audio codec.
  - `getDisposition()` — disposition flags (default, forced, etc.).

Call sites to update (replace `getPrimaryAudioTrack()` with
`getAudioTracks()[selectedIndex]`):

- `apps/web/src/lib/media/mediabunny.ts` (lines 34, 213, 296)
- `apps/web/src/lib/media/audio.ts` (line 302)
- `apps/web/src/core/managers/audio-manager.ts` (lines 933, 1017)

**Embedded MKV SUBTITLE tracks — NOT FEASIBLE with mediabunny alone.**

mediabunny's Matroska demuxer (`matroska-demuxer.js`):

- Parses the EBML `TrackType` element. MKV track type 1 = video,
  2 = audio, 17 = subtitle.
- Only creates `InputTrack` backings for video (type 1) and audio
  (type 2). For subtitle tracks (type 17), `info` stays `null` and
  the track is **never pushed to `segment.tracks`** — it is silently
  dropped during demuxing.
- `getTrackBackings()` returns only video + audio tracks.
- `SUBTITLE_CODECS = ["webvtt"]` — mediabunny only recognizes WebVTT
  as a subtitle codec. MKV commonly uses SRT/ASS/PGS/VobSub.
- `SubtitleParser` only parses external WebVTT text, not embedded MKV
  subtitle tracks.

`HTMLMediaElement.textTracks` is NOT applicable because the timeline
preview uses a canvas compositor
(`apps/web/src/services/renderer/compositor/`), not a `<video>`
element. The asset preview overlay uses `<video>` but that is a
separate, non-timeline path. Subtitles on the timeline are rendered
as `TextElement`s on the compositor canvas via
`apps/web/src/lib/subtitles/insert.ts`.

**Options for embedded MKV subtitles:**

1. **Parse MKV EBML ourselves** to extract subtitle track metadata +
   cue data (SRT/ASS text). This is substantial custom code —
   essentially writing a partial MKV subtitle demuxer. Risk: high
   maintenance, edge cases (lacing, codec private data for ASS,
   compression).
2. **Add a new dependency** (e.g. `ffmpeg.wasm` or similar) that can
   extract MKV subtitle tracks. Requires owner approval per
   DEPENDENCY_POLICY + security/license/maintenance/bundle review.
3. **Defer subtitle switching** — implement audio dubbing switching
   now (feasible), and defer embedded subtitle switching to a future
   phase when a proper solution is chosen.
4. **External subtitle files only** — keep the existing SRT/ASS file
   import flow for subtitles; do not attempt to extract embedded MKV
   subtitles. User can export subs from their MKV externally and
   import them.

### Phase 1 — Track enumeration + metadata

1. Extend `getVideoInfo` (and the import pipeline) to return
   `audioTracks: TrackInfo[]` and `subtitleTracks: TrackInfo[]`.
2. Store these on `MediaAssetData` (typed). Add a storage migration
   that defaults existing assets to a single primary track / no
   subtitles — backward compatible.

### Phase 2 — Timeline model

1. Add optional fields to `VideoElement`:
   - `selectedAudioTrackIndex?: number` (default 0 = primary)
   - `selectedSubtitleTrackIndex?: number | null` (null = off)
2. Keep types strict; no `any`. Update `lib/timeline/types.ts` and any
   factory/clone helpers.

### Phase 3 — Audio track selection

1. Replace `getPrimaryAudioTrack()` call sites with a helper that
   resolves the chosen track index:
   - `apps/web/src/lib/media/mediabunny.ts`
   - `apps/web/src/lib/media/audio.ts`
   - `apps/web/src/core/managers/audio-manager.ts`
   - export pipeline (`services/renderer/*`)
2. Verify preview audio switches when the user changes selection
   (re-decode / re-attach source).

### Phase 4 — Subtitle track extraction + rendering

1. Extract the selected embedded subtitle track into `SubtitleCue[]`
   (reuse `lib/subtitles/types.ts`).
2. Render via the existing subtitle rendering path.
3. "Off" = no subtitle element created.

### Phase 5 — UI

1. Properties panel: add track selectors for video elements (audio tab
   + a subtitle control). Only show when >1 track exists.
2. Switching updates `selectedAudioTrackIndex` /
   `selectedSubtitleTrackIndex` on the element (command pattern, undo
   supported).

### Phase 6 — Export

1. Ensure export uses the selected audio track and the selected
   subtitle track (burn-in per existing subtitle export behavior).

### Phase 7 — Tests, What's New, docs

1. Unit tests: track enumeration, default selection, schema migration.
2. Integration: import a multi-track MKV sample, switch, export.
3. What's New entry (tag: feature).
4. Document new exported types/functions.

## Files to Read First

- `apps/web/src/lib/media/mediabunny.ts` (import + `getPrimaryAudioTrack`)
- `apps/web/src/lib/media/audio.ts` (audio collection)
- `apps/web/src/core/managers/audio-manager.ts` (preview audio graph)
- `apps/web/src/lib/media/types.ts` + `apps/web/src/services/storage/types.ts`
  (`MediaAssetData`)
- `apps/web/src/lib/timeline/types.ts` (`VideoElement`)
- `apps/web/src/lib/subtitles/*` (subtitle parse/render)
- `apps/web/src/services/renderer/*` (export pipeline)
- `apps/web/src/services/storage/migrations/` (schema migration patterns)
- `apps/web/src/components/editor/panels/properties/tabs/audio-tab.tsx`
- `node_modules/mediabunny/` typings (Phase 0 research)

## Files Expected to Change

- `apps/web/src/lib/media/mediabunny.ts` — multi-track enumeration.
- `apps/web/src/lib/media/types.ts` / `services/storage/types.ts` —
  track metadata on `MediaAssetData`.
- `apps/web/src/lib/timeline/types.ts` — `VideoElement` track fields.
- `apps/web/src/lib/media/audio.ts` — resolve chosen audio track.
- `apps/web/src/core/managers/audio-manager.ts` — chosen track in
  preview.
- `apps/web/src/services/storage/migrations/` — new migration for the
  new fields (defaults safe).
- `apps/web/src/services/renderer/*` — export uses chosen tracks.
- `apps/web/src/components/editor/panels/properties/tabs/audio-tab.tsx`
  (and possibly a subtitle control) — UI selectors.
- `apps/web/src/lib/whats-new/feed.ts` — feature entry.
- New tests under `apps/web/src/lib/media/__tests__/` and
  `apps/web/src/services/storage/migrations/__tests__/`.

## Test Plan

- Unit:
  - Track enumeration returns expected indices/labels.
  - Default selection = primary audio, subtitles off.
  - Schema migration preserves existing projects.
  - `resolveAudioTrackForElement` picks the right track index.
- Integration:
  - Import a multi-track MKV sample, assert tracks enumerated.
  - Switch audio track, assert preview audio source changes.
  - Switch subtitle track, assert cues rendered.
  - Export, assert output uses selected tracks.
- E2E: optional; covered by integration + manual QA.
- Manual QA:
  1. Import MKV with 2 dubs + 2 subs.
  2. Switch dubbing → preview audio changes.
  3. Switch subtitle → preview overlay changes.
  4. Subtitle off → no overlay.
  5. Save + reload → choices persist.
  6. Export → output matches selections.
  7. Single-track MP4 → controls hidden, no regression.

## Rollback Plan

- The feature is gated on the presence of multi-track metadata on the
  media asset / element. Reverting the implementing commits restores
  `getPrimaryAudioTrack()` behavior.
- Schema migration is additive (new optional fields with safe
  defaults); reverting code does not corrupt existing projects.
- No dependency additions expected (Phase 0 will confirm). If a
  dependency was added, its removal is documented in
  `docs/harness/DEPENDENCY_DECISIONS.md` and reverted alongside.
