# TODO

## Done

- [x] Render performance tracker (`render-perf-tracker.ts`)
- [x] Adaptive quality scale for Auto mode (`preview-quality.ts`)
- [x] Loading overlay component (`preview-loading-overlay.tsx`)
- [x] Wire perf tracker + adaptive scale + loading overlay into
      `PreviewCanvas` (`preview/index.tsx`)
- [x] Track slider UI: revert dB → 0–100% percentage
- [x] Speaker mute icon next to volume slider
- [x] Transparency icon next to opacity slider (toggles 0/100)
- [x] Align opacity + volume sliders (same layout, longer range)
- [x] Update `audio-manager.ts` combination logic (both sites)
- [x] Update `timeline-element.tsx` visual waveform scaling
- [x] Update `audio-state.test.ts` for % combination
- [x] Update What's New feed
- [x] Run SOP checks (tsc, lint, test, build — all green)
- [x] Update feature folder docs (STATE, QA, RISKS, TODO)

## Remaining (not in this feature)

- [x] Commit all changes on `feat/snap-external-drop-and-audio-db-fix`
- [x] Push branch
- [ ] Open PR (gh not authenticated — user can open via:
      https://github.com/Aofsnorth/Artidor/pull/new/feat/snap-external-drop-and-audio-db-fix)
- [ ] Manual QA with real large video files (see QA.md checklist)
- [ ] Consider proxy/preview-file system for very large files
      (separate feature, requires roadmap approval)
