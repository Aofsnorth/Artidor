# Feature: Editor performance phase 2

## Problem

Export startup can wait longer than its documented first-message timeout, repeated audio clips can trigger duplicate unbounded decoding, timeline playback performs duplicate autoscroll frame work, and the landing artwork can wash out translucent light text.

## Goal

Remove those structural costs without changing export output, timeline semantics, or landing layout.

## Roadmap Alignment

- [x] P1 Performance on heavy projects
- [x] Stabilization and editor reliability

## Acceptance Criteria

- [ ] First export-worker message uses a maximum 10-second timeout.
- [ ] Timeline playback uses one playhead/autoscroll update owner.
- [ ] Identical audio decode requests share work within one collection.
- [ ] Audio decoding has bounded concurrency.
- [ ] Landing text stays readable over the full artwork.
- [ ] Focused and canonical checks pass.
