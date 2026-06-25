# Risks

## Technical Risks

- **Track slider domain change is a behaviour change for existing
  projects.** Stored `trackSliders` values in the 0–100 range (legacy
  percentage semantics) will now be interpreted as 0–100 dB. A
  project with `trackSliders[id] = 50` will be ~50 dB hot after the
  change. Likelihood: medium. Impact: medium (audible loudness shift).
  Mitigation: document in What's New + release notes; consider a
  follow-up storage migration that remaps percentage → dB.
- **Snap-to-adjacent may surprise users who rely on "drop slightly
  past the edge" behaviour.** Magnets can feel sticky if the user
  didn't expect it. Mitigation: keep magnet toggle front-and-centre in
  the toolbar; existing behaviour is unchanged when toggle is off.
- **`linearToDb(0)` returns `VOLUME_DB_MIN`, not a NaN.** If the base
  gain is ever exactly 0 (element muted, or volume explicitly set to
  -inf dB), the additive combine path clamps to `-60 dB`, not zero.
  This matches existing clamp semantics and avoids `NaN`/`-Infinity`
  in WebAudio nodes.

## Security Risks

- None. No new network surfaces, no new permissions, no auth/AI/MCP
  changes.

## UX Risks

- **Display change: `X %` → `X.X dB` on the track slider.** Users who
  had muscle memory for "slider at 100% = full" now see "slider at
  0 dB = full". Mitigation: What's New + the tooltip on the slider
  still reads "Track volume: 0.0 dB", so the new unit is visible.
- **Replay-mute fix changes audio behaviour for users who happened
  to be relying on the bug.** Unlikely; the previous behaviour was
  universally broken for fade-in clips.

## Performance Risks

- **Snap-to-adjacent adds two `snapElementEdge` calls per drag-over
  frame.** Both calls are O(elements) which is bounded by the scene's
  total element count (typically <1000). Combined with the existing
  `computeDropTarget` already running per frame, the overhead is
  negligible. No mitigation needed.

## Mitigations

- What's New entry surfaces the dB change + replay-mute fix.
- `linearToDb` clamps to `VOLUME_DB_MIN` to keep WebAudio node values
  finite.
- Snap helpers are pulled from the existing `lib/timeline/snap-utils.ts`
  primitive, so the snap behaviour is identical to internal-drag snap
  (no new code paths to maintain).
- Single feature branch; one revert restores prior behaviour if a
  blocking regression is found post-merge.
