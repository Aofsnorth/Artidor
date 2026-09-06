# Editor polish and performance, 2026-09-06

## Scope

- Remove the redundant Projects breadcrumb from the editor header.
- Keep the docked audio meter visible by default and make DIM/VIS switch views.
- Dock three advanced viewers beside Details, with Artidor naming.
- Keep empty-track drop guidance aligned with the visible timeline.
- Make catalog labels consistent and previews varied, original, and idle-aware.
- Apply phase-one preview/export/timeline throughput fixes that can be verified.
- Finish the pending dependency and release-workflow security repairs.

## Implementation

- Shared viewport observation replaces per-track scroll subscriptions.
- Timeline elements outside an overscanned horizontal and vertical window do not mount.
- Marquee animation derives duration from measured overflow and stops while hidden.
- Original deterministic SVG/canvas scenes replace stock-photo catalog inputs.
- Preview animations start only for visible hovered or focused cards.
- Audio analyser loops pause outside playback and hidden tabs; meter movement uses transforms.
- Frame descriptor traversal is synchronous after asynchronous sources resolve.
- Release creation is idempotent and manual backfills cannot replace Latest.

## QA

- `node features/ui-polish-2026-09-06/run-qa.mjs features/editor-polish-performance-2026-09-06/verify.mjs`
  - Passed seven browser scenarios at 375, 768, and 1440 px.
  - Screenshots and `qa.json` are stored in this folder.
- Focused Bun regressions cover monitor state, marquee timing, procedural artwork, and frame assembly.
- Full lint, typecheck, unit tests, Next production build, Bun audit, Cargo audit, release workflow tests, harness policy, and diff hygiene are required before push.

## Risks and rollback

- Performance comparison with commercial editors requires a controlled cross-product benchmark; this phase makes no unsupported ranking claim.
- Procedural previews intentionally prioritize legibility and licensing certainty over photographic realism.
- Revert this feature commit to restore previous UI/render scheduling. Existing projects and schemas are unchanged.
