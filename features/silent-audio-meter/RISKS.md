# Risks

## Technical Risks

- The analyser may report a non-128 baseline (DC offset or dither)
  even for true silence, which a pure UI gate avoids entirely by not
  reading the analyser when silent. Mitigation: gate at the read site,
  not by thresholding analyser output.
- `timelineHasAudio` is computed from the full timeline; if the meter
  needs per-element granularity (e.g. only the currently playing clip
  matters), the helper must accept the active element set. Mitigation:
  start with timeline-level silence; refine only if QA shows a gap.

## Security Risks

- None. No secrets, no auth, no MCP, no network. Pure UI/logic fix.

## UX Risks

- A video that is "almost silent" (very low but non-zero audio) could
  be classified as silent if the helper is too aggressive. Mitigation:
  the helper only declares silence when there is *no audible
  candidate* or *muted*, not based on amplitude thresholding. Real
  quiet audio still drives the meter.

## Performance Risks

- Negligible. The helper is O(tracks × elements) and only runs once
  per frame; the existing meter already does per-frame work. Skipping
  analyser reads when silent actually reduces work.

## Mitigations

- Keep the helper pure and typed; unit-test the truth table.
- Do not change the audio graph wiring (avoids regressions in
  visualizer / export paths).
- Smallest safe change: gate reads, do not rewrite meter math.
