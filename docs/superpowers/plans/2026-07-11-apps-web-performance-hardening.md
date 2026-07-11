# Apps/Web Performance and Hardening Plan

## Goal
Stabilize CI/security, remove verified correctness bugs, then optimize `apps/web` using measured bottlenecks while preserving Chromium-maximal performance and safe Firefox/Safari fallbacks.

## Constraints
- Preserve current user changes.
- No speculative renderer rewrite.
- Browser-native APIs before dependencies.
- One verified root cause per change.
- Tests first for behavior changes.
- Validate lint, typecheck, tests, build, security workflows.

## Execution batches
1. CI/security baseline and verified export-worker lifecycle bug.
2. Bundle ownership analysis and lazy-loading of measured heavy paths.
3. Timeline/preview profiling and targeted rerender reduction.
4. Export profiling, adaptive backpressure/worker count only when benchmarks prove benefit.
5. API/auth/persistence audit and verified bug fixes.
6. Cross-browser fallback tests, E2E, final security/performance gates.

## Batch 1 files
- `apps/web/src/services/renderer/export-worker.ts`
- `apps/web/src/services/renderer/export-worker.test.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/bun-ci.yml`

## Batch 1 acceptance
- A cancelled warm worker accepts the next export.
- CI uses a deterministic high-entropy-format test secret, not the warning-producing placeholder.
- Focused regression test passes.
- Full lint, typecheck, unit tests, production build pass.
