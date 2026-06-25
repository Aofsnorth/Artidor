# QA

## Environment

- OS: Windows 11 (win32)
- Browser: target Chromium (not E2E-tested in this session)
- Commit: working tree on `feat/snap-external-drop-and-audio-db-fix`,
  branch head `893ba9f` (chore: previous session UI/audio cleanup).
  New dB + snap changes are uncommitted at QA time.
- Date: 2026-06-25

## Automated Checks

- [x] Lint: `bun run lint:web` → "Checked 996 files. No fixes applied."
      (no errors, no warnings on the new code)
- [x] Typecheck: `bunx tsc --noEmit` (in `apps/web`) → no output,
      exits 0
- [x] Unit tests: `bun run test` → "203 pass, 0 fail, 467 expect()
      calls. Ran 204 tests across 30 files."
- [ ] Integration tests: N/A
- [ ] E2E: N/A (manual QA only — see below)
- [ ] Build: not run this session
- [ ] Security scan: not run this session

## Manual Test Steps

1. **Snap-to-adjacent (library drag)**
   1. Create a project, add a video clip at t=0.
   2. Turn magnet (snapping) ON via the toolbar toggle.
   3. Drag a second video asset from the asset panel onto the timeline
      so its left edge hovers within ~10 px of the existing clip's
      right edge.
   4. **Expected:** drop indicator snaps to the edge; dropped clip
      touches the existing clip end-to-start.
   5. Turn magnet OFF, repeat → no snap.

2. **Snap-to-adjacent (OS file drop)**
   1. Same setup as #1.
   2. Drag a video file from the OS file explorer onto the timeline
      near the existing clip.
   3. **Expected:** same snap behaviour; clip drops at the snapped
      position.

3. **Additive dB combination**
   1. Create a project with one audio clip.
   2. Set track slider to `+10.0 dB`.
   3. Set inspector Volume (Audio tab) to `-20.0 dB`.
   4. Press play.
   5. **Expected:** audible gain ≈ `-10 dB` (≈ 0.316 linear). Volume
      meter on the master output should reflect this.
   6. Repeat with slider `0.0 dB` + inspector `-30.0 dB` → ≈ `-30 dB`
      (≈ 0.0316 linear, very quiet).
   7. Repeat with slider `0.0 dB` + inspector `0.0 dB` → `0 dB`
      (full, 1.0 linear).

4. **Replay with fade in/out**
   1. Create a clip with `fadeIn = 1 s`, `fadeOut = 1 s`.
   2. Press play → audio fades in over 1 s, plays, fades out over
      1 s.
   3. Stop. Press play again.
   4. **Expected:** audio plays correctly on replay (previously muted
      because `collectAudioClips` returned `volume = 0` for the clip).

5. **Toolbar vertical scroll**
   1. Resize the editor window narrow so the toolbar overflows
      horizontally.
   2. Try to scroll the toolbar vertically (mouse wheel, touchpad
      scroll).
   3. **Expected:** no vertical scroll. Horizontal scroll still works.

## Result

Pass/Fail: **PASS** (all automated checks green; manual steps to be
verified by user before merge).

## Notes

- Test additions: 8 in `audio-state.test.ts`, 6 in `snap-utils.test.ts`.
- One pre-existing `lint/correctness/noUnusedVariables` warning on
  `endTime` in `audio-manager.ts` (carried from an earlier session) was
  cleaned up while in the file.
- The branch is **not pushed** and **no PR is open yet** — the
  harness SOP requires a feature branch + PR (RULES.md #10,
  PERMISSIONS.md → Git Policy). Pending: commit the uncommitted dB +
  snap changes, push, open PR, request review.
- Pre-existing commits on this branch:
  - `2b2898a fix(audio): replay mute with fade in/out + toolbar vertical scroll`
  - `893ba9f chore: previous session UI/audio cleanup`
- A `features/snap-to-adjacent-and-audio-db-fix/AI_AGENT_SOP.md` is
  included in this folder as a permanent reminder of the harness
  procedure for future AI sessions on Artidor.
