# Catalog preview and export performance

## Scope

- Remove the redundant project summary card beside Details.
- Remove the LIVE status badge and freeze/pause control from Signal monitor while keeping automatic scope sampling.
- Make catalog add icons white across shared and custom asset cards.
- Fix catalog previews that can appear blank, invisible, or misleading.
- Audit preview and web export performance, applying only small fixes backed by code or runtime evidence.

## Impact map

- `apps/web/src/app/editor/[project_id]/page.tsx`: right-side meter layout.
- `apps/web/src/components/editor/panels/assets/views/components/scopes.tsx`: Signal monitor chrome and sampling lifecycle.
- `apps/web/src/components/editor/panels/assets/draggable-item.tsx`: shared add affordance.
- `apps/web/src/components/editor/panels/assets/views/{filters,transitions}.tsx`: custom add affordances.
- Catalog preview renderers and services identified during reproduction.
- Export renderer files only if the audit confirms a small, testable bottleneck.
- `apps/web/src/lib/whats-new/feed.ts`: user-visible change note.

## Risks

- Removing the project card must not collapse or hide the independently toggled audio meter.
- Scope sampling must continue automatically after the freeze UI is removed.
- Preview fallbacks must remain representative and must not hide real renderer failures.
- Export changes can affect output correctness and memory use; no speculative pipeline rewrite is allowed.
- No auth, API, Rust, dependency, generated, or user-project data paths are in scope.

## Validation

- Focused Bun regression tests for changed preview/export helpers.
- Web typecheck and Biome lint.
- Browser QA in a disposable Playwright context at 375, 768, and 1440 widths.
- Inspect visible preview pixels, scroll-away/back behavior, missing asset fallback, keyboard add controls, and scopes chrome.
- Record export audit evidence and distinguish measured issues from deferred architecture work.

## Rollback

Revert only the files listed in the final QA report. No storage schema, timeline data, or project migration is involved.
