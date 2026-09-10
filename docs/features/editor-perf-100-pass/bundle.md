# Bundle pass (editor-perf-100-pass)

Scope (OWN ONLY): dynamic-import conversions of heavy panels ONLY where a
loading fallback already exists, plus this static audit report. No new deps,
no installs, no `package.json` edits (recommendations only). Followed repo
rules (`RULES.md`, `AGENTS.md`) + `docs/harness/DEPENDENCY_POLICY.md`.

Out of scope (untouched, documented only): `_headers` (read-only audit),
transitive-weight estimates, `package.json` removal recommendations.
No visual/behavior change; no logic moves into components.

Baseline (measured, not assumed):

- Icon libs across `apps/web/src`: `lucide-react` 40 files, `@hugeicons/react`
  102 files / `@hugeicons/core-free-icons` 103 files, `react-icons` 5 files
  (6 icon usages: `FaDiscord` x1, `FaGithub` x4, `RiDiscordFill` x1,
  `RiTwitterXLine` x1). No 4th icon lib (radix hits are UI primitives, not
  icons; "feather" hits are mask params).
- `react-icons` on-disk cost: 84M vs `lucide-react` 39M
  (`node_modules/.bun/*`, includes package's full icon set, not shipped
  bytes — tree-shaking means shipped cost is per-icon, but fewer libs =
  fewer transitive graphs to resolve/maintain).
- `lucide-react` has NO brand icons (only git primitives) — so hugeicons
  (which ships `GithubIcon`, `DiscordIcon`, `NewTwitterIcon`) is the correct
  replacement target, not lucide.
- Transformers: BOTH packages installed (`@huggingface/transformers` 13M,
  `@xenova/transformers` 45M). Code imports: `@xenova` x1
  (`lib/segmentation/ai-cutout.ts:37`, already `await import`, lazy, cached),
  `@huggingface` x2 real (`services/transcription/segments.ts` type-only,
  `services/transcription/worker.ts:72` already `await import` inside the
  worker with an explanatory comment) + x1 prose mention in
  `lib/whats-new/feed.ts:456` (changelog copy, not code).
- Editor route already lazy: dialogs/overlays (`AdvancedViewersPanel`,
  `Onboarding`, `MigrationDialog`, `TeleprompterDialog`, `TemplatesDialog`,
  `SettingsDialog`), all asset sub-views in `panels/assets/index.tsx` (each
  with `Suspense` fallback), `advanced-viewers-panel.tsx` internals
  (`ScopesCard`, `ColorWheelsTab`, `DavinciAdjustTab` via `next/dynamic`
  with `ViewerLoading`).
- `_headers` (`apps/web/public/_headers`): only
  `/_next/static/* Cache-Control: public,max-age=31536000,immutable`.
- `artidor-wasm` pkg: 3.2M on disk (3.1M `.wasm` + 128K JS glue); imported
  statically (value imports) in ~10 editor-route files + `core/managers/*`,
  mostly tiny pure helpers (`roundToFrame`, `formatTimecode`).

## Fixes

- `components/editor/editor-header.tsx` — `FaDiscord` → `DiscordIcon`
  (hugeicons, already a dependency; merged into the existing icon import).
- `components/footer.tsx` — `FaGithub` → `GithubIcon`, `RiTwitterXLine` →
  `NewTwitterIcon`, `RiDiscordFill` → `DiscordIcon`.
- `components/header.tsx` — `FaGithub` → `GithubIcon`.
- `components/landing/hero.tsx` — `FaGithub` → `GithubIcon`.
- `components/landing/pledge-section.tsx` — `FaGithub` → `GithubIcon`.
- Result: `react-icons` imports 5 files → 0 files (6 usages → 0).
  `lucide-react` unchanged (40 files). hugeicons 102→106 / 103→107 files
  (4 newly-touched files already imported hugeicons elsewhere in the same
  file except footer/header/hero/pledge which now join it — no new dep).
- `components/editor/share-button.tsx` — `StartCollabDialog` static import →
  `next/dynamic` (`ssr: false`, no outer fallback needed: Radix `Dialog`
  renders nothing until `open`; the Invite dropdown + presence bar stay
  static so the header never flashes). `CollabPresenceBar` /
  `CollabSessionBanner` stay static (they render `null` when disconnected —
  cheap, no dialog graph).
- `components/editor/panels/properties/tabs/speed-tab.tsx` —
  `FrameInterpolationSection` static import → `next/dynamic` (`ssr: false`;
  only renders for `element.type === "video"`; speed controls stay static
  and interactive while the chunk loads; section's own loading/error states
  live inside it).

NOT converted (deliberate, with reason):

- `artidor-wasm` value imports — tiny pure helpers on the hot path
  (timeline math per-frame); splitting would add async boundaries to
  synchronous math for ~zero shipped-byte win (3.1M wasm already streams
  via `wasm-preload`/compositor path, not the JS import).
