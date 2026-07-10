# QA

## Automated checks

- [ ] `bun run lint:web`
- [ ] `cd apps/web && bunx tsc --noEmit`
- [ ] `bun run build:web`
- [ ] Targeted tests if applicable

## Manual test cases

- [ ] Main editor workflow works.
- [ ] Reload/reopen behavior if relevant.
- [ ] Invalid/stale state handled safely.
- [ ] No horizontal overflow or clipped UI.
- [ ] Existing interactions still work.

## Regression risks

- [ ] Selection behavior.
- [ ] Timeline/keyframe behavior.
- [ ] Panel/tab state.
- [ ] Responsive layout.
