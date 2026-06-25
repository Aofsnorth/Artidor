# TODO

- [x] Read relevant files (snap-utils, drag-drop hook, audio-manager,
      audio-state, audio.ts, timeline-element, timeline/index, toolbar)
- [x] Confirm scope (snap-to-adjacent + additive dB + replay-mute +
      toolbar scroll)
- [x] Implement minimal patch on a feature branch
- [x] Add/update tests (audio-state + snap-utils)
- [x] Run `bun run lint:web` — clean
- [x] Run `bunx tsc --noEmit` (in `apps/web`) — clean
- [x] Run `bun run test` — 203 pass, 0 fail
- [x] Commit the uncommitted dB + snap changes
- [x] Push branch and open PR (RULES.md #10 / PERMISSIONS.md)
- [ ] Request review (CODEOWNERS)
- [ ] Run `bun run build:web` post-commit
- [ ] Run `cargo check` + `cargo test` (rust/ untouched but SOP gate)
- [ ] Run `semgrep scan` (optional, security gate)
- [ ] Run `gitleaks detect` (optional, security gate)
- [ ] Update `docs/qa/2026-06-25-session-qa.md` with this feature's
      QA notes
- [ ] Mark STATE.md status as `merged` once PR is merged