- `mediabunny` static imports (`audio-manager.ts`, `filmstrip-cache.ts`,
  `lib/media/*`) — no loading fallback exists at those call sites
  (audio decode + timeline filmstrips render inline on mount); converting
  without a fallback violates the task's own constraint.
- `motion` (landing only, not the editor route) — out of scope.
- `ExportModal`, `StartCollabDialog` outer fallbacks — `null`/Dialog-closed
  semantics already cover them; adding spinners would flash on dialogs that
  are closed 99% of the time.

## Recommendations (NOT applied — needs owner approval)

1. Remove `react-icons` from `apps/web/package.json` — zero imports remain
   after this pass. Rollback: `bun add react-icons@^5.4.0`. Saves the 84M
   on-disk graph + one transitive tree. (No `package.json` edit per task
   constraints.)
2. Remove `@xenova/transformers` (45M) OR `@huggingface/transformers` (13M)
   — only one ML runtime should exist. Evidence: `ai-cutout.ts` uses
   `@xenova` (MODNet bg-removal), `transcription/worker.ts` uses
   `@huggingface` (ASR). If both features ship, keep both and close as
   wontfix; if bg-removal migrates to the HF runtime, delete `@xenova`
   (bigger win). Either way the dedupe saves one full ML graph.
   (Recommendation only — no `package.json` edit.)
3. COOP/COEP: do NOT ship. Verdict: infeasible today. Blockers:
   `next/font/google` self-hosts font CSS but `lib/fonts/google-fonts.ts`
   fetches `fonts.googleapis.com/css2` at runtime for the atlas;
   `lib/drive/api.ts` touches `www.googleapis.com` + OAuth popups;
   `lib/segmentation/person-segmenter.ts` + `lib/frame-interpolation/ai.ts`
   load WASM/models from `cdn.jsdelivr.net` + `storage.googleapis.com`;
   `@vercel/analytics` + `@vercel/speed-insights` inject cross-origin
   beacons from `app/layout.tsx`. COEP `require-corp` would break all of
   these without `crossorigin` + CORP headers on third parties we don't
   control. Revisit only if fonts/models vendor fully local AND Drive +
   analytics go behind same-origin proxies.
4. Static weight audit — 10 heaviest transitive imports reachable from the
   editor route (on-disk `du -sh` of `node_modules/.bun/*`, ESTIMATES, not
   shipped bytes; shipped cost after tree-shaking/chunking is smaller):
   1. `onnxruntime-web@1.26.0-dev` ~129M (frame-interp RIFE probe — already
      lazy via dynamic CDN import in `lib/frame-interpolation/ai.ts`).
   2. `onnxruntime-web@1.14.0` ~66M (dup version — dedupe candidate).
   3. `@hugeicons/core-free-icons` ~50M (102+ files — per-icon ESM, ships
      only imported icons; count is fine, lib count is the win).
   4. `@xenova/transformers` ~45M (bg-removal — already `await import`).
   5. `lucide-react` ~39M (40 files incl. shadcn `ui/*` — per-icon ESM).
   6. `@mediapipe/tasks-vision` ~34M (person-segmenter — already dynamic +
      CDN WASM).
   7. `@huggingface/transformers` ~13M (transcription worker — already
      dynamic inside worker).
   8. `mediabunny` ~11M (audio/filmstrip — static, no fallback; see above).
   9. `artidor-wasm` ~3.2M (3.1M wasm binary — streams, not JS-parse).
   10. `react-icons` ~84M on disk → 0 after this pass (removal rec above).
   Note: `motion` ~676K is landing-only, not editor-route reachable.

## Review log (20 distinct rounds)

### Round 1 — icon census before

Scenario: count icon-lib importing files across `apps/web/src`.

Evidence: `grep -l` per lib.

Result: PASS. lucide 40 / hugeicons-react 102 / hugeicons-core 103 /
react-icons 5 files. Counts recorded above.

### Round 2 — 4th-lib check

Scenario: grep for tabler/heroicons/phosphor/feather/iconify/fontawesome/
remixicon imports.

Evidence: only `@radix-ui` primitives + mask `feather` params (domain term).

Result: PASS. No 4th icon lib exists.

### Round 3 — lucide brand-icon availability

Scenario: list `lucide-react/dist/esm/icons` for github/discord/twitter.

Evidence: only git primitives (`git-branch`, `git-fork`…), no brand marks.

Result: PASS. Lucide cannot replace brand icons — hugeicons is the target.

### Round 4 — hugeicons brand equivalents exist

Scenario: grep hugeicons `dist/types/index.d.ts` + read ESM icon modules.

Evidence: `GithubIcon`, `DiscordIcon`, `NewTwitterIcon` all ship with
`currentColor` stroke API compatible with existing `className` sizing.

Result: PASS. Replacement is 1:1, no visual change.

### Round 5 — editor-header brand swap

Scenario: `FaDiscord` → `DiscordIcon`; merge into existing icon import.

