# Plan — Grid Template Card Placement

## Likely files involved
- `apps/web/src/components/editor/panels/assets/views/templates.tsx`
- `apps/web/src/components/editor/panels/assets/panel.tsx`
- `apps/web/src/components/editor/panels/assets/asset-card-size.tsx` or equivalent card-size control if present
- Shared card/list UI components under `apps/web/src/components/editor/panels/assets/`
- Template preset/data files under `apps/web/src/lib/` if needed for labels/previews only

## Components/modules affected
- Template asset tab UI.
- Template card preview container.
- Template card label/action area.
- Responsive grid wrapper.

## Current card layout audit plan
1. Read template asset view implementation.
2. Identify current grid/list CSS classes.
3. Verify whether cards use shared asset card size.
4. Check preview aspect-ratio, clipping, labels, hover actions.
5. Check nearby tabs to avoid breaking shared card patterns.
6. Run manual visual QA on desktop and smaller panel widths.

## FlashCut reference audit plan
1. Inspect repository structure only for template/editor card layout behavior.
2. Identify whether it uses fixed grid, responsive grid, masonry, or custom placement.
3. Inspect card preview/title/action placement at behavior level.
4. Check license before referencing any code-level detail.
5. Adapt only safe UX patterns; do not copy code or UI wholesale.

## Proposed implementation steps
1. Replace ad-hoc template card wrapping with responsive grid.
2. Use `auto-fit`/`minmax` or equivalent existing styling conventions.
3. Enforce stable preview aspect ratio and `min-width: 0` for labels.
4. Keep card actions wired to existing handlers.
5. Preserve existing template add/apply behavior.
6. Avoid dependency additions.
7. Add/update What's New entry if source changes are applied.

## Testing plan
- Desktop: verify organized grid, readable labels, no clipping.
- Responsive: test narrow panel/mobile widths for no horizontal overflow.
- Interaction: click/apply existing template action.
- Regression: ensure other asset tabs still render.
- Commands: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, relevant tests, `bun run build:web`.

## Rollback plan
- Revert changes in template view/card CSS only.
- Preserve data/model untouched.
- If card layout causes regressions, restore previous wrapping layout and keep feature folder as blocked.
