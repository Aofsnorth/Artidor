# QA

## Environment

- OS: Windows 10
- Browser: Brave target; browser-specific manual export run required
- Commit: working tree after `1d78ff7`
- Date: 2026-07-12

## Automated Checks

- [x] Lint: `bun run lint:web`
- [x] Typecheck: `cd apps/web && bunx tsc --noEmit`
- [x] Unit tests: `bun run test` — 311 pass, 0 fail
- [x] Targeted regression tests: export policy, snap points, segment plan, warm worker, What's New
- [ ] Integration tests: covered by existing renderer unit suite; no real Brave GPU fixture
- [ ] E2E: not run; no browser harness/project fixture for GPU export
- [x] Build: `bun run build:web`
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