Evidence: file read + edit + `tsc` round 15.

Result: PASS. No duplicate import (fixed in round 14).

### Round 6 — footer brand swap (3 icons)

Scenario: `FaGithub`/`RiDiscordFill`/`RiTwitterXLine` → hugeicons.

Evidence: file read + edit + `tsc` round 15.

Result: PASS.

### Round 7 — header brand swap

Scenario: `FaGithub` → `GithubIcon`.

Result: PASS.

### Round 8 — hero brand swap

Scenario: `FaGithub` → `GithubIcon`.

Result: PASS.

### Round 9 — pledge-section brand swap

Scenario: `FaGithub` → `GithubIcon`.

Result: PASS.

### Round 10 — react-icons zero check

Scenario: re-grep `from "react-icons` across `apps/web/src` after edits.

Evidence: zero matches; counts lucide 40 / hugeicons 106/107.

Result: PASS. 5 files → 0; usages 6 → 0.

### Round 11 — transformers live-import audit

Scenario: grep `@huggingface/transformers|@xenova/transformers`.

Evidence: xenova x1 (lazy), HF x2 real (type-only + worker-dynamic) + x1
prose. Both already dynamic where it matters.

Result: PASS. No code change needed; removal rec recorded (rec 2).

### Round 12 — editor-route lazy coverage audit

Scenario: read `app/editor/[project_id]/page.tsx` 1–120 + 400–790,
`panels/assets/index.tsx`, `advanced-viewers-panel.tsx`,
`editor-provider.tsx`.

Evidence: dialogs, asset views, viewer tabs, command palette all already
lazy with fallbacks (`AIEditFallback`, `LoadingView`, `ViewerLoading`,
`Suspense fallback={null}` for closed dialogs).

Result: PASS. Only collab-dialog + frame-interp section left static with a
safe fallback story — converted in rounds 13–14.

### Round 13 — collab dialog dynamic conversion

Scenario: `StartCollabDialog` static → `next/dynamic(ssr:false)` in
`share-button.tsx`; presence bar/banner stay static.

Evidence: edit + `tsc` round 15 + collab tests round 17.

Result: PASS. Fallback = Dialog-closed null semantics (documented).

### Round 14 — frame-interp section dynamic conversion

Scenario: `FrameInterpolationSection` static → `next/dynamic(ssr:false)` in
`speed-tab.tsx`; first attempt dropped `@/utils/math` import, second
attempt left unused `Suspense,lazy` — both fixed by re-reading the file.

Evidence: two corrective edits + `tsc` round 15.

Result: PASS. Speed controls stay static/interactive during load.

### Round 15 — typecheck

Scenario: `cd apps/web && bunx tsc --noEmit`.

Evidence: one failure (duplicate `HugeiconsIcon` in editor-header from
round 5) → fixed → clean.

Command: `bunx tsc --noEmit`

Result: PASS (clean after 1 fix).

### Round 16 — biome lint on 7 touched files

Scenario: `bunx biome lint` on all changed source files.

Command: `bunx biome lint apps/web/src/components/editor/editor-header.tsx
apps/web/src/components/footer.tsx apps/web/src/components/header.tsx
apps/web/src/components/landing/hero.tsx
apps/web/src/components/landing/pledge-section.tsx
apps/web/src/components/editor/share-button.tsx
apps/web/src/components/editor/panels/properties/tabs/speed-tab.tsx`

Result: PASS. No diagnostics.

### Round 17 — collab tests

Scenario: `bun test --isolate apps/web/src/lib/collab
apps/web/src/core/managers/collab-manager.test.ts` (covers the statically
kept collab store/protocol under the new dynamic dialog).

Command: `bun test --isolate apps/web/src/lib/collab
apps/web/src/core/managers/collab-manager.test.ts`

Result: PASS. 25 pass / 0 fail.

### Round 18 — full web unit suite

Scenario: `bun test --isolate apps/web/src`.

Command: `bun test --isolate apps/web/src`

Result: PASS. 662 pass / 0 fail across 138 files.

### Round 19 — _headers + COOP/COEP feasibility read

Scenario: read `apps/web/public/_headers`; grep cross-origin deps (fonts,
Drive, Freesound, analytics, CDN WASM).

Evidence: fonts runtime CSS, Drive API+OAuth, jsdelivr + googleapis WASM,
Vercel beacons.

Result: PASS (audit). Verdict: do NOT ship (rec 3). File untouched.

### Round 20 — transitive weight estimates

Scenario: `du -sh` of `node_modules/.bun/*` for runtime-relevant pkgs +
`rust/wasm/pkg` + filmstrip/audio-manager static-chain check.

Evidence: sizes table above; mediabunny static without fallback (not
converted — constraint); artidor-wasm tiny helpers (not converted —
sync math path).

Result: PASS (estimates marked as such; honest gap: no real bundle
analyzer run — see gaps).
