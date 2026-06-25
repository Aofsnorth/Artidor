# Risks

## Technical Risks

- **Adaptive scale oscillation.** If the hysteresis bands are too narrow,
  the tier could flip rapidly between levels, causing visible resolution
  "breathing". Mitigation: struggle factor 1.5×, recover factor 0.7×
  (wide band), plus a minimum-sample count before either decision.
- **Loading overlay flashes on every frame during normal playback.** If
  the threshold is too low, the overlay appears/disappears rapidly.
  Mitigation: 80 ms threshold (5 frames at 60 fps) + 150 ms CSS opacity
  transition. Normal frame renders (5–16 ms) never trigger it.
- **Adaptive scale fights the user's manual choice.** Mitigation:
  adaptive logic ONLY runs when `quality === "auto"`. Manual tiers are
  passed through unchanged.

## Security Risks

- None. No new network surfaces, no new permissions, no auth/AI/MCP
  changes. The perf tracker is in-memory only and never persisted.

## UX Risks

- **Loading overlay could feel intrusive.** Mitigation: subtle spinner,
  low opacity, `pointer-events: none`, short fade-in. It only appears
  when the preview is genuinely struggling, not on every frame.
- **Adaptive downscale reduces visual sharpness.** Mitigation: only
  `auto` mode adapts; users who need full sharpness can pin `high`. The
  scale recovers automatically when the heavy section passes.

## Performance Risks

- **Perf tracker overhead.** The ring buffer is 30 entries; `recordRender`
  is O(1) (overwrite oldest); `getAverageRenderMs` is O(n) where n=30.
  Called once per frame. Negligible.
- **Loading overlay re-render cost.** The overlay is a single
  conditionally-rendered div; React reconciliation cost is trivial.

## Mitigations

- Hysteresis bands prevent oscillation.
- 80 ms threshold + CSS transition prevents flashing.
- Adaptive logic gated to `auto` only — manual tiers untouched.
- In-memory only — no persistence, no migration, trivial rollback.
- Audio clock untouched — A/V sync structurally preserved.
