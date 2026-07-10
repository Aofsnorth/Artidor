# Plan — Realtime Editor FPS Monitor

## Likely files involved

- `apps/web/src/app/editor/[project_id]/page.tsx`
- Editor shell/layout components under `apps/web/src/components/editor/`
- Settings components under `apps/web/src/components/editor/` or app settings panel paths discovered during audit
- Existing settings store/hooks if present
- New small hook/component if needed, e.g. editor-only FPS monitor leaf component

## Current Settings system audit

1. Search for settings panel/card components.
2. Identify existing persistence store/hook.
3. Check whether settings are project-independent or project-scoped.
4. Prefer existing app settings storage.
5. If none exists, propose small `localStorage` key such as `artidor:editor-settings:v1`.

## Current editor bottom-left UI audit

1. Inspect editor shell and timeline layout.
2. Identify bottom-left occupied controls.
3. Choose non-blocking placement with safe z-index and pointer behavior.
4. Verify small viewport behavior.

## Proposed FPS measurement approach

- Use `requestAnimationFrame` inside a client-only leaf component/hook.
- Track frame deltas with a rolling average.
- Update visible FPS at a throttled cadence, e.g. 3-4 times per second.
- Stop/cancel rAF when disabled or unmounted.
- Do not store measurement values in global project state.

## Settings persistence approach

- Use existing app settings storage if available.
- Otherwise use safe project-independent localStorage key.
- Avoid sensitive data.
- Read after mount to avoid SSR mismatch.

## Implementation phases

1. Phase 0: Review and approve workflow docs.
2. Phase 1: Audit settings and editor placement.
3. Phase 2: Add persistent toggle plumbing.
4. Phase 3: Add low-overhead FPS hook/component.
5. Phase 4: Place bottom-left badge safely.
6. Phase 5: QA and verification.

## Testing plan

- Toggle on/off test.
- Reload persistence test.
- FPS value updates test.
- Disabled state stops badge and measurement.
- No timeline/control overlap.
- Responsive/mobile small viewport check.
- Commands: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, relevant tests, `bun run build:web`.

## Rollback plan

- Remove FPS component/hook and settings toggle.
- Remove localStorage key usage if newly added.
- No project data migration required.
