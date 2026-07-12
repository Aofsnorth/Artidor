# QA

## Environment

- OS: Windows 10
- Browser: Brave target; browser-specific manual export run required
- Commit: working tree after `1d78ff7`
- Date: 2026-07-12

## Automated Checks

- [x] Typecheck: `cd apps/web && bunx tsc --noEmit`
- [ ] Lint: pending
- [x] Targeted unit tests: export policy, snap points, segment plan, warm worker
- [ ] Full unit tests: pending
- [ ] Build: pending
- [ ] E2E: not run; no browser harness/project fixture for GPU export
- [ ] Security scan: not run; no security-sensitive path changed

## Manual Test Steps

1. Export a 1080p project in Brave and check `[parallel-export]` for GPU-aware worker policy.
2. Export a 4K project in Brave and compare completion time with the previous build; the automatic policy uses at most two GPU compositor workers.
3. Drag-scrub a timeline with many clips/keyframes and confirm snapping and keyframe selection remain correct.
4. Open, save, and reload a project; confirm storage remains available after an IndexedDB version change.

## Result

Pass: targeted tests and TypeScript typecheck. Full lint/test/build pending.

## Notes

GPU utilization is not an acceptance metric. The meaningful result is export throughput without WebGPU context/VRAM contention. Browser DevTools console logs selected worker policy and output dimensions.
