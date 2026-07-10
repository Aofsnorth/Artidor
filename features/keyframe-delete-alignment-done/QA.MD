# QA

## Automated checks

- [x] `bun run lint:web`
- [x] `cd apps/web && bunx tsc --noEmit`
- [x] `bun run build:web`
- [x] `bun test apps/web/src/lib/whats-new/__tests__/feed.test.ts`

## Manual test cases

- [ ] Right-click a keyframe and use `Delete keyframe`.
- [ ] Double-click a keyframe to delete it.
- [ ] Add a keyframe at the playhead and confirm the playhead line stays centered through the keyframe.
- [ ] Confirm other keyframe interactions still work: select, drag, context menu easing.

## Regression risks

- Selection behavior.
- Timeline/keyframe behavior.
- Panel/tab state.
- Responsive layout.
