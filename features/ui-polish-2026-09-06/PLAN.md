# UI polish, 2026-09-06

## Direction and impact

Product register: someone editing for an extended session on a desktop monitor needs readable controls and quiet chrome around their footage. Preserve Artidor's dark grayscale identity, Inter UI, existing display face on public pages, panel topology, timeline colors and all editing commands. Use restrained product surfaces, not a new visual identity.

- Shared CSS/primitives: restore usable scrolling and public text selection, consistent focus/hover, bounded dialogs, reduced motion. Consumers include public pages and editor portals.
- Editor: panel shells, navigation rail, inspector hierarchy, catalog cards, header/preview/timeline controls and feedback dialog. No media, save, rendering or command changes.
- Projects: inspect empty/populated/search states and remove decorative layers that compete with projects; verify responsive search.
- Public routes/mobile gates: header navigation overflows at 768 px and closed mobile links remain focusable. Reuse the existing Sheet primitive for a real accessible mobile menu; simplify hero glow/framing and remove fabricated star-count fallback. Inspect other routes for shared component impact; no legal/auth/collaboration behavior changes.

Named implementation targets: `app/globals.css`, shared `ui/button.tsx`, `ui/dialog.tsx`, `ui/tabs.tsx`, `components/header.tsx`, `landing/hero.tsx`, `app/projects/{page.tsx,projects-background.tsx}`, editor page/header, asset panel rail/media/catalog utility, properties panel/details, timeline toolbar. Expand only when browser evidence identifies an additional UI defect.

Inspection follow-up: include `projects/stats-overview.tsx` for its oversized serif metadata, `landing/page-shell.tsx` for dark token inheritance, and `editor/dialogs/settings-dialog.tsx` for its fixed sidebar leaving no room at narrow widths. Also include `assets/views/base-panel.tsx`: its scrollbar-hidden prevents catalog overflow discovery even after the global fix. These are presentation-only; settings values and handlers stay unchanged. Inspector removes duplicate reset actions and the misleading info action that only reset panel preferences. Project sort removes duplicate keyboard handling (native button already invokes click).
- Tests/docs: isolated Playwright screenshots and assertions against existing port 3005, What's New entry/feed test, QA notes.

Risks: global CSS specificity, scrollbars changing available panel width, portaled dialogs and editor focus restoration. Preserve existing local edits. No dependencies, secrets, network uploads, persistence format changes or generated files. Rollback only the hunks from this phase, not whole files.

## Inspection and validation checklist

- [ ] Before screenshots: editor, projects, public pages, mobile/tablet states
- [ ] Shared tokens, focus, scrollbars and reduced-motion treatment
- [ ] Asset navigation, catalogs and empty states
- [ ] Selected-element inspector and project details
- [ ] Preview, timeline and editor toolbar
- [ ] Export/settings/feedback dialogs
- [ ] Projects grid/list/search/empty states
- [ ] Public routes and mobile gates
- [ ] After screenshots at 375, 768 and 1440; keyboard/overflow assertions
- [ ] Lint and relevant regression tests
- [ ] What's New and QA record

## Validation constraints

Prefer the already-running dev server on 3005 and a disposable browser context. It stopped during route QA. A finite QA runner may launch a temporary local-only Next subprocess only when port 3005 is free; stop only the owned process tree in finally, with an overall timeout. CPU affinity mask 63 for long commands. Production build (240 s) and CodeGraph sync (120 s) timed out in the preceding phase; do not rerun with a longer timeout without direction. Existing generated Next validator/type-test issues are recorded separately from UI regressions.
